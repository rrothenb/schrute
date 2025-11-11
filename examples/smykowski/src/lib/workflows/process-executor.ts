import type { ClaudeClient } from '@schrute/lib/claude/client.js'
import type { GitHubService } from '~/lib/github/index.js'
import type { IssueMetricsStorage } from '~/lib/storage/index.js'
import type {
  ProcessDefinition,
  ProcessAction,
  ProcessExecutionResult,
  ProcessExecutionContext,
  IssueResponseStats,
} from '~/lib/types/index.js'
import { WorkflowError } from '~/lib/types/index.js'

/**
 * ProcessExecutor executes wiki-defined automation processes
 *
 * This workflow takes natural language process definitions from wiki pages
 * and executes them in response to GitHub events.
 */
export class ProcessExecutor {
  constructor(
    private claudeClient: ClaudeClient,
    private github: GitHubService,
    private metricsStore: IssueMetricsStorage
  ) {}

  /**
   * Execute a process in response to a webhook event
   */
  async execute(
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<ProcessExecutionResult> {
    const executionTime = new Date().toISOString()
    const actionResults: ProcessExecutionResult['actions'] = []

    try {
      // Execute each action in sequence
      for (const action of process.actions) {
        try {
          const result = await this.executeAction(action, process, context)
          actionResults.push({
            action_type: action.type,
            description: action.description,
            success: true,
            result,
          })
        } catch (error: any) {
          actionResults.push({
            action_type: action.type,
            description: action.description,
            success: false,
            error: error.message,
          })
          console.error(`Action ${action.type} failed:`, error)
        }
      }

      const allSucceeded = actionResults.every(r => r.success)

      return {
        process_id: process.process_id,
        execution_time: executionTime,
        success: allSucceeded,
        actions: actionResults,
      }
    } catch (error: any) {
      return {
        process_id: process.process_id,
        execution_time: executionTime,
        success: false,
        actions: actionResults,
        error: error.message,
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: ProcessAction,
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<string> {
    switch (action.type) {
      case 'calculate_metrics':
        return await this.executeCalculateMetrics(action, process, context)

      case 'comment':
        return await this.executeComment(action, process, context)

      case 'label':
        return await this.executeLabel(action, process, context)

      case 'assign':
        return await this.executeAssign(action, process, context)

      case 'create_issue':
        return await this.executeCreateIssue(action, process, context)

      case 'update_wiki':
        return await this.executeUpdateWiki(action, process, context)

      default:
        throw new WorkflowError(`Unknown action type: ${(action as any).type}`)
    }
  }

  /**
   * Calculate metrics (used by other actions)
   */
  private async executeCalculateMetrics(
    action: ProcessAction,
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<string> {
    const lookbackDays = process.configuration?.lookback_period || 30

    const stats = await this.metricsStore.calculateResponseStats(
      context.repo,
      lookbackDays
    )

    return JSON.stringify(stats)
  }

  /**
   * Add a comment to an issue or PR
   */
  private async executeComment(
    action: ProcessAction,
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<string> {
    if (!context.issue) {
      throw new WorkflowError('Cannot add comment: no issue in context')
    }

    // Gather metrics if needed
    const metrics = await this.gatherMetrics(process, context)

    // Use Claude to generate the comment based on the action description
    const commentBody = await this.generateComment(
      action.description,
      process,
      context,
      metrics
    )

    // Post the comment
    await this.github.issues.createComment({
      issue_number: context.issue.number,
      body: commentBody,
    })

    return `Comment added to issue #${context.issue.number}`
  }

  /**
   * Add labels to an issue or PR
   */
  private async executeLabel(
    action: ProcessAction,
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<string> {
    if (!context.issue) {
      throw new WorkflowError('Cannot add label: no issue in context')
    }

    // Extract labels from action parameters
    const labels = action.parameters?.labels as string[] || []

    if (labels.length === 0) {
      throw new WorkflowError('No labels specified in action parameters')
    }

    await this.github.issues.update({
      issue_number: context.issue.number,
      labels: [...context.issue.labels.map(l => l.name), ...labels],
    })

    return `Added labels: ${labels.join(', ')}`
  }

  /**
   * Assign an issue or PR
   */
  private async executeAssign(
    action: ProcessAction,
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<string> {
    if (!context.issue) {
      throw new WorkflowError('Cannot assign: no issue in context')
    }

    const assignees = action.parameters?.assignees as string[] || []

    if (assignees.length === 0) {
      throw new WorkflowError('No assignees specified in action parameters')
    }

    await this.github.issues.update({
      issue_number: context.issue.number,
      assignees,
    })

    return `Assigned to: ${assignees.join(', ')}`
  }

  /**
   * Create a new issue
   */
  private async executeCreateIssue(
    action: ProcessAction,
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<string> {
    const title = action.parameters?.title as string
    const body = action.parameters?.body as string

    if (!title) {
      throw new WorkflowError('Issue title is required')
    }

    const issue = await this.github.issues.create({
      title,
      body: body || '',
      labels: action.parameters?.labels as string[] || [],
      assignees: action.parameters?.assignees as string[] || [],
    })

    return `Created issue #${issue.number}: ${title}`
  }

  /**
   * Update a wiki page
   */
  private async executeUpdateWiki(
    action: ProcessAction,
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<string> {
    const pageName = action.parameters?.page_name as string
    const content = action.parameters?.content as string

    if (!pageName || !content) {
      throw new WorkflowError('Wiki page name and content are required')
    }

    await this.github.wiki.createOrUpdatePage({
      title: pageName,
      content,
      message: `Updated by process: ${process.process_id}`,
    })

    return `Updated wiki page: ${pageName}`
  }

  /**
   * Gather metrics for the current context
   */
  private async gatherMetrics(
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<IssueResponseStats> {
    const lookbackDays = process.configuration?.lookback_period || 30

    return await this.metricsStore.calculateResponseStats(
      context.repo,
      lookbackDays
    )
  }

  /**
   * Generate a comment using Claude based on the action description
   */
  private async generateComment(
    actionDescription: string,
    process: ProcessDefinition,
    context: ProcessExecutionContext,
    metrics: IssueResponseStats
  ): Promise<string> {
    const prompt = `You are Tom Smykowski, a friendly project coordinator. Generate a GitHub comment based on this action description:

Action: ${actionDescription}

Context:
- Issue: #${context.issue?.number}
- Repository: ${context.repo}
- Process: ${process.process_id}
- Triggered by: ${context.event.action}

Available metrics (last ${process.configuration?.lookback_period || 30} days):
- Average response time: ${Math.round(metrics.average_minutes / 60 * 10) / 10} hours
- Median response time: ${Math.round(metrics.median_minutes / 60 * 10) / 10} hours
- 90th percentile: ${Math.round(metrics.p90_minutes / 60 * 10) / 10} hours
- Sample size: ${metrics.sample_size} issues

Process configuration:
${JSON.stringify(process.configuration || {}, null, 2)}

Generate a friendly, helpful comment that Tom would write. Keep it concise but informative.
Include relevant statistics if they're meaningful. Use natural language, not technical jargon.

Comment:`

    const response = await this.claudeClient.prompt(prompt, {
      systemPrompt: `You are Tom Smykowski from Office Space - friendly, helpful, and good with people.
Your job is to handle coordination tasks so engineers can focus on engineering.
Write in a casual but professional tone. Be genuinely helpful without being overly formal.`,
      maxTokens: 500,
    })

    return response.trim()
  }

  /**
   * Validate that a process can be executed in the given context
   */
  validateContext(
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check if the event matches the trigger
    if (context.event.action !== process.trigger.event) {
      errors.push(`Event mismatch: expected ${process.trigger.event}, got ${context.event.action}`)
    }

    // Check if required context is available for actions
    const requiresIssue = process.actions.some(a =>
      ['comment', 'label', 'assign'].includes(a.type)
    )

    if (requiresIssue && !context.issue) {
      errors.push('Actions require an issue but none provided in context')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
