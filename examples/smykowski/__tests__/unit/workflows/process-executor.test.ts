import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { ProcessExecutor } from '~/lib/workflows/process-executor.js'
import type { ClaudeClient } from '@schrute/lib/claude/client.js'
import type { GitHubService } from '~/lib/github/index.js'
import type { IssueMetricsStorage } from '~/lib/storage/index.js'
import type {
  ProcessDefinition,
  ProcessExecutionContext,
  GitHubIssue,
} from '~/lib/types/index.js'

describe('ProcessExecutor', () => {
  let mockClaudeClient: jest.Mocked<ClaudeClient>
  let mockGitHub: jest.Mocked<GitHubService>
  let mockMetricsStore: jest.Mocked<IssueMetricsStorage>
  let executor: ProcessExecutor

  const sampleProcess: ProcessDefinition = {
    process_id: 'test-process',
    enabled: true,
    repo_id: 'owner/repo',
    trigger: { event: 'issues.opened' },
    actions: [
      {
        type: 'calculate_metrics',
        description: 'Calculate response times',
      },
      {
        type: 'comment',
        description: 'Add comment with stats',
      },
    ],
    configuration: { lookback_period: 30 },
    source_wiki_page: 'Processes/test',
    last_updated: new Date().toISOString(),
  }

  const sampleIssue: GitHubIssue = {
    number: 123,
    title: 'Test Issue',
    body: 'Test body',
    state: 'open',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
    closed_at: null,
    user: { login: 'alice', id: 1, type: 'User' },
    assignees: [],
    labels: [],
    html_url: 'https://github.com/owner/repo/issues/123',
    comments: 0,
  }

  const sampleContext: ProcessExecutionContext = {
    event: {
      action: 'issues.opened',
      issue: sampleIssue,
      repository: { full_name: 'owner/repo' },
    },
    issue: sampleIssue,
    repo: 'owner/repo',
    triggered_at: new Date().toISOString(),
  }

  beforeEach(() => {
    mockClaudeClient = {
      prompt: jest.fn(),
    } as any

    mockGitHub = {
      issues: {
        createComment: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      wiki: {
        createOrUpdatePage: jest.fn(),
      },
      getRepository: jest.fn().mockReturnValue({ fullName: 'owner/repo' }),
    } as any

    mockMetricsStore = {
      calculateResponseStats: jest.fn(),
    } as any

    executor = new ProcessExecutor(mockClaudeClient, mockGitHub, mockMetricsStore)
  })

  describe('execute', () => {
    it('should execute all actions in a process successfully', async () => {
      mockMetricsStore.calculateResponseStats.mockResolvedValue({
        average_minutes: 120,
        median_minutes: 90,
        p90_minutes: 180,
        p95_minutes: 240,
        sample_size: 10,
        period_start: '2024-12-01T00:00:00Z',
        period_end: '2025-01-01T00:00:00Z',
      })

      mockClaudeClient.prompt.mockResolvedValue(
        'Hey there! Based on our last 30 days, we typically respond to new issues in about 2 hours (median: 1.5 hours). Thanks for reporting!'
      )

      mockGitHub.issues.createComment.mockResolvedValue({} as any)

      const result = await executor.execute(sampleProcess, sampleContext)

      expect(result.success).toBe(true)
      expect(result.actions).toHaveLength(2)
      expect(result.actions[0].action_type).toBe('calculate_metrics')
      expect(result.actions[0].success).toBe(true)
      expect(result.actions[1].action_type).toBe('comment')
      expect(result.actions[1].success).toBe(true)
      expect(mockGitHub.issues.createComment).toHaveBeenCalled()
    })

    it('should handle action failures gracefully', async () => {
      const processWithBadAction: ProcessDefinition = {
        ...sampleProcess,
        actions: [
          {
            type: 'label',
            description: 'Add labels',
            parameters: {}, // Missing 'labels' parameter
          },
        ],
      }

      const result = await executor.execute(processWithBadAction, sampleContext)

      expect(result.success).toBe(false)
      expect(result.actions[0].success).toBe(false)
      expect(result.actions[0].error).toBeDefined()
    })

    it('should continue executing remaining actions after one fails', async () => {
      const process: ProcessDefinition = {
        ...sampleProcess,
        actions: [
          {
            type: 'label',
            description: 'Add labels',
            parameters: {}, // This will fail
          },
          {
            type: 'comment',
            description: 'Add comment',
          },
        ],
      }

      mockMetricsStore.calculateResponseStats.mockResolvedValue({
        average_minutes: 120,
        median_minutes: 90,
        p90_minutes: 180,
        p95_minutes: 240,
        sample_size: 10,
        period_start: '2024-12-01T00:00:00Z',
        period_end: '2025-01-01T00:00:00Z',
      })

      mockClaudeClient.prompt.mockResolvedValue('Test comment')
      mockGitHub.issues.createComment.mockResolvedValue({} as any)

      const result = await executor.execute(process, sampleContext)

      expect(result.actions).toHaveLength(2)
      expect(result.actions[0].success).toBe(false)
      expect(result.actions[1].success).toBe(true)
    })
  })

  describe('validateContext', () => {
    it('should validate a correct context', () => {
      const result = executor.validateContext(sampleProcess, sampleContext)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect event mismatch', () => {
      const wrongContext = {
        ...sampleContext,
        event: { ...sampleContext.event, action: 'pull_request.opened' },
      }

      const result = executor.validateContext(sampleProcess, wrongContext)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Event mismatch')
    })

    it('should detect missing issue for actions that require it', () => {
      const contextWithoutIssue = {
        ...sampleContext,
        issue: undefined,
      }

      const result = executor.validateContext(sampleProcess, contextWithoutIssue)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('require an issue')
    })
  })

  describe('executeCommentAction', () => {
    it('should generate and post a comment', async () => {
      mockMetricsStore.calculateResponseStats.mockResolvedValue({
        average_minutes: 120,
        median_minutes: 90,
        p90_minutes: 180,
        p95_minutes: 240,
        sample_size: 10,
        period_start: '2024-12-01T00:00:00Z',
        period_end: '2025-01-01T00:00:00Z',
      })

      mockClaudeClient.prompt.mockResolvedValue(
        'Thanks for the report! Our team typically responds within 2 hours.'
      )

      mockGitHub.issues.createComment.mockResolvedValue({} as any)

      const process: ProcessDefinition = {
        ...sampleProcess,
        actions: [
          {
            type: 'comment',
            description: 'Add welcome comment with response time stats',
          },
        ],
      }

      const result = await executor.execute(process, sampleContext)

      expect(result.success).toBe(true)
      expect(mockClaudeClient.prompt).toHaveBeenCalled()
      expect(mockGitHub.issues.createComment).toHaveBeenCalledWith({
        issue_number: 123,
        body: 'Thanks for the report! Our team typically responds within 2 hours.',
      })
    })

    it('should fail if no issue in context', async () => {
      const process: ProcessDefinition = {
        ...sampleProcess,
        actions: [{ type: 'comment', description: 'Test' }],
      }

      const contextWithoutIssue = {
        ...sampleContext,
        issue: undefined,
      }

      const result = await executor.execute(process, contextWithoutIssue)

      expect(result.success).toBe(false)
      expect(result.actions[0].error).toContain('no issue in context')
    })
  })

  describe('executeLabelAction', () => {
    it('should add labels to an issue', async () => {
      mockGitHub.issues.update.mockResolvedValue({} as any)

      const process: ProcessDefinition = {
        ...sampleProcess,
        actions: [
          {
            type: 'label',
            description: 'Add urgency labels',
            parameters: { labels: ['urgent', 'needs-triage'] },
          },
        ],
      }

      const result = await executor.execute(process, sampleContext)

      expect(result.success).toBe(true)
      expect(mockGitHub.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 123,
          labels: expect.arrayContaining(['urgent', 'needs-triage']),
        })
      )
    })

    it('should fail if labels parameter is missing', async () => {
      const process: ProcessDefinition = {
        ...sampleProcess,
        actions: [
          {
            type: 'label',
            description: 'Add labels',
            parameters: {},
          },
        ],
      }

      const result = await executor.execute(process, sampleContext)

      expect(result.success).toBe(false)
      expect(result.actions[0].error).toContain('No labels specified')
    })
  })

  describe('executeAssignAction', () => {
    it('should assign users to an issue', async () => {
      mockGitHub.issues.update.mockResolvedValue({} as any)

      const process: ProcessDefinition = {
        ...sampleProcess,
        actions: [
          {
            type: 'assign',
            description: 'Assign to team lead',
            parameters: { assignees: ['team-lead'] },
          },
        ],
      }

      const result = await executor.execute(process, sampleContext)

      expect(result.success).toBe(true)
      expect(mockGitHub.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 123,
          assignees: ['team-lead'],
        })
      )
    })
  })

  describe('executeCreateIssueAction', () => {
    it('should create a new issue', async () => {
      mockGitHub.issues.create.mockResolvedValue({
        number: 456,
        title: 'Follow-up Issue',
      } as any)

      const process: ProcessDefinition = {
        ...sampleProcess,
        actions: [
          {
            type: 'create_issue',
            description: 'Create follow-up issue',
            parameters: {
              title: 'Follow-up Issue',
              body: 'This is a follow-up',
              labels: ['follow-up'],
            },
          },
        ],
      }

      const result = await executor.execute(process, sampleContext)

      expect(result.success).toBe(true)
      expect(mockGitHub.issues.create).toHaveBeenCalledWith({
        title: 'Follow-up Issue',
        body: 'This is a follow-up',
        labels: ['follow-up'],
        assignees: [],
      })
    })

    it('should fail if title is missing', async () => {
      const process: ProcessDefinition = {
        ...sampleProcess,
        actions: [
          {
            type: 'create_issue',
            description: 'Create issue',
            parameters: {},
          },
        ],
      }

      const result = await executor.execute(process, sampleContext)

      expect(result.success).toBe(false)
      expect(result.actions[0].error).toContain('title is required')
    })
  })

  describe('executeUpdateWikiAction', () => {
    it('should update a wiki page', async () => {
      mockGitHub.wiki.createOrUpdatePage.mockResolvedValue()

      const process: ProcessDefinition = {
        ...sampleProcess,
        actions: [
          {
            type: 'update_wiki',
            description: 'Update process docs',
            parameters: {
              page_name: 'ProcessDocs',
              content: 'Updated content',
            },
          },
        ],
      }

      const result = await executor.execute(process, sampleContext)

      expect(result.success).toBe(true)
      expect(mockGitHub.wiki.createOrUpdatePage).toHaveBeenCalledWith({
        title: 'ProcessDocs',
        content: 'Updated content',
        message: 'Updated by process: test-process',
      })
    })
  })
})
