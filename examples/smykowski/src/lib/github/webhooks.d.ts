import type { GitHubWebhookEvent, IssueWebhook, PullRequestWebhook, DiscussionWebhook } from '~/lib/types/index.js';
/**
 * WebhookManager handles GitHub webhook signature verification and payload parsing
 */
export declare class WebhookManager {
    private secret;
    constructor(secret: string);
    /**
     * Verify webhook signature
     */
    verifySignature(payload: string, signature: string): boolean;
    /**
     * Parse and validate webhook payload
     */
    parsePayload<T = GitHubWebhookEvent>(payload: string | object): T;
    /**
     * Get webhook event type from headers
     */
    getEventType(headers: Record<string, string | undefined>): string | null;
    /**
     * Parse issue webhook
     */
    parseIssueWebhook(payload: string | object): IssueWebhook;
    /**
     * Parse pull request webhook
     */
    parsePullRequestWebhook(payload: string | object): PullRequestWebhook;
    /**
     * Parse discussion webhook
     */
    parseDiscussionWebhook(payload: string | object): DiscussionWebhook;
    /**
     * Validate webhook headers
     */
    validateHeaders(headers: Record<string, string | undefined>): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Extract relevant information from issue webhook
     */
    extractIssueInfo(webhook: IssueWebhook): {
        action: "closed" | "opened" | "edited" | "reopened" | "assigned" | "unassigned" | "labeled" | "unlabeled";
        issueNumber: number;
        issueTitle: string;
        issueState: "open" | "closed";
        author: string;
        assignees: string[];
        labels: string[];
        sender: string;
    };
    /**
     * Extract relevant information from PR webhook
     */
    extractPRInfo(webhook: PullRequestWebhook): {
        action: "closed" | "opened" | "edited" | "reopened" | "assigned" | "review_requested" | "review_request_removed" | "ready_for_review";
        prNumber: number;
        prTitle: string;
        prState: "open" | "closed";
        author: string;
        assignees: string[];
        requestedReviewers: string[];
        draft: boolean;
        sender: string;
    };
    /**
     * Check if webhook is for an issue (not a PR)
     */
    isIssue(eventType: string, payload: any): boolean;
    /**
     * Check if webhook is for a pull request
     */
    isPullRequest(eventType: string): boolean;
    /**
     * Check if webhook is for a discussion
     */
    isDiscussion(eventType: string): boolean;
}
//# sourceMappingURL=webhooks.d.ts.map