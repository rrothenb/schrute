import type { GitHubClient } from './client.js'
import type {
  GitHubPullRequest,
  PullRequestQueryFilter,
  PullRequestReviewRequest,
  GitHubUser,
} from '~/lib/types/index.js'

/**
 * PullRequestManager handles all GitHub Pull Request operations
 */
export class PullRequestManager {
  constructor(private client: GitHubClient) {}

  /**
   * Get a single pull request by number
   */
  async get(prNumber: number): Promise<GitHubPullRequest> {
    try {
      const response = await this.client.getOctokit().rest.pulls.get({
        owner: this.client.getOwner(),
        repo: this.client.getRepo(),
        pull_number: prNumber,
      })

      return this.transformPR(response.data)
    } catch (error: any) {
      throw new Error(`Failed to get PR #${prNumber}: ${error.message}`)
    }
  }

  /**
   * List pull requests with filters
   */
  async list(filter: PullRequestQueryFilter = {}): Promise<GitHubPullRequest[]> {
    try {
      const response = await this.client.getOctokit().rest.pulls.list({
        owner: this.client.getOwner(),
        repo: this.client.getRepo(),
        state: filter.state || 'open',
        sort: filter.sort || 'created',
        direction: filter.direction || 'desc',
        per_page: 100,
      })

      return response.data.map(pr => this.transformPR(pr))
    } catch (error: any) {
      throw new Error(`Failed to list pull requests: ${error.message}`)
    }
  }

  /**
   * Get all open pull requests
   */
  async getOpen(): Promise<GitHubPullRequest[]> {
    return this.list({ state: 'open' })
  }

  /**
   * Get pull requests that need review
   */
  async getNeedingReview(): Promise<GitHubPullRequest[]> {
    const openPRs = await this.getOpen()
    return openPRs.filter(pr => !pr.draft && pr.requested_reviewers.length > 0)
  }

  /**
   * Get stale pull requests (older than threshold)
   */
  async getStale(thresholdHours: number): Promise<GitHubPullRequest[]> {
    const openPRs = await this.getOpen()
    const now = new Date()
    const thresholdMs = thresholdHours * 60 * 60 * 1000

    return openPRs.filter(pr => {
      const createdAt = new Date(pr.created_at)
      const age = now.getTime() - createdAt.getTime()
      return age > thresholdMs && !pr.draft
    })
  }

  /**
   * Request reviews from specific users
   */
  async requestReviews(prNumber: number, params: PullRequestReviewRequest): Promise<void> {
    try {
      await this.client.getOctokit().rest.pulls.requestReviewers({
        owner: this.client.getOwner(),
        repo: this.client.getRepo(),
        pull_number: prNumber,
        reviewers: params.reviewers,
        team_reviewers: params.team_reviewers,
      })
    } catch (error: any) {
      throw new Error(`Failed to request reviews for PR #${prNumber}: ${error.message}`)
    }
  }

  /**
   * Add a comment to a pull request
   */
  async addComment(prNumber: number, body: string): Promise<void> {
    try {
      await this.client.getOctokit().rest.issues.createComment({
        owner: this.client.getOwner(),
        repo: this.client.getRepo(),
        issue_number: prNumber,
        body,
      })
    } catch (error: any) {
      throw new Error(`Failed to add comment to PR #${prNumber}: ${error.message}`)
    }
  }

  /**
   * Get review status for a pull request
   */
  async getReviewStatus(prNumber: number): Promise<{
    approved: boolean
    changesRequested: boolean
    reviewers: Array<{
      user: GitHubUser
      state: string
      submitted_at: string
    }>
  }> {
    try {
      const response = await this.client.getOctokit().rest.pulls.listReviews({
        owner: this.client.getOwner(),
        repo: this.client.getRepo(),
        pull_number: prNumber,
      })

      const reviews = response.data
      const latestReviews = new Map<string, any>()

      // Get latest review from each reviewer
      reviews.forEach(review => {
        const login = review.user?.login
        if (login) {
          const existing = latestReviews.get(login)
          if (!existing || new Date(review.submitted_at!) > new Date(existing.submitted_at)) {
            latestReviews.set(login, review)
          }
        }
      })

      const reviewers = Array.from(latestReviews.values()).map(review => ({
        user: {
          login: review.user!.login,
          id: review.user!.id,
          email: review.user!.email,
          name: review.user!.name,
        },
        state: review.state,
        submitted_at: review.submitted_at!,
      }))

      const approved = reviewers.some(r => r.state === 'APPROVED')
      const changesRequested = reviewers.some(r => r.state === 'CHANGES_REQUESTED')

      return { approved, changesRequested, reviewers }
    } catch (error: any) {
      throw new Error(`Failed to get review status for PR #${prNumber}: ${error.message}`)
    }
  }

  /**
   * Get files changed in a pull request
   */
  async getFiles(prNumber: number): Promise<Array<{ filename: string; additions: number; deletions: number }>> {
    try {
      const response = await this.client.getOctokit().rest.pulls.listFiles({
        owner: this.client.getOwner(),
        repo: this.client.getRepo(),
        pull_number: prNumber,
        per_page: 100,
      })

      return response.data.map(file => ({
        filename: file.filename,
        additions: file.additions,
        deletions: file.deletions,
      }))
    } catch (error: any) {
      throw new Error(`Failed to get files for PR #${prNumber}: ${error.message}`)
    }
  }

  /**
   * Get PR age in hours
   */
  getPRAge(pr: GitHubPullRequest): number {
    const now = new Date()
    const created = new Date(pr.created_at)
    return (now.getTime() - created.getTime()) / (1000 * 60 * 60)
  }

  /**
   * Check if PR references an issue
   */
  getReferencedIssues(pr: GitHubPullRequest): number[] {
    const body = pr.body || ''
    const issuePattern = /#(\d+)/g
    const matches = [...body.matchAll(issuePattern)]
    return matches.map(match => parseInt(match[1]))
  }

  /**
   * Transform API response to our GitHubPullRequest type
   */
  private transformPR(data: any): GitHubPullRequest {
    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body || undefined,
      state: data.state as 'open' | 'closed',
      user: {
        login: data.user.login,
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
      },
      assignees: (data.assignees || []).map((assignee: any) => ({
        login: assignee.login,
        id: assignee.id,
        email: assignee.email,
        name: assignee.name,
      })),
      requested_reviewers: (data.requested_reviewers || []).map((reviewer: any) => ({
        login: reviewer.login,
        id: reviewer.id,
        email: reviewer.email,
        name: reviewer.name,
      })),
      labels: (data.labels || []).map((label: any) => ({
        id: label.id,
        name: label.name,
        color: label.color,
        description: label.description,
      })),
      milestone: data.milestone
        ? {
            id: data.milestone.id,
            number: data.milestone.number,
            title: data.milestone.title,
            description: data.milestone.description,
            state: data.milestone.state,
            due_on: data.milestone.due_on,
          }
        : undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
      merged_at: data.merged_at || undefined,
      draft: data.draft || false,
      html_url: data.html_url,
    }
  }
}
