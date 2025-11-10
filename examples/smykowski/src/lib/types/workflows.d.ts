import { z } from 'zod';
import type { Email } from '@schrute/lib/types/index.js';
import type { GitHubIssue, GitHubPullRequest } from './github.js';
export declare const ActionItemSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    assignee_email: z.ZodOptional<z.ZodString>;
    assignee_name: z.ZodOptional<z.ZodString>;
    assignee_github: z.ZodOptional<z.ZodString>;
    deadline: z.ZodOptional<z.ZodString>;
    deadline_text: z.ZodOptional<z.ZodString>;
    source_message_id: z.ZodString;
    thread_id: z.ZodString;
    extracted_at: z.ZodString;
    confidence: z.ZodNumber;
    status: z.ZodDefault<z.ZodEnum<["pending", "created", "completed", "cancelled"]>>;
    github_issue_number: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "created" | "pending" | "completed" | "cancelled";
    description: string;
    source_message_id: string;
    thread_id: string;
    extracted_at: string;
    confidence: number;
    assignee_email?: string | undefined;
    assignee_name?: string | undefined;
    assignee_github?: string | undefined;
    deadline?: string | undefined;
    deadline_text?: string | undefined;
    github_issue_number?: number | undefined;
}, {
    id: string;
    description: string;
    source_message_id: string;
    thread_id: string;
    extracted_at: string;
    confidence: number;
    status?: "created" | "pending" | "completed" | "cancelled" | undefined;
    assignee_email?: string | undefined;
    assignee_name?: string | undefined;
    assignee_github?: string | undefined;
    deadline?: string | undefined;
    deadline_text?: string | undefined;
    github_issue_number?: number | undefined;
}>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export declare const CommitmentSchema: z.ZodObject<{
    id: z.ZodString;
    commitment_text: z.ZodString;
    person_email: z.ZodString;
    person_name: z.ZodOptional<z.ZodString>;
    person_github: z.ZodOptional<z.ZodString>;
    deadline: z.ZodOptional<z.ZodString>;
    source_message_id: z.ZodString;
    thread_id: z.ZodString;
    extracted_at: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["active", "reminded", "overdue", "completed", "cancelled"]>>;
    github_issue_number: z.ZodOptional<z.ZodNumber>;
    reminder_count: z.ZodDefault<z.ZodNumber>;
    last_reminder_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "completed" | "cancelled" | "active" | "reminded" | "overdue";
    source_message_id: string;
    thread_id: string;
    extracted_at: string;
    commitment_text: string;
    person_email: string;
    reminder_count: number;
    deadline?: string | undefined;
    github_issue_number?: number | undefined;
    person_name?: string | undefined;
    person_github?: string | undefined;
    last_reminder_at?: string | undefined;
}, {
    id: string;
    source_message_id: string;
    thread_id: string;
    extracted_at: string;
    commitment_text: string;
    person_email: string;
    status?: "completed" | "cancelled" | "active" | "reminded" | "overdue" | undefined;
    deadline?: string | undefined;
    github_issue_number?: number | undefined;
    person_name?: string | undefined;
    person_github?: string | undefined;
    reminder_count?: number | undefined;
    last_reminder_at?: string | undefined;
}>;
export type Commitment = z.infer<typeof CommitmentSchema>;
export declare const DependencySchema: z.ZodObject<{
    id: z.ZodString;
    blocker_issue_number: z.ZodNumber;
    blocked_issue_number: z.ZodNumber;
    dependency_type: z.ZodDefault<z.ZodEnum<["blocks", "blocked_by", "related"]>>;
    created_at: z.ZodString;
    resolved_at: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "resolved"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "active" | "resolved";
    created_at: string;
    blocker_issue_number: number;
    blocked_issue_number: number;
    dependency_type: "blocks" | "blocked_by" | "related";
    resolved_at?: string | undefined;
}, {
    id: string;
    created_at: string;
    blocker_issue_number: number;
    blocked_issue_number: number;
    status?: "active" | "resolved" | undefined;
    dependency_type?: "blocks" | "blocked_by" | "related" | undefined;
    resolved_at?: string | undefined;
}>;
export type Dependency = z.infer<typeof DependencySchema>;
export declare const ExpertiseAreaSchema: z.ZodObject<{
    area: z.ZodString;
    confidence: z.ZodNumber;
    evidence: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["commit", "review", "issue", "explicit"]>;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "issue" | "commit" | "review" | "explicit";
        count: number;
    }, {
        type: "issue" | "commit" | "review" | "explicit";
        count: number;
    }>, "many">;
    last_updated: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    area: string;
    evidence: {
        type: "issue" | "commit" | "review" | "explicit";
        count: number;
    }[];
    last_updated: string;
}, {
    confidence: number;
    area: string;
    evidence: {
        type: "issue" | "commit" | "review" | "explicit";
        count: number;
    }[];
    last_updated: string;
}>;
export type ExpertiseArea = z.infer<typeof ExpertiseAreaSchema>;
export declare const TeamMemberSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    github_username: z.ZodString;
    expertise_areas: z.ZodDefault<z.ZodArray<z.ZodObject<{
        area: z.ZodString;
        confidence: z.ZodNumber;
        evidence: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["commit", "review", "issue", "explicit"]>;
            count: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: "issue" | "commit" | "review" | "explicit";
            count: number;
        }, {
            type: "issue" | "commit" | "review" | "explicit";
            count: number;
        }>, "many">;
        last_updated: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        area: string;
        evidence: {
            type: "issue" | "commit" | "review" | "explicit";
            count: number;
        }[];
        last_updated: string;
    }, {
        confidence: number;
        area: string;
        evidence: {
            type: "issue" | "commit" | "review" | "explicit";
            count: number;
        }[];
        last_updated: string;
    }>, "many">>;
    current_workload: z.ZodDefault<z.ZodNumber>;
    assigned_issues: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    review_stats: z.ZodObject<{
        total_reviews: z.ZodDefault<z.ZodNumber>;
        avg_review_time_hours: z.ZodDefault<z.ZodNumber>;
        recent_reviews: z.ZodDefault<z.ZodArray<z.ZodObject<{
            pr_number: z.ZodNumber;
            reviewed_at: z.ZodString;
            turnaround_hours: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            pr_number: number;
            reviewed_at: string;
            turnaround_hours: number;
        }, {
            pr_number: number;
            reviewed_at: string;
            turnaround_hours: number;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        total_reviews: number;
        avg_review_time_hours: number;
        recent_reviews: {
            pr_number: number;
            reviewed_at: string;
            turnaround_hours: number;
        }[];
    }, {
        total_reviews?: number | undefined;
        avg_review_time_hours?: number | undefined;
        recent_reviews?: {
            pr_number: number;
            reviewed_at: string;
            turnaround_hours: number;
        }[] | undefined;
    }>;
    vacation_schedule: z.ZodOptional<z.ZodObject<{
        is_on_vacation: z.ZodDefault<z.ZodBoolean>;
        vacation_start: z.ZodOptional<z.ZodString>;
        vacation_end: z.ZodOptional<z.ZodString>;
        backup_person: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        is_on_vacation: boolean;
        vacation_start?: string | undefined;
        vacation_end?: string | undefined;
        backup_person?: string | undefined;
    }, {
        is_on_vacation?: boolean | undefined;
        vacation_start?: string | undefined;
        vacation_end?: string | undefined;
        backup_person?: string | undefined;
    }>>;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    updated_at: string;
    github_username: string;
    expertise_areas: {
        confidence: number;
        area: string;
        evidence: {
            type: "issue" | "commit" | "review" | "explicit";
            count: number;
        }[];
        last_updated: string;
    }[];
    current_workload: number;
    assigned_issues: number[];
    review_stats: {
        total_reviews: number;
        avg_review_time_hours: number;
        recent_reviews: {
            pr_number: number;
            reviewed_at: string;
            turnaround_hours: number;
        }[];
    };
    vacation_schedule?: {
        is_on_vacation: boolean;
        vacation_start?: string | undefined;
        vacation_end?: string | undefined;
        backup_person?: string | undefined;
    } | undefined;
}, {
    email: string;
    name: string;
    updated_at: string;
    github_username: string;
    review_stats: {
        total_reviews?: number | undefined;
        avg_review_time_hours?: number | undefined;
        recent_reviews?: {
            pr_number: number;
            reviewed_at: string;
            turnaround_hours: number;
        }[] | undefined;
    };
    expertise_areas?: {
        confidence: number;
        area: string;
        evidence: {
            type: "issue" | "commit" | "review" | "explicit";
            count: number;
        }[];
        last_updated: string;
    }[] | undefined;
    current_workload?: number | undefined;
    assigned_issues?: number[] | undefined;
    vacation_schedule?: {
        is_on_vacation?: boolean | undefined;
        vacation_start?: string | undefined;
        vacation_end?: string | undefined;
        backup_person?: string | undefined;
    } | undefined;
}>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
export declare const ReminderSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["deadline", "pr_review", "stale_issue", "commitment", "vacation_restore", "daily_standup"]>;
    target_id: z.ZodString;
    recipient_email: z.ZodString;
    recipient_github: z.ZodOptional<z.ZodString>;
    scheduled_for: z.ZodString;
    message: z.ZodString;
    escalate_to: z.ZodOptional<z.ZodString>;
    sent: z.ZodDefault<z.ZodBoolean>;
    sent_at: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    message: string;
    type: "commitment" | "deadline" | "pr_review" | "stale_issue" | "vacation_restore" | "daily_standup";
    target_id: string;
    recipient_email: string;
    scheduled_for: string;
    sent: boolean;
    recipient_github?: string | undefined;
    escalate_to?: string | undefined;
    sent_at?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    message: string;
    type: "commitment" | "deadline" | "pr_review" | "stale_issue" | "vacation_restore" | "daily_standup";
    target_id: string;
    recipient_email: string;
    scheduled_for: string;
    recipient_github?: string | undefined;
    escalate_to?: string | undefined;
    sent?: boolean | undefined;
    sent_at?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type Reminder = z.infer<typeof ReminderSchema>;
