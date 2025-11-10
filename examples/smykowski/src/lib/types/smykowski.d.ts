import { z } from 'zod';
import type { Email, SpeechAct } from '@schrute/lib/types/index.js';
import type { GitHubIssue, GitHubPullRequest } from './github.js';
import type { ActionItem, Commitment } from './workflows.js';
export declare const CoordinationEventSchema: z.ZodObject<{
    id: z.ZodString;
    event_type: z.ZodEnum<["meeting_processed", "issue_created", "deadline_approaching", "pr_needs_review", "commitment_overdue", "vacation_handoff", "workload_imbalanced", "process_bottleneck"]>;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        type: z.ZodEnum<["email", "github_webhook", "scheduler"]>;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: "email" | "github_webhook" | "scheduler";
    }, {
        id: string;
        type: "email" | "github_webhook" | "scheduler";
    }>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    actions_taken: z.ZodArray<z.ZodObject<{
        action: z.ZodString;
        result: z.ZodString;
        success: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        action: string;
        result: string;
        success: boolean;
    }, {
        action: string;
        result: string;
        success: boolean;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    metadata: Record<string, unknown>;
    timestamp: string;
    event_type: "meeting_processed" | "issue_created" | "deadline_approaching" | "pr_needs_review" | "commitment_overdue" | "vacation_handoff" | "workload_imbalanced" | "process_bottleneck";
    source: {
        id: string;
        type: "email" | "github_webhook" | "scheduler";
    };
    actions_taken: {
        action: string;
        result: string;
        success: boolean;
    }[];
}, {
    id: string;
    metadata: Record<string, unknown>;
    timestamp: string;
    event_type: "meeting_processed" | "issue_created" | "deadline_approaching" | "pr_needs_review" | "commitment_overdue" | "vacation_handoff" | "workload_imbalanced" | "process_bottleneck";
    source: {
        id: string;
        type: "email" | "github_webhook" | "scheduler";
    };
    actions_taken: {
        action: string;
        result: string;
        success: boolean;
    }[];
}>;
export type CoordinationEvent = z.infer<typeof CoordinationEventSchema>;
export interface EmailProcessingResult {
    email: Email;
    speech_acts: SpeechAct[];
    action_items: ActionItem[];
    commitments: Commitment[];
    decisions: string[];
    created_issues: GitHubIssue[];
    created_discussions: number[];
    wiki_updates: string[];
    reminders_scheduled: number;
    should_respond: boolean;
    response_sent?: boolean;
    coordination_event?: CoordinationEvent;
}
export interface GitHubEventProcessingResult {
    event_type: string;
    event_id: string;
    actions_taken: Array<{
        action: string;
        success: boolean;
        details: string;
    }>;
    reminders_scheduled: number;
    wiki_updated: boolean;
    email_sent: boolean;
    coordination_event?: CoordinationEvent;
}
export declare const SchedulerTaskSchema: z.ZodObject<{
    task_type: z.ZodEnum<["deadline_check", "pr_review_check", "stale_issue_check", "daily_standup", "weekly_metrics", "workload_balance"]>;
    schedule: z.ZodString;
    last_run: z.ZodOptional<z.ZodString>;
    next_run: z.ZodString;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    task_type: "daily_standup" | "deadline_check" | "pr_review_check" | "stale_issue_check" | "weekly_metrics" | "workload_balance";
    schedule: string;
    next_run: string;
    enabled: boolean;
    last_run?: string | undefined;
}, {
    task_type: "daily_standup" | "deadline_check" | "pr_review_check" | "stale_issue_check" | "weekly_metrics" | "workload_balance";
    schedule: string;
    next_run: string;
    last_run?: string | undefined;
    enabled?: boolean | undefined;
}>;
export type SchedulerTask = z.infer<typeof SchedulerTaskSchema>;
export interface SchedulerTaskResult {
    task_type: string;
    execution_time: string;
    duration_ms: number;
    items_processed: number;
    actions_taken: Array<{
        action: string;
        count: number;
    }>;
    errors: Array<{
        error: string;
        context: string;
    }>;
    next_run: string;
}
export interface ResponseContext {
    trigger: {
        type: 'email' | 'github_webhook' | 'scheduler';
        id: string;
        timestamp: string;
    };
    recipient: {
        email: string;
        name?: string;
        github_username?: string;
    };
    content_type: 'email' | 'github_comment' | 'github_discussion' | 'wiki_update';
    context_data: {
        issues?: GitHubIssue[];
        prs?: GitHubPullRequest[];
        action_items?: ActionItem[];
        commitments?: Commitment[];
        team_members?: any[];
        metrics?: any[];
    };
    tone: 'friendly' | 'professional' | 'urgent' | 'celebratory';
    personality: string;
}
export interface WikiUpdateRequest {
    page_name: string;
    update_type: 'create' | 'update' | 'append';
    content?: string;
    section?: string;
    data?: Record<string, unknown>;
    commit_message: string;
}
export interface WikiUpdateResult {
    success: boolean;
    page_name: string;
    page_url?: string;
    error?: string;
}
export interface SmykowskiQueryContext {
    github_issues?: GitHubIssue[];
    github_prs?: GitHubPullRequest[];
    team_members?: any[];
    recent_metrics?: any[];
    wiki_pages?: string[];
}
export interface SchruteBridgeContext {
    speech_acts: SpeechAct[];
    privacy_filtered: boolean;
    memory_context: any;
    personality: string;
}
export declare const SMYKOWSKI_TABLES: {
    readonly COMMITMENTS: "smykowski-commitments";
    readonly REMINDERS: "smykowski-reminders";
    readonly TEAM_STATE: "smykowski-team-state";
    readonly METRICS: "smykowski-metrics";
    readonly CONFIG: "smykowski-config";
    readonly COORDINATION_LOG: "smykowski-coordination-log";
};
export declare class SmykowskiError extends Error {
    code: string;
    details?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, details?: Record<string, unknown> | undefined);
}
export declare class GitHubAPIError extends SmykowskiError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ExtractionError extends SmykowskiError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class WorkflowError extends SmykowskiError {
    constructor(message: string, details?: Record<string, unknown>);
}
//# sourceMappingURL=smykowski.d.ts.map