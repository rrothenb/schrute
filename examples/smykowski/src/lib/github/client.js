import { Octokit } from '@octokit/rest';
/**
 * GitHubClient wraps Octokit with error handling, rate limiting, and retries
 */
export class GitHubClient {
    constructor(token, repository) {
        this.octokit = new Octokit({
            auth: token,
            retry: {
                enabled: true,
                retries: 3,
            },
            throttle: {
                onRateLimit: (retryAfter, options) => {
                    console.warn(`Rate limit hit. Retrying after ${retryAfter} seconds...`);
                    return true;
                },
                onSecondaryRateLimit: (retryAfter, options) => {
                    console.warn(`Secondary rate limit hit. Retrying after ${retryAfter} seconds...`);
                    return true;
                },
            },
        });
        const [owner, repo] = repository.split('/');
        if (!owner || !repo) {
            throw new Error(`Invalid repository format: ${repository}. Expected "owner/repo"`);
        }
        this.owner = owner;
        this.repo = repo;
    }
    /**
     * Get repository information
     */
    getOwner() {
        return this.owner;
    }
    getRepo() {
        return this.repo;
    }
    getFullName() {
        return `${this.owner}/${this.repo}`;
    }
    /**
     * Get the underlying Octokit instance for advanced operations
     */
    getOctokit() {
        return this.octokit;
    }
    /**
     * Handle GitHub API errors consistently
     */
    handleError(error, operation) {
        const message = error.message || 'Unknown error';
        const status = error.status || 500;
        throw new Error(`GitHub API error during ${operation}: ${message} (status: ${status})`);
    }
    /**
     * Verify GitHub API connectivity and permissions
     */
    async verifyConnection() {
        try {
            await this.octokit.rest.repos.get({
                owner: this.owner,
                repo: this.repo,
            });
            return true;
        }
        catch (error) {
            this.handleError(error, 'connection verification');
        }
    }
    /**
     * Get current rate limit status
     */
    async getRateLimit() {
        try {
            const response = await this.octokit.rest.rateLimit.get();
            return response.data.rate;
        }
        catch (error) {
            this.handleError(error, 'rate limit check');
        }
    }
}
//# sourceMappingURL=client.js.map