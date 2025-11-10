import type { GitHubClient } from './client.js';
import type { GitHubPullRequest, PullRequestQueryFilter, PullRequestReviewRequest, GitHubUser } from '~/lib/types/index.js';
/**
 * PullRequestManager handles all GitHub Pull Request operations
 */
export declare class PullRequestManager {
    private client;
    constructor(client: GitHubClient);
    /**
     * Get a single pull request by number
     */
    get(prNumber: number): Promise<GitHubPullRequest>;
    /**
     * List pull requests with filters
     */
    list(filter?: PullRequestQueryFilter): Promise<GitHubPullRequest[]>;
    /**
     * Get all open pull requests
     */
    getOpen(): Promise<GitHubPullRequest[]>;
    /**
     * Get pull requests that need review
     */
    getNeedingReview(): Promise<GitHubPullRequest[]>;
    /**
     * Get stale pull requests (older than threshold)
     */
    getStale(thresholdHours: number): Promise<GitHubPullRequest[]>;
    /**
     * Request reviews from specific users
     */
    requestReviews(prNumber: number, params: PullRequestReviewRequest): Promise<void>;
    /**
     * Add a comment to a pull request
     */
    addComment(prNumber: number, body: string): Promise<void>;
    /**
     * Get review status for a pull request
     */
    getReviewStatus(prNumber: number): Promise<{
        approved: boolean;
        changesRequested: boolean;
        reviewers: Array<{
            user: GitHubUser;
            state: string;
            submitted_at: string;
        }>;
    }>;
    /**
     * Get files changed in a pull request
     */
    getFiles(prNumber: number): Promise<Array<{
        filename: string;
        additions: number;
        deletions: number;
    }>>;
    /**
     * Get PR age in hours
     */
    getPRAge(pr: GitHubPullRequest): number;
    /**
     * Check if PR references an issue
     */
    getReferencedIssues(pr: GitHubPullRequest): number[];
    /**
     * Transform API response to our GitHubPullRequest type
     */
    private transformPR;
}
//# sourceMappingURL=pull-requests.d.ts.map