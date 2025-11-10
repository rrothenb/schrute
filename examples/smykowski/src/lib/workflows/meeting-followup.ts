import type { Email } from '@schrute/lib/types/index.js'
import type {
  ActionItem,
  MeetingFollowupContext,
  GitHubIssue,
} from '~/lib/types/index.js'
import type { GitHubService } from '~/lib/github/index.js'
import type { ActionItemExtractor } from '~/lib/extractors/index.js'
import type { SchruteBridge } from '~/lib/integrations/index.js'

/**
 * MeetingFollowupWorkflow automates the process of converting meeting notes
 * into actionable GitHub issues
 *
 * Workflow:
 * 1. Receive meeting notes via email
 * 2. Extract action items and decisions
 * 3. Create GitHub issues for each action
 * 4. Assign to appropriate team members
 * 5. Set deadlines
 * 6. Create Discussion post with summary
 * 7. Send confirmation email
 * 8. Schedule follow-up reminders
 */
export class MeetingFollowupWorkflow {
  constructor(
    private github: GitHubService,
    private extractor: ActionItemExtractor,
    private schrute: SchruteBridge
  ) {}

  /**
   * Execute the meeting followup workflow
   */
  async execute(email: Email): Promise<{
    actionItems: ActionItem[]
    createdIssues: GitHubIssue[]
    discussionNumber: number | null
    confirmationSent: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    try {
      // 1. Extract action items from email
      const actionItems = await this.extractor.extract(email)

      if (actionItems.length === 0) {
        return {
          actionItems: [],
          createdIssues: [],
          discussionNumber: null,
          confirmationSent: false,
          errors: ['No action items found in meeting notes'],
        }
      }

      // 2. Detect decisions from speech acts
      const speechActs = await this.schrute.detectSpeechActs(email)
      const decisions = speechActs
        .filter(act => act.type === 'DECISION')
        .map(act => act.content)

      // 3. Create GitHub issues for each action item
      const createdIssues: GitHubIssue[] = []

      for (const item of actionItems) {
        try {
          const issue = await this.createIssueFromActionItem(item, email)
          createdIssues.push(issue)

          // Update action item with issue number
          item.github_issue_number = issue.number
          item.status = 'created'
        } catch (error: any) {
          errors.push(`Failed to create issue for "${item.description}": ${error.message}`)
        }
      }

      // 4. Create Discussion post with meeting summary
      let discussionNumber: number | null = null
      try {
        discussionNumber = await this.createDiscussionPost(
          email,
          actionItems,
          createdIssues,
          decisions
        )
      } catch (error: any) {
        errors.push(`Failed to create discussion: ${error.message}`)
      }

      // 5. Send confirmation email
      let confirmationSent = false
      try {
        await this.sendConfirmationEmail(email, createdIssues, discussionNumber)
        confirmationSent = true
      } catch (error: any) {
        errors.push(`Failed to send confirmation: ${error.message}`)
      }

      return {
        actionItems,
        createdIssues,
        discussionNumber,
        confirmationSent,
        errors,
      }
    } catch (error: any) {
      throw new Error(`Meeting followup workflow failed: ${error.message}`)
    }
  }

  /**
   * Create a GitHub issue from an action item
   */
  private async createIssueFromActionItem(
    item: ActionItem,
    sourceEmail: Email
  ): Promise<GitHubIssue> {
    // Build issue body with context
    let body = `Action item from meeting notes (${new Date(sourceEmail.timestamp).toLocaleDateString()}):\n\n`
    body += `${item.description}\n\n`

    if (item.deadline) {
      body += `**Deadline:** ${new Date(item.deadline).toLocaleDateString()}\n\n`
    }

    body += `**Source:** ${sourceEmail.subject}\n`
    body += `**Message ID:** ${sourceEmail.message_id}\n\n`
    body += `---\n\n`
    body += `_This issue was automatically created by Tom from meeting notes._`

    // Determine labels
    const labels = ['meeting-action']
    if (item.deadline) {
      const daysUntil = this.getDaysUntilDeadline(item.deadline)
      if (daysUntil <= 2) {
        labels.push('urgent')
      }
    }

    // Create issue
    const issue = await this.github.issues.create({
      title: item.description,
      body,
      assignees: item.assignee_github ? [item.assignee_github] : undefined,
      labels,
    })

    return issue
  }

  /**
   * Create a Discussion post summarizing the meeting
   */
  private async createDiscussionPost(
    email: Email,
    actionItems: ActionItem[],
    createdIssues: GitHubIssue[],
    decisions: string[]
  ): Promise<number> {
    // Find or use default "Meeting Notes" category
    const categoryId = await this.github.discussions.getCategoryId('Meeting Notes')

    if (!categoryId) {
      throw new Error('Meeting Notes discussion category not found')
    }

    // Build discussion body
    const meetingDate = new Date(email.timestamp).toLocaleDateString()
    let body = `# ${email.subject}\n\n`
    body += `**Date:** ${meetingDate}\n`
    body += `**Attendees:** ${email.to.map(t => t.name).join(', ')}\n\n`

    body += `## Action Items\n\n`
    if (createdIssues.length > 0) {
      for (const issue of createdIssues) {
        const item = actionItems.find(ai => ai.github_issue_number === issue.number)
        body += `- #${issue.number}: ${issue.title}`
        if (issue.assignees.length > 0) {
          body += ` (assigned to @${issue.assignees[0].login})`
        }
        if (item?.deadline) {
          body += ` - Due ${new Date(item.deadline).toLocaleDateString()}`
        }
        body += `\n`
      }
    } else {
      body += `No action items created.\n`
    }

    body += `\n## Decisions\n\n`
    if (decisions.length > 0) {
      for (const decision of decisions) {
        body += `- ${decision}\n`
      }
    } else {
      body += `No major decisions recorded.\n`
    }

    body += `\n---\n\n`
    body += `_Meeting notes processed by Tom_`

    const discussion = await this.github.discussions.create({
      title: `${email.subject} - ${meetingDate}`,
      body,
      categoryId,
    })

    return discussion.number
  }

  /**
   * Send confirmation email to meeting attendees
   */
  private async sendConfirmationEmail(
    originalEmail: Email,
    createdIssues: GitHubIssue[],
    discussionNumber: number | null
  ): Promise<void> {
    // Generate confirmation message
    let message = `Hi team,\n\n`
    message += `I've processed the meeting notes from "${originalEmail.subject}".\n\n`

    if (createdIssues.length > 0) {
      message += `## Created Issues\n\n`
      for (const issue of createdIssues) {
        message += `- [#${issue.number}: ${issue.title}](${issue.html_url})`
        if (issue.assignees.length > 0) {
          message += ` - @${issue.assignees[0].login}`
        }
        message += `\n`
      }
      message += `\n`
    }

    if (discussionNumber) {
      const repoInfo = this.github.getRepository()
      message += `I've also created a [Discussion post](https://github.com/${repoInfo.fullName}/discussions/${discussionNumber}) with the meeting summary.\n\n`
    }

    message += `I'll check in on these items as their deadlines approach.\n\n`
    message += `Let me know if you need any changes!\n\n`
    message += `Tom`

    // Use Schrute bridge to send email
    // (In production, this would integrate with SES)
    console.log('Confirmation email:', message)
  }

  /**
   * Calculate days until deadline
   */
  private getDaysUntilDeadline(deadline: string): number {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diff = deadlineDate.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }
}
