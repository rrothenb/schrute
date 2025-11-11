import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { ClaudeClient } from '@schrute/lib/claude/client.js'
import { GitHubService } from '~/lib/github/index.js'
import { IssueMetricsStorage, ProcessStorage } from '~/lib/storage/index.js'
import { ProcessExecutor } from '~/lib/workflows/index.js'
import type { ProcessExecutionContext, GitHubIssue } from '~/lib/types/index.js'
import { getSecret } from '../utils/secrets.js'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const githubToken = await getSecret(process.env.GITHUB_TOKEN_SECRET!)
  const webhookSecret = await getSecret(process.env.GITHUB_WEBHOOK_SECRET!)
  const claudeApiKey = await getSecret(process.env.CLAUDE_API_KEY_SECRET!)

  const github = new GitHubService(
    githubToken,
    process.env.GITHUB_REPOSITORY!,
    webhookSecret
  )

  // Verify webhook signature
  const signature = event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256']
  if (!signature || !github.webhooks.verifySignature(event.body!, signature)) {
    return { statusCode: 401, body: 'Invalid signature' }
  }

  // Get event type
  const eventType = github.webhooks.getEventType(event.headers)
  if (!eventType) {
    return { statusCode: 400, body: 'Missing event type' }
  }

  // Parse webhook payload
  const payload = JSON.parse(event.body || '{}')
  console.log(`Received ${eventType} webhook for ${payload.action}`)

  // Initialize storage and services
  const metricsStore = new IssueMetricsStorage(process.env.ISSUE_METRICS_TABLE!)
  const processStore = new ProcessStorage(process.env.PROCESSES_TABLE!)
  const claudeClient = new ClaudeClient(claudeApiKey)
  const processExecutor = new ProcessExecutor(claudeClient, github, metricsStore)

  try {
    // Track issue metrics
    await trackIssueMetrics(payload, eventType, metricsStore)

    // Execute applicable processes
    await executeProcesses(payload, eventType, processStore, processExecutor, github)

    return { statusCode: 200, body: 'OK' }
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}

/**
 * Track issue lifecycle metrics
 */
async function trackIssueMetrics(
  payload: any,
  eventType: string,
  metricsStore: IssueMetricsStorage
): Promise<void> {
  const repo = payload.repository?.full_name

  if (!repo) {
    return
  }

  try {
    // Track issue created
    if (eventType === 'issues' && payload.action === 'opened') {
      await metricsStore.recordIssueCreated({
        repo_id: repo,
        issue_number: payload.issue.number,
        created_by: payload.issue.user.login,
        labels: payload.issue.labels?.map((l: any) => l.name) || [],
      })
      console.log(`Tracked issue creation: ${repo}#${payload.issue.number}`)
    }

    // Track first comment on issue
    if (eventType === 'issue_comment' && payload.action === 'created') {
      // Get the existing metric to check if this is the first comment
      const issueId = `${repo}#${payload.issue.number}`
      const existing = await metricsStore.get(issueId)

      if (existing && !existing.first_comment_at) {
        await metricsStore.recordFirstComment({
          repo_id: repo,
          issue_number: payload.issue.number,
          commented_at: payload.comment.created_at,
          commented_by: payload.comment.user.login,
        })
        console.log(`Tracked first comment: ${repo}#${payload.issue.number}`)
      }
    }

    // Track issue closed
    if (eventType === 'issues' && payload.action === 'closed') {
      await metricsStore.recordIssueClosed({
        repo_id: repo,
        issue_number: payload.issue.number,
        closed_at: payload.issue.closed_at,
      })
      console.log(`Tracked issue closure: ${repo}#${payload.issue.number}`)
    }
  } catch (error: any) {
    console.error('Error tracking issue metrics:', error)
    // Don't fail the webhook if metrics tracking fails
  }
}

/**
 * Execute applicable automation processes
 */
async function executeProcesses(
  payload: any,
  eventType: string,
  processStore: ProcessStorage,
  processExecutor: ProcessExecutor,
  github: GitHubService
): Promise<void> {
  const repo = payload.repository?.full_name

  if (!repo) {
    return
  }

  try {
    // Construct the full event name (e.g., "issues.opened")
    const fullEvent = `${eventType}.${payload.action}`

    // Get processes that match this event
    const processes = await processStore.getByEvent(repo, fullEvent)

    console.log(`Found ${processes.length} processes for event ${fullEvent}`)

    // Execute each applicable process
    for (const process of processes) {
      try {
        // Build execution context
        const context: ProcessExecutionContext = {
          event: payload,
          issue: payload.issue ? convertToGitHubIssue(payload.issue) : undefined,
          pull_request: payload.pull_request,
          repo,
          triggered_at: new Date().toISOString(),
        }

        // Validate context
        const validation = processExecutor.validateContext(process, context)
        if (!validation.valid) {
          console.warn(`Process ${process.process_id} validation failed:`, validation.errors)
          continue
        }

        // Execute the process
        console.log(`Executing process: ${process.process_id}`)
        const result = await processExecutor.execute(process, context)

        // Record execution statistics
        await processStore.recordExecution(
          process.process_id,
          result.success,
          result.error
        )

        console.log(`Process ${process.process_id} completed:`, result)
      } catch (error: any) {
        console.error(`Process ${process.process_id} failed:`, error)
        await processStore.recordExecution(
          process.process_id,
          false,
          error.message
        )
      }
    }
  } catch (error: any) {
    console.error('Error executing processes:', error)
    // Don't fail the webhook if process execution fails
  }
}

/**
 * Convert webhook issue payload to GitHubIssue type
 */
function convertToGitHubIssue(webhookIssue: any): GitHubIssue {
  return {
    number: webhookIssue.number,
    title: webhookIssue.title,
    body: webhookIssue.body || '',
    state: webhookIssue.state,
    created_at: webhookIssue.created_at,
    updated_at: webhookIssue.updated_at,
    closed_at: webhookIssue.closed_at,
    user: {
      login: webhookIssue.user.login,
      id: webhookIssue.user.id,
      type: webhookIssue.user.type,
    },
    assignees: webhookIssue.assignees?.map((a: any) => ({
      login: a.login,
      id: a.id,
      type: a.type,
    })) || [],
    labels: webhookIssue.labels?.map((l: any) => ({
      name: l.name,
      color: l.color,
      description: l.description,
    })) || [],
    html_url: webhookIssue.html_url,
    comments: webhookIssue.comments || 0,
  }
}
