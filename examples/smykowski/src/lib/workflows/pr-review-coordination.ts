import type { GitHubPullRequest, PRReviewContext, TeamMember } from '~/lib/types/index.js'
import type { GitHubService } from '~/lib/github/index.js'
import type { PullRequestManager } from '~/lib/github/pull-requests.js'

/**
 * PRReviewCoordinationWorkflow manages pull request reviews
 */
export class PRReviewCoordinationWorkflow {
  constructor(
    private github: GitHubService,
    private reviewSLAHours: number = 24
  ) {}

  async execute(prs: GitHubPullRequest[], teamMembers: TeamMember[]): Promise<PRReviewContext[]> {
    const contexts: PRReviewContext[] = []

    for (const pr of prs) {
      if (pr.draft) continue

      const ageHours = this.getPRAge(pr)
      const suggestedReviewers = this.suggestReviewers(pr, teamMembers)

      contexts.push({
        pr,
        age_hours: ageHours,
        suggested_reviewers: suggestedReviewers,
        reminder_count: 0,
      })
    }

    return contexts
  }

  async sendReviewReminders(contexts: PRReviewContext[]): Promise<void> {
    for (const context of contexts) {
      if (context.age_hours > this.reviewSLAHours) {
        await this.sendReminder(context)
      }
    }
  }

  private async sendReminder(context: PRReviewContext): Promise<void> {
    const hoursOverdue = Math.floor(context.age_hours - this.reviewSLAHours)
    let message = `👋 Gentle reminder: This PR has been waiting for review for ${Math.floor(context.age_hours)} hours.\n\n`

    if (context.pr.requested_reviewers.length > 0) {
      message += `Requested reviewers: ${context.pr.requested_reviewers.map(r => `@${r.login}`).join(', ')}\n\n`
    }

    message += `Could someone take a look when you get a chance? Thanks!\n\n— Tom`

    await this.github.pullRequests.addComment(context.pr.number, message)
  }

  private suggestReviewers(pr: GitHubPullRequest, teamMembers: TeamMember[]): Array<{
    github_username: string
    email?: string
    confidence: number
    reason: string
  }> {
    const suggestions: Array<{
      github_username: string
      email?: string
      confidence: number
      reason: string
    }> = []

    // Get PR files to determine expertise needed
    // (In production, would call github.pullRequests.getFiles)

    // Simple heuristic: suggest team members with relevant expertise and low review load
    for (const member of teamMembers) {
      if (member.github_username === pr.user.login) continue
      if (member.vacation_schedule?.is_on_vacation) continue

      const reviewLoad = member.review_stats.total_reviews
      const confidence = reviewLoad < 3 ? 0.8 : 0.5

      suggestions.push({
        github_username: member.github_username,
        email: member.email,
        confidence,
        reason: reviewLoad < 3 ? 'Low review load' : 'Available',
      })
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 2)
  }

  private getPRAge(pr: GitHubPullRequest): number {
    const now = new Date()
    const created = new Date(pr.created_at)
    return (now.getTime() - created.getTime()) / (1000 * 60 * 60)
  }
}
