import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { CommitmentsStorage } from '~/lib/storage/commitments.js'
import type { Commitment } from '~/lib/types/index.js'

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb')
jest.mock('@aws-sdk/lib-dynamodb')

describe('CommitmentsStorage', () => {
  let storage: CommitmentsStorage
  let mockDocClient: any

  beforeEach(() => {
    mockDocClient = {
      send: jest.fn(),
    }

    // Mock the DynamoDBDocumentClient.from static method
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue(mockDocClient)

    storage = new CommitmentsStorage('test-table')
  })

  describe('store', () => {
    it('should store a commitment', async () => {
      const commitment: Commitment = {
        id: '123',
        commitment_text: 'Complete feature by Friday',
        person_email: 'alice@team.com',
        person_name: 'Alice',
        deadline: '2025-11-15T17:00:00Z',
        source_message_id: 'msg-1',
        thread_id: 'thread-1',
        extracted_at: new Date().toISOString(),
        status: 'active',
        reminder_count: 0,
      }

      mockDocClient.send.mockResolvedValue({})

      await storage.store(commitment)

      expect(mockDocClient.send).toHaveBeenCalled()
    })
  })

  describe('get', () => {
    it('should retrieve a commitment by id', async () => {
      const commitment: Commitment = {
        id: '123',
        commitment_text: 'Test',
        person_email: 'alice@team.com',
        source_message_id: 'msg-1',
        thread_id: 'thread-1',
        extracted_at: new Date().toISOString(),
        status: 'active',
        reminder_count: 0,
      }

      mockDocClient.send.mockResolvedValue({ Item: commitment })

      const result = await storage.get('123')

      expect(result).toEqual(commitment)
    })

    it('should return null if commitment not found', async () => {
      mockDocClient.send.mockResolvedValue({})

      const result = await storage.get('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getByPerson', () => {
    it('should retrieve commitments for a person', async () => {
      const commitments = [
        {
          id: '1',
          person_email: 'alice@team.com',
        },
        {
          id: '2',
          person_email: 'alice@team.com',
        },
      ]

      mockDocClient.send.mockResolvedValue({ Items: commitments })

      const result = await storage.getByPerson('alice@team.com')

      expect(result).toHaveLength(2)
      expect(mockDocClient.send).toHaveBeenCalled()
    })
  })

  describe('updateStatus', () => {
    it('should update commitment status', async () => {
      mockDocClient.send.mockResolvedValue({})

      await storage.updateStatus('123', 'completed')

      expect(mockDocClient.send).toHaveBeenCalled()
    })
  })
})
