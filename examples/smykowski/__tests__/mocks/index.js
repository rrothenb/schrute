// Export all mocks
export * from './github-api.js';
export * from './sample-emails.js';
// Export commonly used mock creators
import { createMockGitHubClient, createMockIssue, createMockPR } from './github-api.js';
import { allSampleEmails, emailsByType } from './sample-emails.js';
export const mocks = {
    github: {
        createClient: createMockGitHubClient,
        createIssue: createMockIssue,
        createPR: createMockPR,
    },
    emails: {
        all: allSampleEmails,
        byType: emailsByType,
    },
};
//# sourceMappingURL=index.js.map