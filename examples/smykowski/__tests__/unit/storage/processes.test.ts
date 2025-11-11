import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { ProcessStorage } from '~/lib/storage/processes.js'
import type { ProcessDefinition } from '~/lib/types/index.js'

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb')
jest.mock('@aws-sdk/lib-dynamodb')

describe('ProcessStorage', () => {
  let storage: ProcessStorage
  let mockDocClient: any

  beforeEach(() => {
    mockDocClient = {
      send: jest.fn(),
    }

    // Mock the DynamoDBDocumentClient.from static method
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue(mockDocClient)

    storage = new ProcessStorage('test-table')
  })

  describe('save', () => {
    it('should save a new process definition', async () => {
      const process: ProcessDefinition = {
        process_id: 'test-process',
        enabled: true,
        repo_id: 'owner/repo',
        trigger: { event: 'issues.opened' },
        actions: [
          {
            type: 'comment',
            description: 'Add response time comment',
          },
        ],
        source_wiki_page: 'Processes/test',
        last_updated: new Date().toISOString(),
      }

      mockDocClient.send.mockResolvedValue({})

      await storage.save(process)

      expect(mockDocClient.send).toHaveBeenCalled()
      const putCommand = mockDocClient.send.mock.calls[0][0]
      expect(putCommand.input.Item.process_id).toBe('test-process')
      expect(putCommand.input.Item.execution_count).toBe(0)
    })
  })

  describe('get', () => {
    it('should retrieve a process by ID', async () => {
      mockDocClient.send.mockResolvedValue({
        Item: {
          process_id: 'test-process',
          enabled: true,
        },
      })

      const process = await storage.get('test-process')

      expect(process).toBeDefined()
      expect(process?.process_id).toBe('test-process')
    })

    it('should return null for non-existent process', async () => {
      mockDocClient.send.mockResolvedValue({})

      const process = await storage.get('non-existent')

      expect(process).toBeNull()
    })
  })

  describe('getByRepo', () => {
    it('should retrieve all processes for a repo', async () => {
      mockDocClient.send.mockResolvedValue({
        Items: [
          { process_id: 'process-1', repo_id: 'owner/repo' },
          { process_id: 'process-2', repo_id: 'owner/repo' },
        ],
      })

      const processes = await storage.getByRepo('owner/repo')

      expect(processes).toHaveLength(2)
    })
  })

  describe('getByEvent', () => {
    it('should filter processes by event and enabled status', async () => {
      mockDocClient.send.mockResolvedValue({
        Items: [
          {
            process_id: 'process-1',
            enabled: true,
            trigger: { event: 'issues.opened' },
          },
          {
            process_id: 'process-2',
            enabled: false,
            trigger: { event: 'issues.opened' },
          },
          {
            process_id: 'process-3',
            enabled: true,
            trigger: { event: 'pull_request.opened' },
          },
        ],
      })

      const processes = await storage.getByEvent('owner/repo', 'issues.opened')

      expect(processes).toHaveLength(1)
      expect(processes[0].process_id).toBe('process-1')
    })

    it('should return empty array if no matching processes', async () => {
      mockDocClient.send.mockResolvedValue({ Items: [] })

      const processes = await storage.getByEvent('owner/repo', 'issues.opened')

      expect(processes).toHaveLength(0)
    })
  })

  describe('recordExecution', () => {
    it('should record successful execution', async () => {
      mockDocClient.send.mockResolvedValue({})

      await storage.recordExecution('test-process', true)

      expect(mockDocClient.send).toHaveBeenCalled()
      const updateCommand = mockDocClient.send.mock.calls[0][0]
      expect(updateCommand.input.UpdateExpression).toContain('last_executed')
      expect(updateCommand.input.UpdateExpression).toContain('execution_count')
      expect(updateCommand.input.ExpressionAttributeValues[':status']).toBe('success')
    })

    it('should record failed execution with error', async () => {
      mockDocClient.send.mockResolvedValue({})

      await storage.recordExecution('test-process', false, 'Test error')

      expect(mockDocClient.send).toHaveBeenCalled()
      const updateCommand = mockDocClient.send.mock.calls[0][0]
      expect(updateCommand.input.ExpressionAttributeValues[':status']).toBe('failed')
      expect(updateCommand.input.ExpressionAttributeValues[':error']).toBe('Test error')
    })
  })

  describe('setEnabled', () => {
    it('should enable a process', async () => {
      mockDocClient.send.mockResolvedValue({})

      await storage.setEnabled('test-process', true)

      expect(mockDocClient.send).toHaveBeenCalled()
      const updateCommand = mockDocClient.send.mock.calls[0][0]
      expect(updateCommand.input.ExpressionAttributeValues[':enabled']).toBe(true)
    })

    it('should disable a process', async () => {
      mockDocClient.send.mockResolvedValue({})

      await storage.setEnabled('test-process', false)

      expect(mockDocClient.send).toHaveBeenCalled()
      const updateCommand = mockDocClient.send.mock.calls[0][0]
      expect(updateCommand.input.ExpressionAttributeValues[':enabled']).toBe(false)
    })
  })

  describe('delete', () => {
    it('should delete a process', async () => {
      mockDocClient.send.mockResolvedValue({})

      await storage.delete('test-process')

      expect(mockDocClient.send).toHaveBeenCalled()
      const deleteCommand = mockDocClient.send.mock.calls[0][0]
      expect(deleteCommand.input.Key.process_id).toBe('test-process')
    })
  })

  describe('update', () => {
    it('should update process definition while preserving execution stats', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Item: {
          process_id: 'test-process',
          execution_count: 5,
          last_executed: '2025-01-01T10:00:00Z',
          last_execution_status: 'success',
        },
      })

      mockDocClient.send.mockResolvedValueOnce({})

      const updated: ProcessDefinition = {
        process_id: 'test-process',
        enabled: true,
        repo_id: 'owner/repo',
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment', description: 'Updated action' }],
        source_wiki_page: 'Processes/test',
        last_updated: new Date().toISOString(),
      }

      await storage.update(updated)

      expect(mockDocClient.send).toHaveBeenCalledTimes(2)
      const putCommand = mockDocClient.send.mock.calls[1][0]
      expect(putCommand.input.Item.execution_count).toBe(5)
      expect(putCommand.input.Item.last_executed).toBe('2025-01-01T10:00:00Z')
    })

    it('should handle updating non-existent process', async () => {
      mockDocClient.send.mockResolvedValueOnce({})
      mockDocClient.send.mockResolvedValueOnce({})

      const updated: ProcessDefinition = {
        process_id: 'new-process',
        enabled: true,
        repo_id: 'owner/repo',
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment', description: 'New action' }],
        source_wiki_page: 'Processes/new',
        last_updated: new Date().toISOString(),
      }

      await storage.update(updated)

      expect(mockDocClient.send).toHaveBeenCalledTimes(2)
      const putCommand = mockDocClient.send.mock.calls[1][0]
      expect(putCommand.input.Item.execution_count).toBe(0)
    })
  })

  describe('getExecutionStats', () => {
    it('should return execution statistics', async () => {
      mockDocClient.send.mockResolvedValue({
        Item: {
          process_id: 'test-process',
          execution_count: 10,
          last_executed: '2025-01-01T10:00:00Z',
          last_execution_status: 'success',
        },
      })

      const stats = await storage.getExecutionStats('test-process')

      expect(stats.execution_count).toBe(10)
      expect(stats.last_executed).toBe('2025-01-01T10:00:00Z')
      expect(stats.last_status).toBe('success')
    })

    it('should return zero stats for non-existent process', async () => {
      mockDocClient.send.mockResolvedValue({})

      const stats = await storage.getExecutionStats('non-existent')

      expect(stats.execution_count).toBe(0)
      expect(stats.last_executed).toBeUndefined()
    })
  })
})
