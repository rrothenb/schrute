import { Octokit } from '@octokit/rest'
import type {
  GitHubIssue,
  GitHubPullRequest,
  IssueCreationParams,
  IssueUpdateParams,
  PullRequestReviewRequest,
  GitHubAPIError,
} from '~/lib/types/index.js'

/**
 * GitHubClient wraps Octokit with error handling, rate limiting, and retries
 */
export class GitHubClient {
  private octokit: Octokit
  private owner: string
  private repo: string

  constructor(token: string, repository: string) {
    this.octokit = new Octokit({
      auth: token,
      retry: {
        enabled: true,
        retries: 3,
      },
      throttle: {
        onRateLimit: (retryAfter: number, options: any) => {
          console.warn(`Rate limit hit. Retrying after ${retryAfter} seconds...`)
          return true
        },
        onSecondaryRateLimit: (retryAfter: number, options: any) => {
          console.warn(`Secondary rate limit hit. Retrying after ${retryAfter} seconds...`)
          return true
        },
      },
    })

    const [owner, repo] = repository.split('/')
    if (!owner || !repo) {
      throw new Error(`Invalid repository format: ${repository}. Expected "owner/repo"`)
    }
    this.owner = owner
    this.repo = repo
  }

  /**
   * Get repository information
   */
  getOwner(): string {
    return this.owner
  }

  getRepo(): string {
    return this.repo
  }

  getFullName(): string {
    return `${this.owner}/${this.repo}`
  }

  /**
   * Get the underlying Octokit instance for advanced operations
   */
  getOctokit(): Octokit {
    return this.octokit
  }

  /**
   * Handle GitHub API errors consistently
   */
  private handleError(error: any, operation: string): never {
    const message = error.message || 'Unknown error'
    const status = error.status || 500

    throw new Error(`GitHub API error during ${operation}: ${message} (status: ${status})`) as GitHubAPIError
  }

  /**
   * Verify GitHub API connectivity and permissions
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      })
      return true
    } catch (error) {
      this.handleError(error, 'connection verification')
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimit() {
    try {
      const response = await this.octokit.rest.rateLimit.get()
      return response.data.rate
    } catch (error) {
      this.handleError(error, 'rate limit check')
    }
  }
}
