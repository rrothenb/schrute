import { describe, it, expect, beforeEach } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBThreadStore } from '~/lib/storage/dynamodb-thread-store.js'
import type { Thread } from '~/lib/types/index.js'

const ddbMock = mockClient(DynamoDBClient)

describe('DynamoDBThreadStore', () => {
  let store: DynamoDBThreadStore
  const tableName = 'test-threads'

  beforeEach(() => {
    ddbMock.reset()
    store = new DynamoDBThreadStore(tableName)
  })

  describe('putThread', () => {
    it('should store a thread in DynamoDB', async () => {
      const thread: Thread = {
        thread_id: 'thread-001',
        subject: 'Project Discussion',
        participants: ['alice@example.com', 'bob@example.com'],
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
        message_count: 1,
      }

      ddbMock.on(PutItemCommand).resolves({})

      await store.putThread(thread)

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
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

      ddbMock.on(PutItemCommand).resolves({})

      await store.putThread(thread)

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

      ddbMock.on(PutItemCommand).rejects(new Error('DynamoDB error'))

      await expect(store.putThread(thread)).rejects.toThrow('DynamoDB error')
    })
  })

  describe('getThread', () => {
    it('should retrieve a thread by ID', async () => {
      const mockThread = {
        thread_id: { S: 'thread-001' },
        subject: { S: 'Project Discussion' },
        participants: { L: [{ S: 'alice@example.com' }, { S: 'bob@example.com' }] },
        created_at: { S: '2025-01-15T10:00:00Z' },
        updated_at: { S: '2025-01-15T11:00:00Z' },
        message_count: { N: '3' },
      }

      ddbMock.on(GetItemCommand).resolves({ Item: mockThread })

      const result = await store.getThread('thread-001')

      expect(result?.thread_id).toBe('thread-001')
      expect(result?.subject).toBe('Project Discussion')
      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should return null when thread not found', async () => {
      ddbMock.on(GetItemCommand).resolves({})

      const result = await store.getThread('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw error on DynamoDB failure', async () => {
      ddbMock.on(GetItemCommand).rejects(new Error('DynamoDB error'))

      await expect(store.getThread('thread-001')).rejects.toThrow('DynamoDB error')
    })
  })

  describe('updateThreadParticipants', () => {
    it('should update thread participants', async () => {
      ddbMock.on(UpdateItemCommand).resolves({})

      await store.updateThreadParticipants('thread-001', ['charlie@example.com'])

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
    })

    it('should throw error on DynamoDB failure', async () => {
      ddbMock.on(UpdateItemCommand).rejects(new Error('DynamoDB error'))

      await expect(
        store.updateThreadParticipants('thread-001', ['charlie@example.com'])
      ).rejects.toThrow('DynamoDB error')
    })
  })

  describe('updateThreadLastMessage', () => {
    it('should update last message ID and increment count', async () => {
      ddbMock.on(UpdateItemCommand).resolves({})

      await store.updateThreadLastMessage('thread-001', 'msg-005', '2025-01-15T12:00:00Z')

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
    })

    it('should throw error on DynamoDB failure', async () => {
      ddbMock.on(UpdateItemCommand).rejects(new Error('DynamoDB error'))

      await expect(
        store.updateThreadLastMessage('thread-001', 'msg-005', '2025-01-15T12:00:00Z')
      ).rejects.toThrow('DynamoDB error')
    })
  })
})
