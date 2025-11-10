import { z } from 'zod'
import type { Email } from '@schrute/lib/types/index.js'
import type { GitHubIssue, GitHubPullRequest } from './github.js'

// ============================================================================
// Action Item Types
// ============================================================================

export const ActionItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  assignee_email: z.string().email().optional(),
  assignee_name: z.string().optional(),
  assignee_github: z.string().optional(),
  deadline: z.string().datetime().optional(),
  deadline_text: z.string().optional(), // Original text like "by Friday"
  source_message_id: z.string(),
  thread_id: z.string(),
  extracted_at: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  status: z.enum(['pending', 'created', 'completed', 'cancelled']).default('pending'),
  github_issue_number: z.number().optional(),
})

export type ActionItem = z.infer<typeof ActionItemSchema>

// ============================================================================
// Commitment Types
// ============================================================================

export const CommitmentSchema = z.object({
  id: z.string(),
  commitment_text: z.string(),
  person_email: z.string().email(),
  person_name: z.string().optional(),
  person_github: z.string().optional(),
  deadline: z.string().datetime().optional(),
  source_message_id: z.string(),
  thread_id: z.string(),
  extracted_at: z.string().datetime(),
  status: z.enum([
    'active',
    'reminded',
    'overdue',
    'completed',
    'cancelled',
  ]).default('active'),
  github_issue_number: z.number().optional(),
  reminder_count: z.number().default(0),
  last_reminder_at: z.string().datetime().optional(),
})

export type Commitment = z.infer<typeof CommitmentSchema>

// ============================================================================
// Dependency Types
// ============================================================================

export const DependencySchema = z.object({
  id: z.string(),
  blocker_issue_number: z.number(),
  blocked_issue_number: z.number(),
  dependency_type: z.enum(['blocks', 'blocked_by', 'related']).default('blocks'),
  created_at: z.string().datetime(),
  resolved_at: z.string().datetime().optional(),
  status: z.enum(['active', 'resolved']).default('active'),
})

export type Dependency = z.infer<typeof DependencySchema>

// ============================================================================
// Team Member Types
// ============================================================================

export const ExpertiseAreaSchema = z.object({
  area: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    type: z.enum(['commit', 'review', 'issue', 'explicit']),
    count: z.number(),
  })),
  last_updated: z.string().datetime(),
})

export type ExpertiseArea = z.infer<typeof ExpertiseAreaSchema>

export const TeamMemberSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  github_username: z.string(),
  expertise_areas: z.array(ExpertiseAreaSchema).default([]),
  current_workload: z.number().default(0), // Number of open assigned issues
  assigned_issues: z.array(z.number()).default([]),
  review_stats: z.object({
    total_reviews: z.number().default(0),
    avg_review_time_hours: z.number().default(0),
    recent_reviews: z.array(z.object({
      pr_number: z.number(),
      reviewed_at: z.string().datetime(),
      turnaround_hours: z.number(),
    })).default([]),
  }),
  vacation_schedule: z.object({
    is_on_vacation: z.boolean().default(false),
    vacation_start: z.string().datetime().optional(),
    vacation_end: z.string().datetime().optional(),
    backup_person: z.string().optional(),
  }).optional(),
  updated_at: z.string().datetime(),
})

export type TeamMember = z.infer<typeof TeamMemberSchema>

// ============================================================================
// Reminder Types
// ============================================================================

