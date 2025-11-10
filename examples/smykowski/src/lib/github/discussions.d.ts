import type { GitHubClient } from './client.js';
import type { GitHubDiscussion, DiscussionParams } from '~/lib/types/index.js';
/**
 * DiscussionsManager handles GitHub Discussions operations
 *
 * Note: Requires GraphQL API for full functionality
 */
export declare class DiscussionsManager {
    private client;
    constructor(client: GitHubClient);
    /**
     * Create a new discussion
     */
    create(params: DiscussionParams): Promise<GitHubDiscussion>;
    /**
     * Add a comment to a discussion
     */
    addComment(discussionId: string, body: string): Promise<void>;
    /**
     * Get a discussion by number
     */
    get(discussionNumber: number): Promise<GitHubDiscussion | null>;
    /**
     * List discussions in a category
     */
    listByCategory(categoryName: string, limit?: number): Promise<GitHubDiscussion[]>;
    /**
     * Get discussion categories
     */
    getCategories(): Promise<Array<{
        id: string;
        name: string;
    }>>;
    /**
     * Get category ID by name
     */
    getCategoryId(categoryName: string): Promise<string | null>;
    /**
     * Get repository ID (needed for GraphQL mutations)
     */
    private getRepositoryId;
    /**
     * Transform GraphQL response to our GitHubDiscussion type
     */
    private transformDiscussion;
}
//# sourceMappingURL=discussions.d.ts.map