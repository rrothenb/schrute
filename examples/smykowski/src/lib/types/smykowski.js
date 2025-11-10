import { z } from 'zod';
// ============================================================================
// Coordination Event Types
// ============================================================================
export const CoordinationEventSchema = z.object({
    id: z.string(),
    event_type: z.enum([
        'meeting_processed',
        'issue_created',
        'deadline_approaching',
        'pr_needs_review',
        'commitment_overdue',
        'vacation_handoff',
        'workload_imbalanced',
        'process_bottleneck',
    ]),
    timestamp: z.string().datetime(),
    source: z.object({
        type: z.enum(['email', 'github_webhook', 'scheduler']),
        id: z.string(),
    }),
    metadata: z.record(z.unknown()),
    actions_taken: z.array(z.object({
        action: z.string(),
        result: z.string(),
        success: z.boolean(),
    })),
});
// ============================================================================
// Scheduler Task Types
// ============================================================================
export const SchedulerTaskSchema = z.object({
    task_type: z.enum([
        'deadline_check',
        'pr_review_check',
        'stale_issue_check',
        'daily_standup',
        'weekly_metrics',
        'workload_balance',
    ]),
    schedule: z.string(), // Cron expression
    last_run: z.string().datetime().optional(),
    next_run: z.string().datetime(),
    enabled: z.boolean().default(true),
});
// ============================================================================
// Storage Keys (DynamoDB)
// ============================================================================
export const SMYKOWSKI_TABLES = {
    COMMITMENTS: 'smykowski-commitments',
    REMINDERS: 'smykowski-reminders',
    TEAM_STATE: 'smykowski-team-state',
    METRICS: 'smykowski-metrics',
    CONFIG: 'smykowski-config',
    COORDINATION_LOG: 'smykowski-coordination-log',
};
// ============================================================================
// Error Types
// ============================================================================
export class SmykowskiError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'SmykowskiError';
    }
}
export class GitHubAPIError extends SmykowskiError {
    constructor(message, details) {
        super(message, 'GITHUB_API_ERROR', details);
        this.name = 'GitHubAPIError';
    }
}
export class ExtractionError extends SmykowskiError {
    constructor(message, details) {
        super(message, 'EXTRACTION_ERROR', details);
        this.name = 'ExtractionError';
    }
}
export class WorkflowError extends SmykowskiError {
    constructor(message, details) {
        super(message, 'WORKFLOW_ERROR', details);
        this.name = 'WorkflowError';
    }
}
//# sourceMappingURL=smykowski.js.map