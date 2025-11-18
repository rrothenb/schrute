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

      case 'classify_and_label':
        return await this.executeClassifyAndLabel(action, process, context)

      case 'answer_question':
        return await this.executeAnswerQuestion(action, process, context)

      case 'generate_wiki_from_discussion':
        return await this.executeGenerateWikiFromDiscussion(action, process, context)

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
   * Classify an issue and add appropriate labels
   */
  private async executeClassifyAndLabel(
    action: ProcessAction,
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<string> {
    if (!context.issue) {
      throw new WorkflowError('Cannot classify: no issue in context')
    }

    // Dynamic import to avoid circular dependencies
    const { IssueClassifier } = await import('~/lib/extractors/index.js')
    const classifier = new IssueClassifier(this.claudeClient)

    const classification = await classifier.classify(context.issue)

    // Get confidence threshold from action parameters or use default
    const confidenceThreshold = (action.parameters?.confidence_threshold as number) || 0.8

    if (!classifier.isHighConfidence(classification, confidenceThreshold)) {
      return `Classification confidence too low (${classification.confidence}), skipping auto-label`
    }

    // Add the primary category label
    const labelsToAdd = [classification.primary_category, ...classification.suggested_labels]

    // Get existing labels
    const existingLabels = context.issue.labels.map(l => l.name)

    // Only add labels that don't already exist
    const newLabels = labelsToAdd.filter(l => !existingLabels.includes(l))

    if (newLabels.length === 0) {
      return 'All suggested labels already present'
    }

    await this.github.issues.addLabels(context.issue.number, newLabels)

    return `Added labels: ${newLabels.join(', ')} (confidence: ${classification.confidence})`
  }

  /**
   * Detect if issue is a question and post an answer
   */
  private async executeAnswerQuestion(
    action: ProcessAction,
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<string> {
    if (!context.issue) {
      throw new WorkflowError('Cannot answer question: no issue in context')
    }

    // Dynamic import
    const { QuestionAnswerer } = await import('~/lib/extractors/index.js')
    const answerer = new QuestionAnswerer(this.claudeClient)

    // First, check if this is a question
    const analysis = await answerer.analyzeQuestion(context.issue)

    if (!analysis.is_question || analysis.confidence < 0.7) {
      return 'Issue does not appear to be a question (or low confidence)'
    }

    // Gather documentation from wiki and README
    const availableDocs: Array<{ source: string; content: string }> = []

    try {
      // Try to get README
      const readme = await this.github.wiki.getPage('Home')
      if (readme) {
        availableDocs.push({ source: 'README/Home', content: readme.content })
      }
    } catch {
      // README not available
    }

    // Get other wiki pages that might be relevant (limit to 3 for token budget)
    try {
      const wikiPages = await this.github.wiki.listPages()
      for (const page of wikiPages.slice(0, 3)) {
        const content = await this.github.wiki.getPage(page.title)
        if (content) {
          availableDocs.push({ source: `Wiki: ${page.title}`, content: content.content })
        }
      }
    } catch {
      // Wiki not available
    }

    // Generate answer
    const answer = await answerer.generateAnswer(
      context.issue,
      analysis.extracted_question,
      availableDocs
    )

    // Check if we should auto-post
    const autoPostThreshold = (action.parameters?.confidence_threshold as number) || 0.7

    if (!answerer.shouldAutoPost(answer, autoPostThreshold)) {
      return `Answer generated but confidence too low (${answer.confidence}), needs human review`
    }

    // Post the answer as a comment
    await this.github.issues.createComment({
      issue_number: context.issue.number,
      body: answer.answer,
    })

    return `Posted answer to question (confidence: ${answer.confidence})`
  }

  /**
   * Generate a wiki page from a discussion
   */
  private async executeGenerateWikiFromDiscussion(
    action: ProcessAction,
    process: ProcessDefinition,
    context: ProcessExecutionContext
  ): Promise<string> {
    if (!context.event.discussion) {
      throw new WorkflowError('Cannot generate wiki: no discussion in context')
    }

    // Dynamic import
    const { DiscussionSummarizer } = await import('~/lib/extractors/index.js')
    const summarizer = new DiscussionSummarizer(this.claudeClient)

    const discussion = context.event.discussion

    // Check if discussion has enough content
    const minComments = (action.parameters?.min_comments as number) || 3
    if (!summarizer.shouldCreateWikiPage(discussion, minComments)) {
      return `Discussion has too few comments (${discussion.comments?.length || 0}), skipping wiki generation`
    }

    // Generate summary
    const summary = await summarizer.summarize({
      title: discussion.title,
      body: discussion.body,
      comments: discussion.comments || [],
    })

    // Create wiki page
    const wikiTitle = summary.wiki_page_suggestion.title
    const wikiContent = summary.wiki_page_suggestion.content

    await this.github.wiki.createOrUpdatePage({
      title: wikiTitle,
      content: wikiContent,
      message: `Generated from Discussion #${discussion.number}`,
    })

    // Optionally, add a comment to the discussion linking to the wiki
    if (action.parameters?.link_back !== false) {
      const repo = this.github.getRepository()
      const wikiUrl = `https://github.com/${repo.fullName}/wiki/${wikiTitle.replace(/\s+/g, '-')}`

      const discussionComment = `📝 I've created a wiki page to document this discussion: [${wikiTitle}](${wikiUrl})`

      // Add comment to discussion with link to wiki page
      await this.github.discussions.addComment(discussion.id, discussionComment)

      return `Created wiki page: ${wikiTitle} and posted link to discussion`
    }

    return `Created wiki page: ${wikiTitle}`
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
      ['comment', 'label', 'assign', 'classify_and_label', 'answer_question'].includes(a.type)
    )

    if (requiresIssue && !context.issue) {
      errors.push('Actions require an issue but none provided in context')
    }

    const requiresDiscussion = process.actions.some(a =>
      a.type === 'generate_wiki_from_discussion'
    )

    if (requiresDiscussion && !context.event.discussion) {
      errors.push('Actions require a discussion but none provided in context')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
