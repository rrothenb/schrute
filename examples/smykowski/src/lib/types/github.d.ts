import { z } from 'zod';
export declare const GitHubUserSchema: z.ZodObject<{
    login: z.ZodString;
    id: z.ZodNumber;
    email: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    login: string;
    id: number;
    email?: string | undefined;
    name?: string | undefined;
}, {
    login: string;
    id: number;
    email?: string | undefined;
    name?: string | undefined;
}>;
export type GitHubUser = z.infer<typeof GitHubUserSchema>;
export declare const GitHubLabelSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    color: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: number;
    name: string;
    color: string;
    description?: string | undefined;
}, {
    id: number;
    name: string;
    color: string;
    description?: string | undefined;
}>;
export type GitHubLabel = z.infer<typeof GitHubLabelSchema>;
export declare const GitHubMilestoneSchema: z.ZodObject<{
    id: z.ZodNumber;
    number: z.ZodNumber;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    state: z.ZodEnum<["open", "closed"]>;
    due_on: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    number: number;
    id: number;
    title: string;
    state: "open" | "closed";
    description?: string | undefined;
    due_on?: string | undefined;
}, {
    number: number;
    id: number;
    title: string;
    state: "open" | "closed";
    description?: string | undefined;
    due_on?: string | undefined;
}>;
export type GitHubMilestone = z.infer<typeof GitHubMilestoneSchema>;
export declare const GitHubIssueSchema: z.ZodObject<{
    id: z.ZodNumber;
    number: z.ZodNumber;
    title: z.ZodString;
    body: z.ZodOptional<z.ZodString>;
    state: z.ZodEnum<["open", "closed"]>;
    user: z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>;
    assignees: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>, "many">>>;
    labels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        color: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        color: string;
        description?: string | undefined;
    }, {
        id: number;
        name: string;
        color: string;
        description?: string | undefined;
    }>, "many">>>;
    milestone: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        number: z.ZodNumber;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        state: z.ZodEnum<["open", "closed"]>;
        due_on: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        number: number;
        id: number;
        title: string;
        state: "open" | "closed";
        description?: string | undefined;
        due_on?: string | undefined;
    }, {
        number: number;
        id: number;
        title: string;
        state: "open" | "closed";
        description?: string | undefined;
        due_on?: string | undefined;
    }>>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    closed_at: z.ZodOptional<z.ZodString>;
    html_url: z.ZodString;
}, "strip", z.ZodTypeAny, {
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
}, {
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
    created_at: string;
    updated_at: string;
    html_url: string;
    body?: string | undefined;
    assignees?: {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }[] | undefined;
    labels?: {
        id: number;
        name: string;
        color: string;
        description?: string | undefined;
    }[] | undefined;
    milestone?: {
        number: number;
        id: number;
        title: string;
        state: "open" | "closed";
        description?: string | undefined;
        due_on?: string | undefined;
    } | undefined;
    closed_at?: string | undefined;
}>;
export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;
export declare const GitHubPullRequestSchema: z.ZodObject<{
    id: z.ZodNumber;
    number: z.ZodNumber;
    title: z.ZodString;
    body: z.ZodOptional<z.ZodString>;
    state: z.ZodEnum<["open", "closed"]>;
    user: z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>;
    assignees: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>, "many">>>;
    requested_reviewers: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>, "many">>>;
    labels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        color: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        color: string;
        description?: string | undefined;
    }, {
        id: number;
        name: string;
        color: string;
        description?: string | undefined;
    }>, "many">>>;
    milestone: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        number: z.ZodNumber;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        state: z.ZodEnum<["open", "closed"]>;
        due_on: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        number: number;
        id: number;
        title: string;
        state: "open" | "closed";
        description?: string | undefined;
        due_on?: string | undefined;
    }, {
        number: number;
        id: number;
        title: string;
        state: "open" | "closed";
        description?: string | undefined;
        due_on?: string | undefined;
    }>>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    merged_at: z.ZodOptional<z.ZodString>;
    draft: z.ZodBoolean;
    html_url: z.ZodString;
}, "strip", z.ZodTypeAny, {
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
}, {
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
    created_at: string;
    updated_at: string;
    html_url: string;
    draft: boolean;
    body?: string | undefined;
    assignees?: {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }[] | undefined;
    labels?: {
        id: number;
        name: string;
        color: string;
        description?: string | undefined;
    }[] | undefined;
    milestone?: {
        number: number;
        id: number;
        title: string;
        state: "open" | "closed";
        description?: string | undefined;
        due_on?: string | undefined;
    } | undefined;
    requested_reviewers?: {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }[] | undefined;
    merged_at?: string | undefined;
}>;
export type GitHubPullRequest = z.infer<typeof GitHubPullRequestSchema>;
export declare const GitHubDiscussionSchema: z.ZodObject<{
    id: z.ZodString;
    number: z.ZodNumber;
    title: z.ZodString;
    body: z.ZodString;
    category: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>;
    author: z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    number: number;
    id: string;
    title: string;
    body: string;
    created_at: string;
    updated_at: string;
    category: {
        id: string;
        name: string;
    };
    author: {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    };
    url: string;
}, {
    number: number;
    id: string;
    title: string;
    body: string;
    created_at: string;
    updated_at: string;
    category: {
        id: string;
        name: string;
    };
    author: {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    };
    url: string;
}>;
export type GitHubDiscussion = z.infer<typeof GitHubDiscussionSchema>;
export declare const GitHubProjectFieldSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    dataType: z.ZodEnum<["TEXT", "NUMBER", "DATE", "SINGLE_SELECT", "ITERATION"]>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    dataType: "TEXT" | "NUMBER" | "DATE" | "SINGLE_SELECT" | "ITERATION";
    options?: {
        id: string;
        name: string;
    }[] | undefined;
}, {
    id: string;
    name: string;
    dataType: "TEXT" | "NUMBER" | "DATE" | "SINGLE_SELECT" | "ITERATION";
    options?: {
        id: string;
        name: string;
    }[] | undefined;
}>;
export type GitHubProjectField = z.infer<typeof GitHubProjectFieldSchema>;
export declare const GitHubProjectItemSchema: z.ZodObject<{
    id: z.ZodString;
    content: z.ZodObject<{
        id: z.ZodString;
        number: z.ZodNumber;
        type: z.ZodEnum<["Issue", "PullRequest"]>;
    }, "strip", z.ZodTypeAny, {
        number: number;
        id: string;
        type: "Issue" | "PullRequest";
    }, {
        number: number;
        id: string;
        type: "Issue" | "PullRequest";
    }>;
    fieldValues: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    id: string;
    content: {
        number: number;
        id: string;
        type: "Issue" | "PullRequest";
    };
    fieldValues: Record<string, unknown>;
}, {
    id: string;
    content: {
        number: number;
        id: string;
        type: "Issue" | "PullRequest";
    };
    fieldValues: Record<string, unknown>;
}>;
export type GitHubProjectItem = z.infer<typeof GitHubProjectItemSchema>;
export declare const GitHubWikiPageSchema: z.ZodObject<{
    title: z.ZodString;
    path: z.ZodString;
    sha: z.ZodString;
    html_url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
    title: string;
    html_url: string;
    sha: string;
}, {
    path: string;
    title: string;
    html_url: string;
    sha: string;
}>;
export type GitHubWikiPage = z.infer<typeof GitHubWikiPageSchema>;
export declare const GitHubWebhookEventSchema: z.ZodObject<{
    action: z.ZodString;
    sender: z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>;
    repository: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        full_name: z.ZodString;
        owner: z.ZodObject<{
            login: z.ZodString;
            id: z.ZodNumber;
            email: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        full_name: string;
        owner: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
    }, {
        id: number;
        name: string;
        full_name: string;
        owner: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    action: string;
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
}, {
    action: string;
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
}>;
export type GitHubWebhookEvent = z.infer<typeof GitHubWebhookEventSchema>;
export declare const IssueWebhookSchema: z.ZodObject<{
    sender: z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>;
    repository: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        full_name: z.ZodString;
        owner: z.ZodObject<{
            login: z.ZodString;
            id: z.ZodNumber;
            email: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        full_name: string;
        owner: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
    }, {
        id: number;
        name: string;
        full_name: string;
        owner: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
    }>;
} & {
    action: z.ZodEnum<["opened", "edited", "closed", "reopened", "assigned", "unassigned", "labeled", "unlabeled"]>;
    issue: z.ZodObject<{
        id: z.ZodNumber;
        number: z.ZodNumber;
        title: z.ZodString;
        body: z.ZodOptional<z.ZodString>;
        state: z.ZodEnum<["open", "closed"]>;
        user: z.ZodObject<{
            login: z.ZodString;
            id: z.ZodNumber;
            email: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }>;
        assignees: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            login: z.ZodString;
            id: z.ZodNumber;
            email: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }>, "many">>>;
        labels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
            color: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
            color: string;
            description?: string | undefined;
        }, {
            id: number;
            name: string;
            color: string;
            description?: string | undefined;
        }>, "many">>>;
        milestone: z.ZodOptional<z.ZodObject<{
            id: z.ZodNumber;
            number: z.ZodNumber;
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            state: z.ZodEnum<["open", "closed"]>;
            due_on: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            description?: string | undefined;
            due_on?: string | undefined;
        }, {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            description?: string | undefined;
            due_on?: string | undefined;
        }>>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        closed_at: z.ZodOptional<z.ZodString>;
        html_url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
        created_at: string;
        updated_at: string;
        html_url: string;
        body?: string | undefined;
        assignees?: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        labels?: {
            id: number;
            name: string;
            color: string;
            description?: string | undefined;
        }[] | undefined;
        milestone?: {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            description?: string | undefined;
            due_on?: string | undefined;
        } | undefined;
        closed_at?: string | undefined;
    }>;
    assignee: z.ZodOptional<z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>>;
    label: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        color: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        color: string;
        description?: string | undefined;
    }, {
        id: number;
        name: string;
        color: string;
        description?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    action: "closed" | "opened" | "edited" | "reopened" | "assigned" | "unassigned" | "labeled" | "unlabeled";
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
    assignee?: {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    } | undefined;
    label?: {
        id: number;
        name: string;
        color: string;
        description?: string | undefined;
    } | undefined;
}, {
    action: "closed" | "opened" | "edited" | "reopened" | "assigned" | "unassigned" | "labeled" | "unlabeled";
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
        created_at: string;
        updated_at: string;
        html_url: string;
        body?: string | undefined;
        assignees?: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        labels?: {
            id: number;
            name: string;
            color: string;
            description?: string | undefined;
        }[] | undefined;
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
    assignee?: {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    } | undefined;
    label?: {
        id: number;
        name: string;
        color: string;
        description?: string | undefined;
    } | undefined;
}>;
export type IssueWebhook = z.infer<typeof IssueWebhookSchema>;
export declare const PullRequestWebhookSchema: z.ZodObject<{
    sender: z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>;
    repository: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        full_name: z.ZodString;
        owner: z.ZodObject<{
            login: z.ZodString;
            id: z.ZodNumber;
            email: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        full_name: string;
        owner: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
    }, {
        id: number;
        name: string;
        full_name: string;
        owner: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
    }>;
} & {
    action: z.ZodEnum<["opened", "edited", "closed", "reopened", "assigned", "review_requested", "review_request_removed", "ready_for_review"]>;
    pull_request: z.ZodObject<{
        id: z.ZodNumber;
        number: z.ZodNumber;
        title: z.ZodString;
        body: z.ZodOptional<z.ZodString>;
        state: z.ZodEnum<["open", "closed"]>;
        user: z.ZodObject<{
            login: z.ZodString;
            id: z.ZodNumber;
            email: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }>;
        assignees: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            login: z.ZodString;
            id: z.ZodNumber;
            email: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }>, "many">>>;
        requested_reviewers: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            login: z.ZodString;
            id: z.ZodNumber;
            email: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }>, "many">>>;
        labels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
            color: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
            color: string;
            description?: string | undefined;
        }, {
            id: number;
            name: string;
            color: string;
            description?: string | undefined;
        }>, "many">>>;
        milestone: z.ZodOptional<z.ZodObject<{
            id: z.ZodNumber;
            number: z.ZodNumber;
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            state: z.ZodEnum<["open", "closed"]>;
            due_on: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            description?: string | undefined;
            due_on?: string | undefined;
        }, {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            description?: string | undefined;
            due_on?: string | undefined;
        }>>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        merged_at: z.ZodOptional<z.ZodString>;
        draft: z.ZodBoolean;
        html_url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
        created_at: string;
        updated_at: string;
        html_url: string;
        draft: boolean;
        body?: string | undefined;
        assignees?: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        labels?: {
            id: number;
            name: string;
            color: string;
            description?: string | undefined;
        }[] | undefined;
        milestone?: {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            description?: string | undefined;
            due_on?: string | undefined;
        } | undefined;
        requested_reviewers?: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        merged_at?: string | undefined;
    }>;
    requested_reviewer: z.ZodOptional<z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    action: "closed" | "opened" | "edited" | "reopened" | "assigned" | "review_requested" | "review_request_removed" | "ready_for_review";
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
    requested_reviewer?: {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    } | undefined;
}, {
    action: "closed" | "opened" | "edited" | "reopened" | "assigned" | "review_requested" | "review_request_removed" | "ready_for_review";
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
        created_at: string;
        updated_at: string;
        html_url: string;
        draft: boolean;
        body?: string | undefined;
        assignees?: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        labels?: {
            id: number;
            name: string;
            color: string;
            description?: string | undefined;
        }[] | undefined;
        milestone?: {
            number: number;
            id: number;
            title: string;
            state: "open" | "closed";
            description?: string | undefined;
            due_on?: string | undefined;
        } | undefined;
        requested_reviewers?: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        merged_at?: string | undefined;
    };
    requested_reviewer?: {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    } | undefined;
}>;
export type PullRequestWebhook = z.infer<typeof PullRequestWebhookSchema>;
export declare const DiscussionWebhookSchema: z.ZodObject<{
    sender: z.ZodObject<{
        login: z.ZodString;
        id: z.ZodNumber;
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }, {
        login: string;
        id: number;
        email?: string | undefined;
        name?: string | undefined;
    }>;
    repository: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        full_name: z.ZodString;
        owner: z.ZodObject<{
            login: z.ZodString;
            id: z.ZodNumber;
            email: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        full_name: string;
        owner: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
    }, {
        id: number;
        name: string;
        full_name: string;
        owner: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
    }>;
} & {
    action: z.ZodEnum<["created", "edited", "deleted", "answered", "category_changed"]>;
    discussion: z.ZodObject<{
        id: z.ZodString;
        number: z.ZodNumber;
        title: z.ZodString;
        body: z.ZodString;
        category: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>;
        author: z.ZodObject<{
            login: z.ZodString;
            id: z.ZodNumber;
            email: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }, {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        }>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        number: number;
        id: string;
        title: string;
        body: string;
        created_at: string;
        updated_at: string;
        category: {
            id: string;
            name: string;
        };
        author: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
        url: string;
    }, {
        number: number;
        id: string;
        title: string;
        body: string;
        created_at: string;
        updated_at: string;
        category: {
            id: string;
            name: string;
        };
        author: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
        url: string;
    }>;
}, "strip", z.ZodTypeAny, {
    action: "edited" | "created" | "deleted" | "answered" | "category_changed";
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
    discussion: {
        number: number;
        id: string;
        title: string;
        body: string;
        created_at: string;
        updated_at: string;
        category: {
            id: string;
            name: string;
        };
        author: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
        url: string;
    };
}, {
    action: "edited" | "created" | "deleted" | "answered" | "category_changed";
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
    discussion: {
        number: number;
        id: string;
        title: string;
        body: string;
        created_at: string;
        updated_at: string;
        category: {
            id: string;
            name: string;
        };
        author: {
            login: string;
            id: number;
            email?: string | undefined;
            name?: string | undefined;
        };
        url: string;
    };
}>;
export type DiscussionWebhook = z.infer<typeof DiscussionWebhookSchema>;
export interface IssueQueryFilter {
    state?: 'open' | 'closed' | 'all';
    assignee?: string;
    creator?: string;
    labels?: string[];
    milestone?: string;
    since?: string;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
}
export interface PullRequestQueryFilter {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated' | 'popularity';
    direction?: 'asc' | 'desc';
}
export interface IssueCreationParams {
    title: string;
    body?: string;
    assignees?: string[];
    labels?: string[];
    milestone?: number;
}
export interface IssueUpdateParams {
    title?: string;
    body?: string;
    state?: 'open' | 'closed';
    assignees?: string[];
    labels?: string[];
    milestone?: number | null;
}
export interface PullRequestReviewRequest {
    reviewers?: string[];
    team_reviewers?: string[];
}
export interface WikiPageParams {
    title: string;
    content: string;
    message?: string;
}
export interface DiscussionParams {
    title: string;
    body: string;
    categoryId: string;
}
//# sourceMappingURL=github.d.ts.map