export interface MeetingFollowupContext {
    email: Email;
    action_items: ActionItem[];
    decisions: string[];
    attendees: string[];
}
export interface DeadlineTrackingContext {
    commitments: Commitment[];
    upcoming_deadlines: Array<{
        commitment: Commitment;
        days_until_deadline: number;
        issue?: GitHubIssue;
    }>;
    overdue: Array<{
        commitment: Commitment;
        days_overdue: number;
        issue?: GitHubIssue;
    }>;
}
export interface PRReviewContext {
    pr: GitHubPullRequest;
    age_hours: number;
    suggested_reviewers: Array<{
        github_username: string;
        email?: string;
        confidence: number;
        reason: string;
    }>;
    reminder_count: number;
}
export interface ResponsibilityHandoffContext {
    person: TeamMember;
    vacation_start: string;
    vacation_end: string;
    assigned_issues: GitHubIssue[];
    assigned_prs: GitHubPullRequest[];
    suggested_reassignments: Array<{
        issue_or_pr: GitHubIssue | GitHubPullRequest;
        suggested_assignee: TeamMember;
        reason: string;
    }>;
}
export interface WorkloadBalanceContext {
    team_members: TeamMember[];
    avg_workload: number;
    imbalanced_members: Array<{
        member: TeamMember;
        workload_ratio: number;
        suggested_reassignments: Array<{
            issue: GitHubIssue;
            suggested_assignee: TeamMember;
        }>;
    }>;
}
export interface StatusSynthesisContext {
    project_name: string;
    total_issues: number;
    open_issues: number;
    closed_issues: number;
    completion_percentage: number;
    in_progress: GitHubIssue[];
    blocked: Array<{
        issue: GitHubIssue;
        blocker: string;
    }>;
    at_risk: Array<{
        issue: GitHubIssue;
        risk_reason: string;
    }>;
    next_actions: string[];
    sprint_deadline?: string;
}
export declare const MetricSchema: z.ZodObject<{
    id: z.ZodString;
    metric_type: z.ZodEnum<["pr_review_time", "issue_cycle_time", "velocity", "team_workload", "deadline_adherence", "stale_pr_count"]>;
    value: z.ZodNumber;
    period: z.ZodEnum<["daily", "weekly", "monthly", "sprint"]>;
    timestamp: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    value: number;
    metric_type: "pr_review_time" | "issue_cycle_time" | "velocity" | "team_workload" | "deadline_adherence" | "stale_pr_count";
    period: "daily" | "weekly" | "monthly" | "sprint";
    timestamp: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    value: number;
    metric_type: "pr_review_time" | "issue_cycle_time" | "velocity" | "team_workload" | "deadline_adherence" | "stale_pr_count";
    period: "daily" | "weekly" | "monthly" | "sprint";
    timestamp: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export type Metric = z.infer<typeof MetricSchema>;
export interface ProcessOptimizationInsight {
    insight_type: 'bottleneck' | 'improvement' | 'pattern';
    title: string;
    description: string;
    metrics: Metric[];
    suggested_action: string;
    confidence: number;
}
export interface TeamStatusData {
    team_members: TeamMember[];
    current_sprint?: {
        name: string;
        start_date: string;
        end_date: string;
        goals: string[];
    };
    on_vacation: TeamMember[];
    workload_summary: {
        member: TeamMember;
        assigned_issues: GitHubIssue[];
    }[];
}
export interface OrgChartData {
    team_lead: TeamMember;
    team_members: TeamMember[];
    expertise_matrix: {
        area: string;
        experts: TeamMember[];
    }[];
}
export interface ProcessDocData {
    process_name: string;
    description: string;
    steps: string[];
    roles: {
        role: string;
        responsibilities: string[];
    }[];
    last_updated: string;
}
export interface DecisionLogEntry {
    decision_id: string;
    title: string;
    description: string;
    decision_date: string;
    participants: string[];
    rationale: string;
    related_issues: number[];
    related_discussions: number[];
}
export declare const SmykowskiConfigSchema: z.ZodObject<{
    github_repository: z.ZodString;
    github_token: z.ZodString;
    team_lead_email: z.ZodString;
    pr_review_sla_hours: z.ZodDefault<z.ZodNumber>;
    stale_pr_threshold_hours: z.ZodDefault<z.ZodNumber>;
    deadline_reminder_days: z.ZodDefault<z.ZodNumber>;
    workload_imbalance_threshold: z.ZodDefault<z.ZodNumber>;
    reminder_schedules: z.ZodObject<{
        pr_review: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        deadline: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        deadline: number[];
        pr_review: number[];
    }, {
        deadline?: number[] | undefined;
        pr_review?: number[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    github_repository: string;
    github_token: string;
    team_lead_email: string;
    pr_review_sla_hours: number;
    stale_pr_threshold_hours: number;
    deadline_reminder_days: number;
    workload_imbalance_threshold: number;
    reminder_schedules: {
        deadline: number[];
        pr_review: number[];
    };
}, {
    github_repository: string;
    github_token: string;
    team_lead_email: string;
    reminder_schedules: {
        deadline?: number[] | undefined;
        pr_review?: number[] | undefined;
    };
    pr_review_sla_hours?: number | undefined;
    stale_pr_threshold_hours?: number | undefined;
    deadline_reminder_days?: number | undefined;
    workload_imbalance_threshold?: number | undefined;
}>;
export type SmykowskiConfig = z.infer<typeof SmykowskiConfigSchema>;
//# sourceMappingURL=workflows.d.ts.map