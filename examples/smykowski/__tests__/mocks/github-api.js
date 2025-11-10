import { jest } from '@jest/globals';
// ============================================================================
// Mock GitHub Users
// ============================================================================
export const mockUsers = {
    alice: {
        login: 'alice',
        id: 1,
        email: 'alice@team.com',
        name: 'Alice Johnson',
    },
    bob: {
        login: 'bob',
        id: 2,
        email: 'bob@team.com',
        name: 'Bob Smith',
    },
    carol: {
        login: 'carol',
        id: 3,
        email: 'carol@team.com',
        name: 'Carol Williams',
    },
    teamlead: {
        login: 'teamlead',
        id: 4,
        email: 'lead@team.com',
        name: 'Team Lead',
    },
};
// ============================================================================
// Mock Labels
// ============================================================================
export const mockLabels = {
    bug: {
        id: 101,
        name: 'bug',
        color: 'd73a4a',
        description: 'Something is not working',
    },
    enhancement: {
        id: 102,
        name: 'enhancement',
        color: 'a2eeef',
        description: 'New feature or request',
    },
    documentation: {
        id: 103,
        name: 'documentation',
        color: '0075ca',
        description: 'Improvements or additions to documentation',
    },
    urgent: {
        id: 104,
        name: 'urgent',
        color: 'ff0000',
        description: 'Urgent priority',
    },
};
// ============================================================================
// Mock Milestones
// ============================================================================
export const mockMilestones = {
    sprint1: {
        id: 201,
        number: 1,
        title: 'Sprint 1',
        description: 'First sprint goals',
        state: 'open',
        due_on: '2025-11-17T00:00:00Z',
    },
    sprint2: {
        id: 202,
        number: 2,
        title: 'Sprint 2',
        description: 'Second sprint goals',
        state: 'open',
        due_on: '2025-11-24T00:00:00Z',
    },
};
// ============================================================================
// Mock Issues
// ============================================================================
export const mockIssues = {
    authFlow: {
        id: 301,
        number: 123,
        title: 'Implement authentication flow',
        body: 'We need to implement user authentication with OAuth',
        state: 'open',
        user: mockUsers.alice,
        assignees: [mockUsers.bob],
        labels: [mockLabels.enhancement],
        milestone: mockMilestones.sprint1,
        created_at: '2025-11-08T10:00:00Z',
        updated_at: '2025-11-08T10:00:00Z',
        html_url: 'https://github.com/test/repo/issues/123',
    },
    apiDesign: {
        id: 302,
        number: 124,
        title: 'Review API design',
        body: 'API design document needs review',
        state: 'open',
        user: mockUsers.alice,
        assignees: [mockUsers.carol],
        labels: [mockLabels.documentation],
        created_at: '2025-11-08T11:00:00Z',
        updated_at: '2025-11-08T11:00:00Z',
        html_url: 'https://github.com/test/repo/issues/124',
    },
    bugFix: {
        id: 303,
        number: 125,
        title: 'Fix login bug',
        body: 'Users cannot log in with special characters in password',
        state: 'open',
        user: mockUsers.bob,
        assignees: [mockUsers.bob],
        labels: [mockLabels.bug, mockLabels.urgent],
        created_at: '2025-11-07T14:00:00Z',
        updated_at: '2025-11-09T08:00:00Z',
        html_url: 'https://github.com/test/repo/issues/125',
    },
};
// ============================================================================
// Mock Pull Requests
// ============================================================================
export const mockPullRequests = {
    authImplementation: {
        id: 401,
        number: 50,
        title: 'Implement OAuth authentication',
        body: 'Closes #123\n\nImplements OAuth 2.0 authentication flow',
        state: 'open',
        user: mockUsers.bob,
        assignees: [mockUsers.bob],
        requested_reviewers: [mockUsers.alice, mockUsers.carol],
        labels: [mockLabels.enhancement],
        milestone: mockMilestones.sprint1,
        created_at: '2025-11-09T10:00:00Z',
        updated_at: '2025-11-09T10:00:00Z',
        draft: false,
        html_url: 'https://github.com/test/repo/pull/50',
    },
    stalePR: {
        id: 402,
        number: 48,
        title: 'Refactor database queries',
        body: 'Performance improvements for database layer',
        state: 'open',
        user: mockUsers.carol,
        assignees: [mockUsers.carol],
        requested_reviewers: [mockUsers.bob],
        labels: [mockLabels.enhancement],
        created_at: '2025-11-05T10:00:00Z',
        updated_at: '2025-11-05T10:00:00Z',
        draft: false,
        html_url: 'https://github.com/test/repo/pull/48',
    },
};
// ============================================================================
// Mock Discussions
// ============================================================================
export const mockDiscussions = {
    sprintPlanning: {
        id: 'D_kwDOA1234',
        number: 1,
        title: 'Sprint Planning - Nov 8',
        body: `Meeting notes from today's sprint planning...`,
        category: {
            id: 'DIC_kwDOA1234',
            name: 'Meeting Notes',
        },
        author: mockUsers.alice,
        created_at: '2025-11-08T16:00:00Z',
        updated_at: '2025-11-08T16:00:00Z',
        url: 'https://github.com/test/repo/discussions/1',
    },
};
export function createMockGitHubClient(overrides = {}) {
    const defaultMocks = {
        issues: {
            create: jest.fn().mockResolvedValue({ data: mockIssues.authFlow }),
            update: jest.fn().mockResolvedValue({ data: mockIssues.authFlow }),
            get: jest.fn().mockResolvedValue({ data: mockIssues.authFlow }),
            listForRepo: jest.fn().mockResolvedValue({ data: Object.values(mockIssues) }),
            addAssignees: jest.fn().mockResolvedValue({ data: mockIssues.authFlow }),
            removeAssignees: jest.fn().mockResolvedValue({ data: mockIssues.authFlow }),
            addLabels: jest.fn().mockResolvedValue({ data: [mockLabels.enhancement] }),
            createComment: jest.fn().mockResolvedValue({ data: { id: 1, body: 'Test comment' } }),
        },
        pulls: {
            list: jest.fn().mockResolvedValue({ data: Object.values(mockPullRequests) }),
            get: jest.fn().mockResolvedValue({ data: mockPullRequests.authImplementation }),
            requestReviewers: jest.fn().mockResolvedValue({ data: mockPullRequests.authImplementation }),
            createReview: jest.fn().mockResolvedValue({ data: { id: 1 } }),
            createComment: jest.fn().mockResolvedValue({ data: { id: 1, body: 'Test comment' } }),
        },
        repos: {
            getContent: jest.fn().mockResolvedValue({ data: { content: Buffer.from('# Wiki Page').toString('base64'), sha: 'abc123' } }),
            createOrUpdateFileContents: jest.fn().mockResolvedValue({ data: { commit: { sha: 'def456' } } }),
        },
    };
    return {
        issues: { ...defaultMocks.issues, ...overrides.issues },
        pulls: { ...defaultMocks.pulls, ...overrides.pulls },
        repos: { ...defaultMocks.repos, ...overrides.repos },
    };
}
// ============================================================================
// Mock Webhook Payloads
// ============================================================================
export const mockWebhookPayloads = {
    issueOpened: {
        action: 'opened',
        issue: mockIssues.authFlow,
        sender: mockUsers.alice,
        repository: {
            id: 12345,
            name: 'repo',
            full_name: 'test/repo',
            owner: mockUsers.alice,
        },
    },
    issueAssigned: {
        action: 'assigned',
        issue: mockIssues.authFlow,
        assignee: mockUsers.bob,
        sender: mockUsers.alice,
        repository: {
            id: 12345,
            name: 'repo',
            full_name: 'test/repo',
            owner: mockUsers.alice,
        },
    },
    prOpened: {
        action: 'opened',
        pull_request: mockPullRequests.authImplementation,
        sender: mockUsers.bob,
        repository: {
            id: 12345,
            name: 'repo',
            full_name: 'test/repo',
            owner: mockUsers.alice,
        },
    },
    reviewRequested: {
        action: 'review_requested',
        pull_request: mockPullRequests.authImplementation,
        requested_reviewer: mockUsers.alice,
        sender: mockUsers.bob,
        repository: {
            id: 12345,
            name: 'repo',
            full_name: 'test/repo',
            owner: mockUsers.alice,
        },
    },
};
// ============================================================================
// Utility Functions
// ============================================================================
export function createMockIssue(overrides = {}) {
    return {
        ...mockIssues.authFlow,
        ...overrides,
    };
}
export function createMockPR(overrides = {}) {
    return {
        ...mockPullRequests.authImplementation,
        ...overrides,
    };
}
//# sourceMappingURL=github-api.js.map