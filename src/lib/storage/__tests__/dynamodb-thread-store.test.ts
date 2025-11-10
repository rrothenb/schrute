import { describe, it, expect, beforeEach } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { DynamoDBThreadStore } from '~/lib/storage/dynamodb-thread-store.js'
import type { Thread } from '~/lib/types/index.js'

const ddbMock = mockClient(DynamoDBDocumentClient)

describe('DynamoDBThreadStore', () => {
  let store: DynamoDBThreadStore
  const tableName = 'test-threads'

  beforeEach(() => {
    ddbMock.reset()
    store = new DynamoDBThreadStore(tableName)
  })

  describe('storeThread', () => {
    it('should store a thread in DynamoDB', async () => {
      const thread: Thread = {
        thread_id: 'thread-001',
        subject: 'Project Discussion',
        participants: ['alice@example.com', 'bob@example.com'],
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
        message_count: 1,
      }

      ddbMock.on(PutCommand).resolves({})

      await store.storeThread(thread)

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
      expect(call.args[0].input.Item?.thread_id).toBe('thread-001')
    })

    it('should handle threads with many participants', async () => {
      const thread: Thread = {
        thread_id: 'thread-002',
        subject: 'Team Meeting',
        participants: [
          'alice@example.com',
          'bob@example.com',
          'charlie@example.com',
          'diana@example.com',
        ],
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
        message_count: 1,
      }

      ddbMock.on(PutCommand).resolves({})

      await store.storeThread(thread)

      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should throw error on DynamoDB failure', async () => {
      const thread: Thread = {
        thread_id: 'thread-003',
        subject: 'Test',
        participants: ['alice@example.com'],
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
        message_count: 1,
      }

      ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'))

      await expect(store.storeThread(thread)).rejects.toThrow('DynamoDB error')
    })
  })

  describe('getThread', () => {
    it('should retrieve a thread by ID', async () => {
      const mockThread: Thread = {
        thread_id: 'thread-001',
        subject: 'Project Discussion',
        participants: ['alice@example.com', 'bob@example.com'],
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T11:00:00Z',
        message_count: 3,
      }

      ddbMock.on(GetCommand).resolves({ Item: mockThread })

      const result = await store.getThread('thread-001')

      expect(result).toEqual(mockThread)
      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should return undefined when thread not found', async () => {
      ddbMock.on(GetCommand).resolves({})

      const result = await store.getThread('nonexistent')

      expect(result).toBeUndefined()
    })

    it('should throw error on DynamoDB failure', async () => {
      ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'))

      await expect(store.getThread('thread-001')).rejects.toThrow('DynamoDB error')
    })
  })

  describe('updateThread', () => {
    it('should update thread message count', async () => {
      ddbMock.on(UpdateCommand).resolves({})

      await store.updateThread('thread-001', {
        message_count: 5,
        updated_at: '2025-01-15T12:00:00Z',
      })

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
      expect(call.args[0].input.Key).toEqual({ thread_id: 'thread-001' })
    })

    it('should update last message ID', async () => {
      ddbMock.on(UpdateCommand).resolves({})

      await store.updateThread('thread-001', {
        last_message_id: 'msg-005',
        updated_at: '2025-01-15T12:00:00Z',
      })

      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should throw error on DynamoDB failure', async () => {
      ddbMock.on(UpdateCommand).rejects(new Error('DynamoDB error'))

      await expect(
        store.updateThread('thread-001', { message_count: 5, updated_at: '2025-01-15T12:00:00Z' })
      ).rejects.toThrow('DynamoDB error')
    })
  })
})
