/**
 * DiscussionsManager handles GitHub Discussions operations
 *
 * Note: Requires GraphQL API for full functionality
 */
export class DiscussionsManager {
    constructor(client) {
        this.client = client;
    }
    /**
     * Create a new discussion
     */
    async create(params) {
        try {
            const query = `
        mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
          createDiscussion(input: {
            repositoryId: $repositoryId,
            categoryId: $categoryId,
            title: $title,
            body: $body
          }) {
            discussion {
              id
              number
              title
              body
              category {
                id
                name
              }
              author {
                login
              }
              createdAt
              updatedAt
              url
            }
          }
        }
      `;
            const repositoryId = await this.getRepositoryId();
            const result = await this.client.getOctokit().graphql(query, {
                repositoryId,
                categoryId: params.categoryId,
                title: params.title,
                body: params.body,
            });
            return this.transformDiscussion(result.createDiscussion.discussion);
        }
        catch (error) {
            throw new Error(`Failed to create discussion: ${error.message}`);
        }
    }
    /**
     * Add a comment to a discussion
     */
    async addComment(discussionId, body) {
        try {
            const query = `
        mutation($discussionId: ID!, $body: String!) {
          addDiscussionComment(input: {
            discussionId: $discussionId,
            body: $body
          }) {
            comment {
              id
            }
          }
        }
      `;
            await this.client.getOctokit().graphql(query, {
                discussionId,
                body,
            });
        }
        catch (error) {
            throw new Error(`Failed to add comment to discussion: ${error.message}`);
        }
    }
    /**
     * Get a discussion by number
     */
    async get(discussionNumber) {
        try {
            const query = `
        query($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            discussion(number: $number) {
              id
              number
              title
              body
              category {
                id
                name
              }
              author {
                login
              }
              createdAt
              updatedAt
              url
            }
          }
        }
      `;
            const result = await this.client.getOctokit().graphql(query, {
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                number: discussionNumber,
            });
            if (!result.repository.discussion) {
                return null;
            }
            return this.transformDiscussion(result.repository.discussion);
        }
        catch (error) {
            if (error.message?.includes('NOT_FOUND')) {
                return null;
            }
            throw new Error(`Failed to get discussion #${discussionNumber}: ${error.message}`);
        }
    }
    /**
     * List discussions in a category
     */
    async listByCategory(categoryName, limit = 20) {
        try {
            const query = `
        query($owner: String!, $repo: String!, $limit: Int!) {
          repository(owner: $owner, name: $repo) {
            discussions(first: $limit, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                id
                number
                title
                body
                category {
                  id
                  name
                }
                author {
                  login
                }
                createdAt
                updatedAt
                url
              }
            }
          }
        }
      `;
            const result = await this.client.getOctokit().graphql(query, {
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                limit,
            });
            const discussions = result.repository.discussions.nodes || [];
            return discussions
                .filter((d) => d.category.name === categoryName)
                .map((d) => this.transformDiscussion(d));
        }
        catch (error) {
            throw new Error(`Failed to list discussions: ${error.message}`);
        }
    }
    /**
     * Get discussion categories
     */
    async getCategories() {
        try {
            const query = `
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            discussionCategories(first: 20) {
              nodes {
                id
                name
              }
            }
          }
        }
      `;
            const result = await this.client.getOctokit().graphql(query, {
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
            });
            return result.repository.discussionCategories.nodes || [];
        }
        catch (error) {
            throw new Error(`Failed to get discussion categories: ${error.message}`);
        }
    }
    /**
     * Get category ID by name
     */
    async getCategoryId(categoryName) {
        const categories = await this.getCategories();
        const category = categories.find(c => c.name === categoryName);
        return category?.id || null;
    }
    /**
     * Get repository ID (needed for GraphQL mutations)
     */
    async getRepositoryId() {
        try {
            const query = `
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            id
          }
        }
      `;
            const result = await this.client.getOctokit().graphql(query, {
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
            });
            return result.repository.id;
        }
        catch (error) {
            throw new Error(`Failed to get repository ID: ${error.message}`);
        }
    }
    /**
     * Transform GraphQL response to our GitHubDiscussion type
     */
    transformDiscussion(data) {
        return {
            id: data.id,
            number: data.number,
            title: data.title,
            body: data.body,
            category: {
                id: data.category.id,
                name: data.category.name,
            },
            author: {
                login: data.author.login,
                id: 0, // GraphQL doesn't return numeric ID easily
            },
            created_at: data.createdAt,
            updated_at: data.updatedAt,
            url: data.url,
        };
    }
}
//# sourceMappingURL=discussions.js.map