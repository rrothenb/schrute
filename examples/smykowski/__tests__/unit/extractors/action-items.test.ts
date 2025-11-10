import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { ActionItemExtractor } from '~/lib/extractors/action-items.js'
import { meetingNotesEmail, commitmentEmail } from '../../mocks/sample-emails.js'
import type { ClaudeClient } from '@schrute/lib/claude/client.js'

describe('ActionItemExtractor', () => {
  let mockClaudeClient: jest.Mocked<ClaudeClient>
  let extractor: ActionItemExtractor

  beforeEach(() => {
    mockClaudeClient = {
      prompt: jest.fn(),
    } as any

    extractor = new ActionItemExtractor(mockClaudeClient)
  })

  describe('extract', () => {
    it('should extract action items from meeting notes', async () => {
      // Mock Claude response
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify([
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
      ]))

      const items = await extractor.extract(meetingNotesEmail)

      expect(items).toHaveLength(2)
      expect(items[0].description).toBe('Implement authentication flow')
      expect(items[0].assignee_email).toBe('bob@team.com')
      expect(items[0].assignee_github).toBe('bob')
      expect(items[0].status).toBe('pending')
      expect(items[0].source_message_id).toBe(meetingNotesEmail.message_id)
      expect(items[0].thread_id).toBe(meetingNotesEmail.thread_id)
    })

    it('should handle emails with no action items', async () => {
      mockClaudeClient.prompt.mockResolvedValue('[]')

      const items = await extractor.extract(meetingNotesEmail)

      expect(items).toHaveLength(0)
    })

    it('should handle action items without assignees', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify([
        {
          description: 'Update documentation',
        },
      ]))

      const items = await extractor.extract(meetingNotesEmail)

      expect(items).toHaveLength(1)
      expect(items[0].assignee_email).toBeUndefined()
      expect(items[0].assignee_name).toBeUndefined()
    })

    it('should handle action items without deadlines', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify([
        {
          description: 'Fix bug in login',
          assignee_email: 'alice@team.com',
        },
      ]))

      const items = await extractor.extract(meetingNotesEmail)

      expect(items).toHaveLength(1)
      expect(items[0].deadline).toBeUndefined()
      expect(items[0].deadline_text).toBeUndefined()
    })

    it('should handle extraction errors gracefully', async () => {
      mockClaudeClient.prompt.mockRejectedValue(new Error('API error'))

      const items = await extractor.extract(meetingNotesEmail)

      expect(items).toHaveLength(0)
    })

    it('should handle invalid JSON responses', async () => {
      mockClaudeClient.prompt.mockResolvedValue('Not JSON at all')

      const items = await extractor.extract(meetingNotesEmail)

      expect(items).toHaveLength(0)
    })
  })

  describe('extractFromThread', () => {
    it('should extract from multiple emails', async () => {
      mockClaudeClient.prompt
        .mockResolvedValueOnce(JSON.stringify([
          { description: 'Task 1', assignee_email: 'bob@team.com' },
        ]))
        .mockResolvedValueOnce(JSON.stringify([
          { description: 'Task 2', assignee_email: 'carol@team.com' },
        ]))

      const items = await extractor.extractFromThread([
        meetingNotesEmail,
        commitmentEmail,
      ])

      expect(items.length).toBeGreaterThanOrEqual(2)
    })

    it('should deduplicate similar items', async () => {
      mockClaudeClient.prompt
        .mockResolvedValueOnce(JSON.stringify([
          { description: 'Implement auth flow' },
        ]))
        .mockResolvedValueOnce(JSON.stringify([
          { description: 'Implement auth flow' },
        ]))

      const items = await extractor.extractFromThread([
        meetingNotesEmail,
        commitmentEmail,
      ])

      // Should deduplicate exact duplicates
      expect(items.length).toBe(1)
    })
  })

  describe('filterByAssignee', () => {
    it('should filter items by assignee email', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify([
        { description: 'Task 1', assignee_email: 'bob@team.com' },
        { description: 'Task 2', assignee_email: 'carol@team.com' },
        { description: 'Task 3', assignee_email: 'bob@team.com' },
      ]))

      const items = await extractor.extract(meetingNotesEmail)
      const bobItems = extractor.filterByAssignee(items, 'bob@team.com')

      expect(bobItems).toHaveLength(2)
      expect(bobItems.every(item => item.assignee_email === 'bob@team.com')).toBe(true)
    })
  })
})
