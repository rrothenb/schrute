import { jest } from '@jest/globals';
import type { GitHubUser, GitHubLabel, GitHubIssue, GitHubPullRequest, GitHubDiscussion, GitHubMilestone } from '~/lib/types/index.js';
export declare const mockUsers: {
    alice: GitHubUser;
    bob: GitHubUser;
    carol: GitHubUser;
    teamlead: GitHubUser;
};
export declare const mockLabels: {
    bug: GitHubLabel;
    enhancement: GitHubLabel;
    documentation: GitHubLabel;
    urgent: GitHubLabel;
};
export declare const mockMilestones: {
    sprint1: GitHubMilestone;
    sprint2: GitHubMilestone;
};
export declare const mockIssues: {
    authFlow: GitHubIssue;
    apiDesign: GitHubIssue;
    bugFix: GitHubIssue;
};
export declare const mockPullRequests: {
    authImplementation: GitHubPullRequest;
    stalePR: GitHubPullRequest;
};
export declare const mockDiscussions: {
    sprintPlanning: GitHubDiscussion;
};
export interface MockGitHubClient {
    issues: {
        create: jest.Mock;
        update: jest.Mock;
        get: jest.Mock;
        listForRepo: jest.Mock;
        addAssignees: jest.Mock;
        removeAssignees: jest.Mock;
        addLabels: jest.Mock;
        createComment: jest.Mock;
    };
    pulls: {
        list: jest.Mock;
        get: jest.Mock;
        requestReviewers: jest.Mock;
        createReview: jest.Mock;
        createComment: jest.Mock;
    };
    repos: {
        getContent: jest.Mock;
        createOrUpdateFileContents: jest.Mock;
    };
}
export declare function createMockGitHubClient(overrides?: Partial<MockGitHubClient>): MockGitHubClient;
export declare const mockWebhookPayloads: {
    issueOpened: {
        action: string;
        issue: {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            user: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            };
            assignees: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            }[];
            labels: {
                id: number;
                name: string;
                color: string;
                description?: string | undefined;
            }[];
            created_at: string;
            updated_at: string;
            html_url: string;
            body?: string | undefined;
            milestone?: {
                number: number;
                id: number;
                title: string;
                state: "open" | "closed";
                description?: string | undefined;
                due_on?: string | undefined;
            } | undefined;
            closed_at?: string | undefined;
        };
        sender: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
        repository: {
            id: number;
            name: string;
            full_name: string;
            owner: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            };
        };
    };
    issueAssigned: {
        action: string;
        issue: {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            user: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            };
            assignees: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            }[];
            labels: {
                id: number;
                name: string;
                color: string;
                description?: string | undefined;
            }[];
            created_at: string;
            updated_at: string;
            html_url: string;
            body?: string | undefined;
            milestone?: {
                number: number;
                id: number;
                title: string;
                state: "open" | "closed";
                description?: string | undefined;
                due_on?: string | undefined;
            } | undefined;
            closed_at?: string | undefined;
        };
        assignee: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
        sender: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
        repository: {
            id: number;
            name: string;
            full_name: string;
            owner: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            };
        };
    };
    prOpened: {
        action: string;
        pull_request: {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            user: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            };
            assignees: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            }[];
            labels: {
                id: number;
                name: string;
                color: string;
                description?: string | undefined;
            }[];
            created_at: string;
            updated_at: string;
            html_url: string;
            requested_reviewers: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            }[];
            draft: boolean;
            body?: string | undefined;
            milestone?: {
                number: number;
                id: number;
                title: string;
                state: "open" | "closed";
                description?: string | undefined;
                due_on?: string | undefined;
            } | undefined;
            merged_at?: string | undefined;
        };
        sender: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
        repository: {
            id: number;
            name: string;
            full_name: string;
            owner: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            };
        };
    };
    reviewRequested: {
        action: string;
        pull_request: {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            user: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            };
            assignees: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            }[];
            labels: {
                id: number;
                name: string;
                color: string;
                description?: string | undefined;
            }[];
            created_at: string;
            updated_at: string;
            html_url: string;
            requested_reviewers: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            }[];
            draft: boolean;
            body?: string | undefined;
            milestone?: {
                number: number;
                id: number;
                title: string;
                state: "open" | "closed";
                description?: string | undefined;
                due_on?: string | undefined;
            } | undefined;
            merged_at?: string | undefined;
        };
        requested_reviewer: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
        sender: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
        repository: {
            id: number;
            name: string;
            full_name: string;
            owner: {
                login: string;
                id: number;
                email?: string | undefined;
                name?: string | undefined;
            };
        };
    };
};
export declare function createMockIssue(overrides?: Partial<GitHubIssue>): GitHubIssue;
export declare function createMockPR(overrides?: Partial<GitHubPullRequest>): GitHubPullRequest;
//# sourceMappingURL=github-api.d.ts.map