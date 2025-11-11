import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { IssueMetricsStorage } from '~/lib/storage/issue-metrics.js'

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb')
jest.mock('@aws-sdk/lib-dynamodb')

describe('IssueMetricsStorage', () => {
  let storage: IssueMetricsStorage
  let mockDocClient: any

  beforeEach(() => {
    mockDocClient = {
      send: jest.fn(),
    }

    // Mock the DynamoDBDocumentClient.from static method
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue(mockDocClient)

    storage = new IssueMetricsStorage('test-table')
  })

  describe('recordIssueCreated', () => {
    it('should record a new issue creation', async () => {
      mockDocClient.send.mockResolvedValue({})

      await storage.recordIssueCreated({
        repo_id: 'owner/repo',
        issue_number: 123,
        created_by: 'alice',
        labels: ['bug', 'priority-high'],
      })

      expect(mockDocClient.send).toHaveBeenCalled()
      const putCommand = mockDocClient.send.mock.calls[0][0]
      expect(putCommand.input.Item.issue_id).toBe('owner/repo#123')
      expect(putCommand.input.Item.created_by).toBe('alice')
      expect(putCommand.input.Item.labels).toEqual(['bug', 'priority-high'])
    })

    it('should handle issues without labels', async () => {
      mockDocClient.send.mockResolvedValue({})

      await storage.recordIssueCreated({
        repo_id: 'owner/repo',
        issue_number: 456,
        created_by: 'bob',
      })

      expect(mockDocClient.send).toHaveBeenCalled()
      const putCommand = mockDocClient.send.mock.calls[0][0]
      expect(putCommand.input.Item.labels).toEqual([])
    })
  })

  describe('recordFirstComment', () => {
    it('should record first comment with response time', async () => {
      // Mock getting the existing metric
      mockDocClient.send.mockResolvedValueOnce({
        Item: {
          issue_id: 'owner/repo#123',
          created_at: '2025-01-01T10:00:00Z',
          created_by: 'alice',
        },
      })

      // Mock the update
      mockDocClient.send.mockResolvedValueOnce({})

      await storage.recordFirstComment({
        repo_id: 'owner/repo',
        issue_number: 123,
        commented_at: '2025-01-01T12:00:00Z',
        commented_by: 'bob',
      })

      expect(mockDocClient.send).toHaveBeenCalledTimes(2)

      // Check that it calculated response time (2 hours = 120 minutes)
      const updateCommand = mockDocClient.send.mock.calls[1][0]
      expect(updateCommand.input.UpdateExpression).toContain('first_non_author_comment_at')
      expect(updateCommand.input.UpdateExpression).toContain('response_time_minutes')
    })

    it('should not record response time if commenter is issue creator', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Item: {
          issue_id: 'owner/repo#123',
          created_at: '2025-01-01T10:00:00Z',
          created_by: 'alice',
        },
      })

      mockDocClient.send.mockResolvedValueOnce({})

      await storage.recordFirstComment({
        repo_id: 'owner/repo',
        issue_number: 123,
        commented_at: '2025-01-01T12:00:00Z',
        commented_by: 'alice', // Same as creator
      })

      expect(mockDocClient.send).toHaveBeenCalledTimes(2)

      const updateCommand = mockDocClient.send.mock.calls[1][0]
      expect(updateCommand.input.UpdateExpression).toContain('first_comment_at')
      expect(updateCommand.input.UpdateExpression).not.toContain('first_non_author_comment_at')
    })
  })

  describe('recordIssueClosed', () => {
    it('should record issue closure and resolution time', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Item: {
          issue_id: 'owner/repo#123',
          created_at: '2025-01-01T10:00:00Z',
        },
      })

      mockDocClient.send.mockResolvedValueOnce({})

      await storage.recordIssueClosed({
        repo_id: 'owner/repo',
        issue_number: 123,
        closed_at: '2025-01-02T10:00:00Z',
      })

      expect(mockDocClient.send).toHaveBeenCalledTimes(2)

      const updateCommand = mockDocClient.send.mock.calls[1][0]
      expect(updateCommand.input.UpdateExpression).toContain('closed_at')
      expect(updateCommand.input.UpdateExpression).toContain('resolution_time_minutes')
    })
  })

  describe('calculateResponseStats', () => {
    it('should calculate response time statistics', async () => {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      mockDocClient.send.mockResolvedValue({
        Items: [
          {
            issue_id: 'owner/repo#1',
            created_at: thirtyDaysAgo.toISOString(),
            response_time_minutes: 60,
          },
          {
            issue_id: 'owner/repo#2',
            created_at: thirtyDaysAgo.toISOString(),
            response_time_minutes: 120,
          },
          {
            issue_id: 'owner/repo#3',
            created_at: thirtyDaysAgo.toISOString(),
            response_time_minutes: 90,
          },
        ],
      })

      const stats = await storage.calculateResponseStats('owner/repo', 30)

      expect(stats.sample_size).toBe(3)
      expect(stats.average_minutes).toBe(90) // (60 + 120 + 90) / 3
      expect(stats.median_minutes).toBe(90)
      expect(stats.p90_minutes).toBeGreaterThan(0)
    })

    it('should return zero stats for repos with no data', async () => {
      mockDocClient.send.mockResolvedValue({ Items: [] })

      const stats = await storage.calculateResponseStats('owner/repo', 30)

      expect(stats.sample_size).toBe(0)
      expect(stats.average_minutes).toBe(0)
      expect(stats.median_minutes).toBe(0)
    })
  })

  describe('get', () => {
    it('should retrieve a specific issue metric', async () => {
      mockDocClient.send.mockResolvedValue({
        Item: {
          issue_id: 'owner/repo#123',
          repo_id: 'owner/repo',
          issue_number: 123,
        },
      })

      const metric = await storage.get('owner/repo#123')

      expect(metric).toBeDefined()
      expect(metric?.issue_id).toBe('owner/repo#123')
    })

    it('should return null for non-existent metrics', async () => {
      mockDocClient.send.mockResolvedValue({})

      const metric = await storage.get('owner/repo#999')

      expect(metric).toBeNull()
    })
  })

  describe('getByRepo', () => {
    it('should retrieve all metrics for a repo', async () => {
      mockDocClient.send.mockResolvedValue({
        Items: [
          { issue_id: 'owner/repo#1' },
          { issue_id: 'owner/repo#2' },
        ],
      })

      const metrics = await storage.getByRepo('owner/repo')

      expect(metrics).toHaveLength(2)
    })
  })
})
