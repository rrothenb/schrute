import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { MeetingFollowupWorkflow } from '~/lib/workflows/meeting-followup.js'
import { ActionItemExtractor } from '~/lib/extractors/action-items.js'
import { SchruteBridge } from '~/lib/integrations/schrute-bridge.js'
import { meetingNotesEmail } from '../mocks/sample-emails.js'
import { createMockGitHubClient } from '../mocks/github-api.js'
import type { GitHubService } from '~/lib/github/index.js'

describe('Email to GitHub Integration', () => {
  let mockGitHub: any
  let mockClaudeClient: any
  let extractor: ActionItemExtractor
  let schrute: SchruteBridge
  let workflow: MeetingFollowupWorkflow

  beforeEach(() => {
    const mockClient = createMockGitHubClient()
    mockGitHub = {
      issues: mockClient.issues,
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

    mockClaudeClient = {
      generateResponse: jest.fn().mockResolvedValue({
        content: JSON.stringify([
          {
            description: 'Implement authentication flow',
            assignee_name: 'Bob Smith',
            assignee_email: 'bob@team.com',
            deadline_text: 'by Friday',
          },
          {
            description: 'Review API design document',
            assignee_name: 'Carol Williams',
            assignee_email: 'carol@team.com',
            deadline_text: 'by Wednesday',
          },
        ]),
      }),
    }

    extractor = new ActionItemExtractor(mockClaudeClient)

    schrute = {
      detectSpeechActs: jest.fn().mockResolvedValue([
        { type: 'DECISION', content: 'Use OAuth 2.0' },
      ]),
    } as any

    workflow = new MeetingFollowupWorkflow(mockGitHub, extractor, schrute)
  })

  it('should process meeting email end-to-end', async () => {
    const result = await workflow.execute(meetingNotesEmail)

    // Should extract action items
    expect(result.actionItems.length).toBeGreaterThan(0)

    // Should create GitHub issues
    expect(result.createdIssues.length).toBeGreaterThan(0)
    expect(mockGitHub.issues.create).toHaveBeenCalledTimes(result.actionItems.length)

    // Should create discussion
    expect(result.discussionNumber).not.toBeNull()
    expect(mockGitHub.discussions.create).toHaveBeenCalled()

    // Should have no errors
    expect(result.errors).toHaveLength(0)
  })

  it('should assign issues correctly', async () => {
    await workflow.execute(meetingNotesEmail)

    // Check that assignees were passed to GitHub
    expect(mockGitHub.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({
        assignees: expect.arrayContaining(['bob']),
      })
    )
  })

  it('should include deadline in issue body', async () => {
    await workflow.execute(meetingNotesEmail)

    const createCall = mockGitHub.issues.create.mock.calls[0][0]
    expect(createCall.body).toContain('Deadline')
  })

  it('should detect speech acts for decisions', async () => {
    await workflow.execute(meetingNotesEmail)

    expect(schrute.detectSpeechActs).toHaveBeenCalledWith(meetingNotesEmail)
  })

  it('should include decisions in discussion post', async () => {
    await workflow.execute(meetingNotesEmail)

    const discussionCall = mockGitHub.discussions.create.mock.calls[0][0]
    expect(discussionCall.body).toContain('Decisions')
    expect(discussionCall.body).toContain('OAuth 2.0')
  })
})
