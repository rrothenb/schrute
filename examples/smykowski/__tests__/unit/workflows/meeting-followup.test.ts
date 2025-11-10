import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { MeetingFollowupWorkflow } from '~/lib/workflows/meeting-followup.js'
import { meetingNotesEmail } from '../../mocks/sample-emails.js'
import { createMockGitHubClient, mockIssues } from '../../mocks/github-api.js'
import type { GitHubService } from '~/lib/github/index.js'
import type { ActionItemExtractor } from '~/lib/extractors/index.js'
import type { SchruteBridge } from '~/lib/integrations/index.js'
import type { ActionItem } from '~/lib/types/index.js'

describe('MeetingFollowupWorkflow', () => {
  let mockGitHub: any
  let mockExtractor: jest.Mocked<ActionItemExtractor>
  let mockSchrute: jest.Mocked<SchruteBridge>
  let workflow: MeetingFollowupWorkflow

  beforeEach(() => {
    const mockClient = createMockGitHubClient()
    mockGitHub = {
      issues: {
        create: mockClient.issues.create,
      },
      discussions: {
        create: jest.fn().mockResolvedValue({ id: 'D_1', number: 1 }),
        getCategoryId: jest.fn().mockResolvedValue('CAT_1'),
      },
      getRepository: jest.fn().mockReturnValue({
        owner: 'test',
        repo: 'repo',
        fullName: 'test/repo',
      }),
    } as unknown as GitHubService

    mockExtractor = {
      extract: jest.fn(),
    } as any

    mockSchrute = {
      detectSpeechActs: jest.fn().mockResolvedValue([
        {
          type: 'DECISION',
          content: 'Use OAuth 2.0 for authentication',
        },
      ]),
    } as any

    workflow = new MeetingFollowupWorkflow(mockGitHub, mockExtractor, mockSchrute)
  })

  describe('execute', () => {
    it('should create GitHub issues from action items', async () => {
      const actionItems: ActionItem[] = [
        {
          id: '1',
          description: 'Implement auth flow',
          assignee_github: 'bob',
          assignee_email: 'bob@team.com',
          deadline: '2025-11-15T17:00:00Z',
          source_message_id: 'msg-1',
          thread_id: 'thread-1',
          extracted_at: new Date().toISOString(),
          confidence: 0.9,
          status: 'pending',
        },
      ]

      mockExtractor.extract.mockResolvedValue(actionItems)

      const result = await workflow.execute(meetingNotesEmail)

      expect(result.actionItems).toHaveLength(1)
      expect(result.createdIssues).toHaveLength(1)
      expect(mockGitHub.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Implement auth flow',
          assignees: ['bob'],
        })
      )
    })

    it('should create discussion post with summary', async () => {
      const actionItems: ActionItem[] = [
        {
          id: '1',
          description: 'Task 1',
          source_message_id: 'msg-1',
          thread_id: 'thread-1',
          extracted_at: new Date().toISOString(),
          confidence: 0.9,
          status: 'pending',
        },
      ]

      mockExtractor.extract.mockResolvedValue(actionItems)

      const result = await workflow.execute(meetingNotesEmail)

      expect(result.discussionNumber).not.toBeNull()
      expect(mockGitHub.discussions.create).toHaveBeenCalled()
    })

    it('should handle emails with no action items', async () => {
      mockExtractor.extract.mockResolvedValue([])

      const result = await workflow.execute(meetingNotesEmail)

      expect(result.actionItems).toHaveLength(0)
      expect(result.createdIssues).toHaveLength(0)
      expect(result.errors).toContain('No action items found in meeting notes')
    })

    it('should continue on individual issue creation failures', async () => {
      const actionItems: ActionItem[] = [
        {
          id: '1',
          description: 'Task 1',
          source_message_id: 'msg-1',
          thread_id: 'thread-1',
          extracted_at: new Date().toISOString(),
          confidence: 0.9,
          status: 'pending',
        },
        {
          id: '2',
          description: 'Task 2',
          source_message_id: 'msg-1',
          thread_id: 'thread-1',
          extracted_at: new Date().toISOString(),
          confidence: 0.9,
          status: 'pending',
        },
      ]

      mockExtractor.extract.mockResolvedValue(actionItems)
      mockGitHub.issues.create
        .mockResolvedValueOnce(mockIssues.authFlow)
        .mockRejectedValueOnce(new Error('GitHub API error'))

      const result = await workflow.execute(meetingNotesEmail)

      expect(result.createdIssues).toHaveLength(1)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should add urgent label for items with near deadlines', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const actionItems: ActionItem[] = [
        {
          id: '1',
          description: 'Urgent task',
          deadline: tomorrow.toISOString(),
          source_message_id: 'msg-1',
          thread_id: 'thread-1',
          extracted_at: new Date().toISOString(),
          confidence: 0.9,
          status: 'pending',
        },
      ]

      mockExtractor.extract.mockResolvedValue(actionItems)

      await workflow.execute(meetingNotesEmail)

      expect(mockGitHub.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: expect.arrayContaining(['urgent']),
        })
      )
    })

    it('should detect decisions from speech acts', async () => {
      mockExtractor.extract.mockResolvedValue([])

      const result = await workflow.execute(meetingNotesEmail)

      expect(mockSchrute.detectSpeechActs).toHaveBeenCalledWith(meetingNotesEmail)
    })
  })
})
