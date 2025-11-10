export { GitHubClient } from './client.js';
export { IssueManager } from './issues.js';
export { PullRequestManager } from './pull-requests.js';
export { WikiManager } from './wiki.js';
export { DiscussionsManager } from './discussions.js';
export { ProjectsManager } from './projects.js';
export { WebhookManager } from './webhooks.js';
import { GitHubClient } from './client.js';
import { IssueManager } from './issues.js';
import { PullRequestManager } from './pull-requests.js';
import { WikiManager } from './wiki.js';
import { DiscussionsManager } from './discussions.js';
import { ProjectsManager } from './projects.js';
import { WebhookManager } from './webhooks.js';
/**
 * GitHubService provides a unified interface to all GitHub operations
 */
export declare class GitHubService {
    readonly client: GitHubClient;
    readonly issues: IssueManager;
    readonly pullRequests: PullRequestManager;
    readonly wiki: WikiManager;
    readonly discussions: DiscussionsManager;
    readonly projects: ProjectsManager;
    readonly webhooks: WebhookManager;
    constructor(token: string, repository: string, webhookSecret: string);
    /**
     * Verify GitHub API connectivity
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
    /**
     * Get repository information
     */
    getRepository(): {
        owner: string;
        repo: string;
        fullName: string;
    };
}
//# sourceMappingURL=index.d.ts.map