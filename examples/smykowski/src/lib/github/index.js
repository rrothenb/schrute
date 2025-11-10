// Export all GitHub integration classes
export { GitHubClient } from './client.js';
export { IssueManager } from './issues.js';
export { PullRequestManager } from './pull-requests.js';
export { WikiManager } from './wiki.js';
export { DiscussionsManager } from './discussions.js';
export { ProjectsManager } from './projects.js';
export { WebhookManager } from './webhooks.js';
// Convenience factory for creating a fully configured GitHub client
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
export class GitHubService {
    constructor(token, repository, webhookSecret) {
        this.client = new GitHubClient(token, repository);
        this.issues = new IssueManager(this.client);
        this.pullRequests = new PullRequestManager(this.client);
        this.wiki = new WikiManager(this.client);
        this.discussions = new DiscussionsManager(this.client);
        this.projects = new ProjectsManager(this.client);
        this.webhooks = new WebhookManager(webhookSecret);
    }
    /**
     * Verify GitHub API connectivity
     */
    async verifyConnection() {
        return this.client.verifyConnection();
    }
    /**
     * Get current rate limit status
     */
    async getRateLimit() {
        return this.client.getRateLimit();
    }
    /**
     * Get repository information
     */
    getRepository() {
        return {
            owner: this.client.getOwner(),
            repo: this.client.getRepo(),
            fullName: this.client.getFullName(),
        };
    }
}
//# sourceMappingURL=index.js.map