import type { GitHubClient } from './client.js';
import type { GitHubProjectItem, GitHubProjectField } from '~/lib/types/index.js';
/**
 * ProjectsManager handles GitHub Projects v2 operations
 *
 * Note: Uses GraphQL API exclusively as Projects v2 is not available in REST API
 */
export declare class ProjectsManager {
    private client;
    constructor(client: GitHubClient);
    /**
     * Get project fields for a project
     */
    getProjectFields(projectId: string): Promise<GitHubProjectField[]>;
    /**
     * Add an issue to a project
     */
    addIssue(projectId: string, issueId: string): Promise<string>;
    /**
     * Update a project item field
     */
    updateItemField(projectId: string, itemId: string, fieldId: string, value: string | number): Promise<void>;
    /**
     * Get project items (issues/PRs in the project)
     */
    getItems(projectId: string, limit?: number): Promise<GitHubProjectItem[]>;
    /**
     * Get repository's projects
     */
    getRepositoryProjects(): Promise<Array<{
        id: string;
        title: string;
        number: number;
    }>>;
    /**
     * Get global node ID for an issue (needed for GraphQL operations)
     */
    getIssueNodeId(issueNumber: number): Promise<string>;
    /**
     * Get global node ID for a pull request
     */
    getPRNodeId(prNumber: number): Promise<string>;
}
//# sourceMappingURL=projects.d.ts.map