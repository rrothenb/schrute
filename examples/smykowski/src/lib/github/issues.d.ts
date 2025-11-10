import type { GitHubClient } from './client.js';
import type { GitHubIssue, IssueCreationParams, IssueUpdateParams, IssueQueryFilter } from '~/lib/types/index.js';
/**
 * IssueManager handles all GitHub Issue operations
 */
export declare class IssueManager {
    private client;
    constructor(client: GitHubClient);
    /**
     * Create a new issue
     */
    create(params: IssueCreationParams): Promise<GitHubIssue>;
    /**
     * Update an existing issue
     */
    update(issueNumber: number, params: IssueUpdateParams): Promise<GitHubIssue>;
    /**
     * Get a single issue by number
     */
    get(issueNumber: number): Promise<GitHubIssue>;
    /**
     * List issues with filters
     */
    list(filter?: IssueQueryFilter): Promise<GitHubIssue[]>;
    /**
     * Add assignees to an issue
     */
    addAssignees(issueNumber: number, assignees: string[]): Promise<GitHubIssue>;
    /**
     * Remove assignees from an issue
     */
    removeAssignees(issueNumber: number, assignees: string[]): Promise<GitHubIssue>;
    /**
     * Add labels to an issue
     */
    addLabels(issueNumber: number, labels: string[]): Promise<void>;
    /**
     * Remove a label from an issue
     */
    removeLabel(issueNumber: number, label: string): Promise<void>;
    /**
     * Add a comment to an issue
     */
    addComment(issueNumber: number, body: string): Promise<void>;
    /**
     * Close an issue
     */
    close(issueNumber: number, comment?: string): Promise<GitHubIssue>;
    /**
     * Reopen an issue
     */
    reopen(issueNumber: number, comment?: string): Promise<GitHubIssue>;
    /**
     * Get issues assigned to a specific user
     */
    getAssignedTo(username: string): Promise<GitHubIssue[]>;
    /**
     * Get issues created by a specific user
     */
    getCreatedBy(username: string): Promise<GitHubIssue[]>;
    /**
     * Get issues with specific labels
     */
    getByLabels(labels: string[]): Promise<GitHubIssue[]>;
    /**
     * Search for issues (simple text search in title/body)
     */
    search(query: string): Promise<GitHubIssue[]>;
    /**
     * Transform API response to our GitHubIssue type
     */
    private transformIssue;
}
//# sourceMappingURL=issues.d.ts.map