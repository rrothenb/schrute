/**
 * ProjectsManager handles GitHub Projects v2 operations
 *
 * Note: Uses GraphQL API exclusively as Projects v2 is not available in REST API
 */
export class ProjectsManager {
    constructor(client) {
        this.client = client;
    }
    /**
     * Get project fields for a project
     */
    async getProjectFields(projectId) {
        try {
            const query = `
        query($projectId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              fields(first: 20) {
                nodes {
                  ... on ProjectV2Field {
                    id
                    name
                    dataType
                  }
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    dataType
                    options {
                      id
                      name
                    }
                  }
                  ... on ProjectV2IterationField {
                    id
                    name
                    dataType
                  }
                }
              }
            }
          }
        }
      `;
            const result = await this.client.getOctokit().graphql(query, {
                projectId,
            });
            return result.node.fields.nodes.map((field) => ({
                id: field.id,
                name: field.name,
                dataType: field.dataType,
                options: field.options || undefined,
            }));
        }
        catch (error) {
            throw new Error(`Failed to get project fields: ${error.message}`);
        }
    }
    /**
     * Add an issue to a project
     */
    async addIssue(projectId, issueId) {
        try {
            const query = `
        mutation($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: {
            projectId: $projectId,
            contentId: $contentId
          }) {
            item {
              id
            }
          }
        }
      `;
            const result = await this.client.getOctokit().graphql(query, {
                projectId,
                contentId: issueId,
            });
            return result.addProjectV2ItemById.item.id;
        }
        catch (error) {
            throw new Error(`Failed to add issue to project: ${error.message}`);
        }
    }
    /**
     * Update a project item field
     */
    async updateItemField(projectId, itemId, fieldId, value) {
        try {
            const query = `
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $projectId,
            itemId: $itemId,
            fieldId: $fieldId,
            value: $value
          }) {
            projectV2Item {
              id
            }
          }
        }
      `;
            let fieldValue;
            if (typeof value === 'string') {
                fieldValue = { text: value };
            }
            else if (typeof value === 'number') {
                fieldValue = { number: value };
            }
            else {
                fieldValue = { singleSelectOptionId: value };
            }
            await this.client.getOctokit().graphql(query, {
                projectId,
                itemId,
                fieldId,
                value: fieldValue,
            });
        }
        catch (error) {
            throw new Error(`Failed to update project item field: ${error.message}`);
        }
    }
    /**
     * Get project items (issues/PRs in the project)
     */
    async getItems(projectId, limit = 50) {
        try {
            const query = `
        query($projectId: ID!, $limit: Int!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: $limit) {
                nodes {
                  id
                  content {
                    ... on Issue {
                      id
                      number
                    }
                    ... on PullRequest {
                      id
                      number
                    }
                  }
                  fieldValues(first: 20) {
                    nodes {
                      ... on ProjectV2ItemFieldTextValue {
                        text
                        field {
                          ... on ProjectV2Field {
                            id
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldNumberValue {
                        number
                        field {
                          ... on ProjectV2Field {
                            id
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2SingleSelectField {
                            id
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
            const result = await this.client.getOctokit().graphql(query, {
                projectId,
                limit,
            });
            return result.node.items.nodes.map((item) => {
                const fieldValues = {};
                item.fieldValues.nodes.forEach((fv) => {
                    const fieldName = fv.field?.name;
                    if (fieldName) {
                        fieldValues[fieldName] = fv.text || fv.number || fv.name;
                    }
                });
                return {
                    id: item.id,
                    content: {
                        id: item.content.id,
                        number: item.content.number,
                        type: item.content.__typename,
                    },
                    fieldValues,
                };
            });
        }
        catch (error) {
            throw new Error(`Failed to get project items: ${error.message}`);
        }
    }
    /**
     * Get repository's projects
     */
    async getRepositoryProjects() {
        try {
            const query = `
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            projectsV2(first: 10) {
              nodes {
                id
                title
                number
              }
            }
          }
        }
      `;
            const result = await this.client.getOctokit().graphql(query, {
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
            });
            return result.repository.projectsV2.nodes || [];
        }
        catch (error) {
            throw new Error(`Failed to get repository projects: ${error.message}`);
        }
    }
    /**
     * Get global node ID for an issue (needed for GraphQL operations)
     */
    async getIssueNodeId(issueNumber) {
        try {
            const response = await this.client.getOctokit().rest.issues.get({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                issue_number: issueNumber,
            });
            return response.data.node_id;
        }
        catch (error) {
            throw new Error(`Failed to get issue node ID: ${error.message}`);
        }
    }
    /**
     * Get global node ID for a pull request
     */
    async getPRNodeId(prNumber) {
        try {
            const response = await this.client.getOctokit().rest.pulls.get({
                owner: this.client.getOwner(),
                repo: this.client.getRepo(),
                pull_number: prNumber,
            });
            return response.data.node_id;
        }
        catch (error) {
            throw new Error(`Failed to get PR node ID: ${error.message}`);
        }
    }
}
//# sourceMappingURL=projects.js.map