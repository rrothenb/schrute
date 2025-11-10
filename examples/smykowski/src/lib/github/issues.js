/**
 * IssueManager handles all GitHub Issue operations
 */
export class IssueManager {
    constructor(client) {
        this.client = client;
    }
    /**
     * Create a new issue
     */
    async create(params) {
        try {
            const response = await this.client.getOctokit().rest.issues.create({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                title: params.title,
                body: params.body,
                assignees: params.assignees,
                labels: params.labels,
                milestone: params.milestone,
            });
            return this.transformIssue(response.data);
        }
        catch (error) {
            throw new Error(`Failed to create issue: ${error.message}`);
        }
    }
    /**
     * Update an existing issue
     */
    async update(issueNumber, params) {
        try {
            const response = await this.client.getOctokit().rest.issues.update({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                issue_number: issueNumber,
                title: params.title,
                body: params.body,
                state: params.state,
                assignees: params.assignees,
                labels: params.labels,
                milestone: params.milestone,
            });
            return this.transformIssue(response.data);
        }
        catch (error) {
            throw new Error(`Failed to update issue #${issueNumber}: ${error.message}`);
        }
    }
    /**
     * Get a single issue by number
     */
    async get(issueNumber) {
        try {
            const response = await this.client.getOctokit().rest.issues.get({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                issue_number: issueNumber,
            });
            return this.transformIssue(response.data);
        }
        catch (error) {
            throw new Error(`Failed to get issue #${issueNumber}: ${error.message}`);
        }
    }
    /**
     * List issues with filters
     */
    async list(filter = {}) {
        try {
            const response = await this.client.getOctokit().rest.issues.listForRepo({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                state: filter.state || 'open',
                assignee: filter.assignee,
                creator: filter.creator,
                labels: filter.labels?.join(','),
                milestone: filter.milestone,
                since: filter.since,
                sort: filter.sort || 'created',
                direction: filter.direction || 'desc',
                per_page: 100,
            });
            return response.data.map(issue => this.transformIssue(issue));
        }
        catch (error) {
            throw new Error(`Failed to list issues: ${error.message}`);
        }
    }
    /**
     * Add assignees to an issue
     */
    async addAssignees(issueNumber, assignees) {
        try {
            const response = await this.client.getOctokit().rest.issues.addAssignees({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                issue_number: issueNumber,
                assignees,
            });
            return this.transformIssue(response.data);
        }
        catch (error) {
            throw new Error(`Failed to add assignees to issue #${issueNumber}: ${error.message}`);
        }
    }
    /**
     * Remove assignees from an issue
     */
    async removeAssignees(issueNumber, assignees) {
        try {
            const response = await this.client.getOctokit().rest.issues.removeAssignees({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                issue_number: issueNumber,
                assignees,
            });
            return this.transformIssue(response.data);
        }
        catch (error) {
            throw new Error(`Failed to remove assignees from issue #${issueNumber}: ${error.message}`);
        }
    }
    /**
     * Add labels to an issue
     */
    async addLabels(issueNumber, labels) {
        try {
            await this.client.getOctokit().rest.issues.addLabels({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                issue_number: issueNumber,
                labels,
            });
        }
        catch (error) {
            throw new Error(`Failed to add labels to issue #${issueNumber}: ${error.message}`);
        }
    }
    /**
     * Remove a label from an issue
     */
    async removeLabel(issueNumber, label) {
        try {
            await this.client.getOctokit().rest.issues.removeLabel({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                issue_number: issueNumber,
                name: label,
            });
        }
        catch (error) {
            throw new Error(`Failed to remove label from issue #${issueNumber}: ${error.message}`);
        }
    }
    /**
     * Add a comment to an issue
     */
    async addComment(issueNumber, body) {
        try {
            await this.client.getOctokit().rest.issues.createComment({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                issue_number: issueNumber,
                body,
            });
        }
        catch (error) {
            throw new Error(`Failed to add comment to issue #${issueNumber}: ${error.message}`);
        }
    }
    /**
     * Close an issue
     */
    async close(issueNumber, comment) {
        if (comment) {
            await this.addComment(issueNumber, comment);
        }
        return this.update(issueNumber, { state: 'closed' });
    }
    /**
     * Reopen an issue
     */
    async reopen(issueNumber, comment) {
        if (comment) {
            await this.addComment(issueNumber, comment);
        }
        return this.update(issueNumber, { state: 'open' });
    }
    /**
     * Get issues assigned to a specific user
     */
    async getAssignedTo(username) {
        return this.list({ assignee: username, state: 'open' });
    }
    /**
     * Get issues created by a specific user
     */
    async getCreatedBy(username) {
        return this.list({ creator: username, state: 'all' });
    }
    /**
     * Get issues with specific labels
     */
    async getByLabels(labels) {
        return this.list({ labels, state: 'open' });
    }
    /**
     * Search for issues (simple text search in title/body)
     */
    async search(query) {
        try {
            const response = await this.client.getOctokit().rest.search.issuesAndPullRequests({
                q: `${query} repo:${this.client.getFullName()} is:issue`,
                per_page: 100,
            });
            return response.data.items
                .filter(item => !item.pull_request) // Filter out PRs
                .map(issue => this.transformIssue(issue));
        }
        catch (error) {
            throw new Error(`Failed to search issues: ${error.message}`);
        }
    }
    /**
     * Transform API response to our GitHubIssue type
     */
    transformIssue(data) {
        return {
            id: data.id,
            number: data.number,
            title: data.title,
            body: data.body || undefined,
            state: data.state,
            user: {
                login: data.user.login,
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
            },
            assignees: (data.assignees || []).map((assignee) => ({
                login: assignee.login,
                id: assignee.id,
                email: assignee.email,
                name: assignee.name,
            })),
            labels: (data.labels || []).map((label) => ({
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
            closed_at: data.closed_at || undefined,
            html_url: data.html_url,
        };
    }
}
//# sourceMappingURL=issues.js.map