export const ReminderSchema = z.object({
  id: z.string(),
  type: z.enum([
    'deadline',
    'pr_review',
    'stale_issue',
    'commitment',
    'vacation_restore',
    'daily_standup',
  ]),
  target_id: z.string(), // Issue/PR number or commitment ID
  recipient_email: z.string().email(),
  recipient_github: z.string().optional(),
  scheduled_for: z.string().datetime(),
  message: z.string(),
  escalate_to: z.string().email().optional(),
  sent: z.boolean().default(false),
  sent_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type Reminder = z.infer<typeof ReminderSchema>

// ============================================================================
// Workflow Context Types
// ============================================================================

export interface MeetingFollowupContext {
  email: Email
  action_items: ActionItem[]
  decisions: string[]
  attendees: string[]
}

export interface DeadlineTrackingContext {
  commitments: Commitment[]
  upcoming_deadlines: Array<{
    commitment: Commitment
    days_until_deadline: number
    issue?: GitHubIssue
  }>
  overdue: Array<{
    commitment: Commitment
    days_overdue: number
    issue?: GitHubIssue
  }>
}

export interface PRReviewContext {
  pr: GitHubPullRequest
  age_hours: number
  suggested_reviewers: Array<{
    github_username: string
    email?: string
    confidence: number
    reason: string
  }>
  reminder_count: number
}

export interface ResponsibilityHandoffContext {
  person: TeamMember
  vacation_start: string
  vacation_end: string
  assigned_issues: GitHubIssue[]
  assigned_prs: GitHubPullRequest[]
  suggested_reassignments: Array<{
    issue_or_pr: GitHubIssue | GitHubPullRequest
    suggested_assignee: TeamMember
    reason: string
  }>
}

export interface WorkloadBalanceContext {
  team_members: TeamMember[]
  avg_workload: number
  imbalanced_members: Array<{
    member: TeamMember
    workload_ratio: number // Compared to average
    suggested_reassignments: Array<{
      issue: GitHubIssue
      suggested_assignee: TeamMember
    }>
  }>
}

export interface StatusSynthesisContext {
  project_name: string
  total_issues: number
  open_issues: number
  closed_issues: number
  completion_percentage: number
  in_progress: GitHubIssue[]
  blocked: Array<{
    issue: GitHubIssue
    blocker: string
  }>
  at_risk: Array<{
    issue: GitHubIssue
    risk_reason: string
  }>
  next_actions: string[]
  sprint_deadline?: string
}

// ============================================================================
// Metrics Types
// ============================================================================

export const MetricSchema = z.object({
  id: z.string(),
  metric_type: z.enum([
    'pr_review_time',
    'issue_cycle_time',
    'velocity',
    'team_workload',
    'deadline_adherence',
    'stale_pr_count',
  ]),
  value: z.number(),
  period: z.enum(['daily', 'weekly', 'monthly', 'sprint']),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
})

export type Metric = z.infer<typeof MetricSchema>

export interface ProcessOptimizationInsight {
  insight_type: 'bottleneck' | 'improvement' | 'pattern'
  title: string
  description: string
  metrics: Metric[]
  suggested_action: string
  confidence: number
}

// ============================================================================
// Wiki Page Types
// ============================================================================

export interface TeamStatusData {
  team_members: TeamMember[]
  current_sprint?: {
    name: string
    start_date: string
    end_date: string
    goals: string[]
  }
  on_vacation: TeamMember[]
  workload_summary: {
    member: TeamMember
    assigned_issues: GitHubIssue[]
  }[]
}

export interface OrgChartData {
  team_lead: TeamMember
  team_members: TeamMember[]
  expertise_matrix: {
    area: string
    experts: TeamMember[]
  }[]
}

export interface ProcessDocData {
  process_name: string
  description: string
  steps: string[]
  roles: {
    role: string
    responsibilities: string[]
  }[]
  last_updated: string
}

export interface DecisionLogEntry {
  decision_id: string
  title: string
  description: string
  decision_date: string
  participants: string[]
  rationale: string
  related_issues: number[]
  related_discussions: number[]
}

// ============================================================================
// Configuration Types
// ============================================================================

export const SmykowskiConfigSchema = z.object({
  github_repository: z.string(), // owner/repo
  github_token: z.string(),
  team_lead_email: z.string().email(),
  pr_review_sla_hours: z.number().default(24),
  stale_pr_threshold_hours: z.number().default(72),
  deadline_reminder_days: z.number().default(2),
  workload_imbalance_threshold: z.number().default(2.0),
  reminder_schedules: z.object({
    pr_review: z.array(z.number()).default([24, 48, 72]), // Hours
    deadline: z.array(z.number()).default([2, 1, 0]), // Days before
  }),
})

export type SmykowskiConfig = z.infer<typeof SmykowskiConfigSchema>
