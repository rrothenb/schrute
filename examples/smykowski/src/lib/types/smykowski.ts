import { z } from 'zod'
import type { Email, SpeechAct } from '@schrute/lib/types/index.js'
import type { GitHubIssue, GitHubPullRequest } from './github.js'
import type { ActionItem, Commitment } from './workflows.js'

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
})

export type CoordinationEvent = z.infer<typeof CoordinationEventSchema>

// ============================================================================
// Email Processing Result Types
// ============================================================================

export interface EmailProcessingResult {
  email: Email
  speech_acts: SpeechAct[]
  action_items: ActionItem[]
  commitments: Commitment[]
  decisions: string[]
  created_issues: GitHubIssue[]
  created_discussions: number[]
  wiki_updates: string[]
  reminders_scheduled: number
  should_respond: boolean
  response_sent?: boolean
  coordination_event?: CoordinationEvent
}

// ============================================================================
// GitHub Event Processing Result Types
// ============================================================================

export interface GitHubEventProcessingResult {
  event_type: string
  event_id: string
  actions_taken: Array<{
    action: string
    success: boolean
    details: string
  }>
  reminders_scheduled: number
  wiki_updated: boolean
  email_sent: boolean
  coordination_event?: CoordinationEvent
}

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
})

export type SchedulerTask = z.infer<typeof SchedulerTaskSchema>

export interface SchedulerTaskResult {
  task_type: string
  execution_time: string
  duration_ms: number
  items_processed: number
  actions_taken: Array<{
    action: string
    count: number
  }>
  errors: Array<{
    error: string
    context: string
  }>
  next_run: string
}

// ============================================================================
// Response Generation Context
// ============================================================================

export interface ResponseContext {
  trigger: {
    type: 'email' | 'github_webhook' | 'scheduler'
    id: string
    timestamp: string
  }
  recipient: {
    email: string
    name?: string
    github_username?: string
  }
  content_type: 'email' | 'github_comment' | 'github_discussion' | 'wiki_update'
  context_data: {
    issues?: GitHubIssue[]
    prs?: GitHubPullRequest[]
    action_items?: ActionItem[]
    commitments?: Commitment[]
    team_members?: any[]
    metrics?: any[]
  }
  tone: 'friendly' | 'professional' | 'urgent' | 'celebratory'
  personality: string
}

// ============================================================================
// Wiki Update Types
// ============================================================================

export interface WikiUpdateRequest {
  page_name: string
  update_type: 'create' | 'update' | 'append'
  content?: string
  section?: string
  data?: Record<string, unknown>
  commit_message: string
}

export interface WikiUpdateResult {
  success: boolean
  page_name: string
  page_url?: string
  error?: string
}

// ============================================================================
// Query Enhancement Types (Smykowski-specific)
// ============================================================================

export interface SmykowskiQueryContext {
  // Extends Schrute's query context with GitHub data
  github_issues?: GitHubIssue[]
  github_prs?: GitHubPullRequest[]
  team_members?: any[]
  recent_metrics?: any[]
  wiki_pages?: string[]
}

// ============================================================================
// Integration Types
// ============================================================================

export interface SchruteBridgeContext {
  speech_acts: SpeechAct[]
  privacy_filtered: boolean
  memory_context: any
  personality: string
}

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
  PROCESSES: 'smykowski-processes',
  ISSUE_METRICS: 'smykowski-issue-metrics',
} as const

// ============================================================================
// Error Types
// ============================================================================

export class SmykowskiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'SmykowskiError'
  }
}

export class GitHubAPIError extends SmykowskiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GITHUB_API_ERROR', details)
    this.name = 'GitHubAPIError'
  }
}

export class ExtractionError extends SmykowskiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'EXTRACTION_ERROR', details)
    this.name = 'ExtractionError'
  }
}

export class WorkflowError extends SmykowskiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'WORKFLOW_ERROR', details)
    this.name = 'WorkflowError'
  }
}
