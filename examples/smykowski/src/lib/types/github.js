import { z } from 'zod';
// ============================================================================
// GitHub Entity Types
// ============================================================================
export const GitHubUserSchema = z.object({
    login: z.string(),
    id: z.number(),
    email: z.string().email().optional(),
    name: z.string().optional(),
});
export const GitHubLabelSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string(),
    description: z.string().optional(),
});
export const GitHubMilestoneSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    description: z.string().optional(),
    state: z.enum(['open', 'closed']),
    due_on: z.string().datetime().optional(),
});
export const GitHubIssueSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().optional(),
    state: z.enum(['open', 'closed']),
    user: GitHubUserSchema,
    assignees: z.array(GitHubUserSchema).optional().default([]),
    labels: z.array(GitHubLabelSchema).optional().default([]),
    milestone: GitHubMilestoneSchema.optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    closed_at: z.string().datetime().optional(),
    html_url: z.string().url(),
});
export const GitHubPullRequestSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().optional(),
    state: z.enum(['open', 'closed']),
    user: GitHubUserSchema,
    assignees: z.array(GitHubUserSchema).optional().default([]),
    requested_reviewers: z.array(GitHubUserSchema).optional().default([]),
    labels: z.array(GitHubLabelSchema).optional().default([]),
    milestone: GitHubMilestoneSchema.optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    merged_at: z.string().datetime().optional(),
    draft: z.boolean(),
    html_url: z.string().url(),
});
export const GitHubDiscussionSchema = z.object({
    id: z.string(),
    number: z.number(),
    title: z.string(),
    body: z.string(),
    category: z.object({
        id: z.string(),
        name: z.string(),
    }),
    author: GitHubUserSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    url: z.string().url(),
});
export const GitHubProjectFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    dataType: z.enum(['TEXT', 'NUMBER', 'DATE', 'SINGLE_SELECT', 'ITERATION']),
    options: z.array(z.object({
        id: z.string(),
        name: z.string(),
    })).optional(),
});
export const GitHubProjectItemSchema = z.object({
    id: z.string(),
    content: z.object({
        id: z.string(),
        number: z.number(),
        type: z.enum(['Issue', 'PullRequest']),
    }),
    fieldValues: z.record(z.unknown()),
});
export const GitHubWikiPageSchema = z.object({
    title: z.string(),
    path: z.string(),
    sha: z.string(),
    html_url: z.string().url(),
});
// ============================================================================
// GitHub Webhook Event Types
// ============================================================================
export const GitHubWebhookEventSchema = z.object({
    action: z.string(),
    sender: GitHubUserSchema,
    repository: z.object({
        id: z.number(),
        name: z.string(),
        full_name: z.string(),
        owner: GitHubUserSchema,
    }),
});
export const IssueWebhookSchema = GitHubWebhookEventSchema.extend({
    action: z.enum([
        'opened',
        'edited',
        'closed',
        'reopened',
        'assigned',
        'unassigned',
        'labeled',
        'unlabeled',
    ]),
    issue: GitHubIssueSchema,
    assignee: GitHubUserSchema.optional(),
    label: GitHubLabelSchema.optional(),
});
export const PullRequestWebhookSchema = GitHubWebhookEventSchema.extend({
    action: z.enum([
        'opened',
        'edited',
        'closed',
        'reopened',
        'assigned',
        'review_requested',
        'review_request_removed',
        'ready_for_review',
    ]),
    pull_request: GitHubPullRequestSchema,
    requested_reviewer: GitHubUserSchema.optional(),
});
export const DiscussionWebhookSchema = GitHubWebhookEventSchema.extend({
    action: z.enum(['created', 'edited', 'deleted', 'answered', 'category_changed']),
    discussion: GitHubDiscussionSchema,
});
//# sourceMappingURL=github.js.map