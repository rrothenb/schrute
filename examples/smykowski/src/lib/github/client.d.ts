import { Octokit } from '@octokit/rest';
/**
 * GitHubClient wraps Octokit with error handling, rate limiting, and retries
 */
export declare class GitHubClient {
    private octokit;
    private owner;
    private repo;
    constructor(token: string, repository: string);
    /**
     * Get repository information
     */
    getOwner(): string;
    getRepo(): string;
    getFullName(): string;
    /**
     * Get the underlying Octokit instance for advanced operations
     */
    getOctokit(): Octokit;
    /**
     * Handle GitHub API errors consistently
     */
    private handleError;
    /**
     * Verify GitHub API connectivity and permissions
     */
    verifyConnection(): Promise<boolean>;
    /**
     * Get current rate limit status
     */
    getRateLimit(): Promise<{
        limit: number;
        remaining: number;
        reset: number;
        used: number;
    }>;
}
//# sourceMappingURL=client.d.ts.map