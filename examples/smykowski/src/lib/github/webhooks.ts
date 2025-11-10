import crypto from 'crypto'
import type {
  GitHubWebhookEvent,
  IssueWebhook,
  PullRequestWebhook,
  DiscussionWebhook,
} from '~/lib/types/index.js'

/**
 * WebhookManager handles GitHub webhook signature verification and payload parsing
 */
export class WebhookManager {
  constructor(private secret: string) {}

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!signature) {
      return false
    }

    // GitHub sends signature as "sha256=<hash>"
    const signatureParts = signature.split('=')
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
      return false
    }

    const expectedSignature = signatureParts[1]
    const computedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(computedSignature)
    )
  }

  /**
   * Parse and validate webhook payload
   */
  parsePayload<T = GitHubWebhookEvent>(payload: string | object): T {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload
      return data as T
    } catch (error: any) {
      throw new Error(`Failed to parse webhook payload: ${error.message}`)
    }
  }

  /**
   * Get webhook event type from headers
   */
  getEventType(headers: Record<string, string | undefined>): string | null {
    return headers['x-github-event'] || headers['X-GitHub-Event'] || null
  }

  /**
   * Parse issue webhook
   */
  parseIssueWebhook(payload: string | object): IssueWebhook {
    return this.parsePayload<IssueWebhook>(payload)
  }

  /**
   * Parse pull request webhook
   */
  parsePullRequestWebhook(payload: string | object): PullRequestWebhook {
    return this.parsePayload<PullRequestWebhook>(payload)
  }

  /**
   * Parse discussion webhook
   */
  parseDiscussionWebhook(payload: string | object): DiscussionWebhook {
    return this.parsePayload<DiscussionWebhook>(payload)
  }

  /**
   * Validate webhook headers
   */
  validateHeaders(headers: Record<string, string | undefined>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!headers['x-github-event'] && !headers['X-GitHub-Event']) {
      errors.push('Missing X-GitHub-Event header')
    }

    if (!headers['x-github-delivery'] && !headers['X-GitHub-Delivery']) {
      errors.push('Missing X-GitHub-Delivery header')
    }

    if (!headers['x-hub-signature-256'] && !headers['X-Hub-Signature-256']) {
      errors.push('Missing X-Hub-Signature-256 header')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Extract relevant information from issue webhook
   */
  extractIssueInfo(webhook: IssueWebhook) {
    return {
      action: webhook.action,
      issueNumber: webhook.issue.number,
      issueTitle: webhook.issue.title,
      issueState: webhook.issue.state,
      author: webhook.issue.user.login,
      assignees: webhook.issue.assignees.map(a => a.login),
      labels: webhook.issue.labels.map(l => l.name),
      sender: webhook.sender.login,
    }
  }

  /**
   * Extract relevant information from PR webhook
   */
  extractPRInfo(webhook: PullRequestWebhook) {
    return {
      action: webhook.action,
      prNumber: webhook.pull_request.number,
      prTitle: webhook.pull_request.title,
      prState: webhook.pull_request.state,
      author: webhook.pull_request.user.login,
      assignees: webhook.pull_request.assignees.map(a => a.login),
      requestedReviewers: webhook.pull_request.requested_reviewers.map(r => r.login),
      draft: webhook.pull_request.draft,
      sender: webhook.sender.login,
    }
  }

  /**
   * Check if webhook is for an issue (not a PR)
   */
  isIssue(eventType: string, payload: any): boolean {
    return eventType === 'issues' || (eventType === 'issue' && !payload.pull_request)
  }

  /**
   * Check if webhook is for a pull request
   */
  isPullRequest(eventType: string): boolean {
    return eventType === 'pull_request' || eventType === 'pull_request_review'
  }

  /**
   * Check if webhook is for a discussion
   */
  isDiscussion(eventType: string): boolean {
    return eventType === 'discussion' || eventType === 'discussion_comment'
  }
}
