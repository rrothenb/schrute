import { describe, it, expect, beforeEach } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { DynamoDBMessageStore } from '~/lib/storage/dynamodb-message-store.js'
import type { Message } from '~/lib/types/index.js'

const ddbMock = mockClient(DynamoDBDocumentClient)

describe('DynamoDBMessageStore', () => {
  let store: DynamoDBMessageStore
  const tableName = 'test-messages'

  beforeEach(() => {
    ddbMock.reset()
    store = new DynamoDBMessageStore(tableName)
  })

  describe('storeMessage', () => {
    it('should store a message in DynamoDB', async () => {
      const message: Message = {
        message_id: 'msg-001',
        thread_id: 'thread-001',
        from_email: 'alice@example.com',
        from_name: 'Alice',
        to: ['bob@example.com'],
        cc: ['charlie@example.com'],
        subject: 'Test Subject',
        timestamp: '2025-01-15T10:00:00Z',
        participants: ['alice@example.com', 'bob@example.com', 'charlie@example.com'],
      }

      ddbMock.on(PutCommand).resolves({})

      await store.storeMessage(message)

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
      expect(call.args[0].input.Item?.message_id).toBe('msg-001')
    })

    it('should handle messages with optional fields', async () => {
      const message: Message = {
        message_id: 'msg-002',
        thread_id: 'thread-002',
        from_email: 'alice@example.com',
        to: ['bob@example.com'],
        subject: 'Test',
        timestamp: '2025-01-15T10:00:00Z',
        participants: ['alice@example.com', 'bob@example.com'],
      }

      ddbMock.on(PutCommand).resolves({})

      await store.storeMessage(message)

      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should throw error on DynamoDB failure', async () => {
      const message: Message = {
        message_id: 'msg-003',
        thread_id: 'thread-003',
        from_email: 'alice@example.com',
        to: ['bob@example.com'],
        subject: 'Test',
        timestamp: '2025-01-15T10:00:00Z',
        participants: ['alice@example.com', 'bob@example.com'],
      }

      ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'))

      await expect(store.storeMessage(message)).rejects.toThrow('DynamoDB error')
    })
  })

  describe('getMessage', () => {
    it('should retrieve a message by ID', async () => {
      const mockMessage: Message = {
        message_id: 'msg-001',
        thread_id: 'thread-001',
        from_email: 'alice@example.com',
        to: ['bob@example.com'],
        subject: 'Test',
        timestamp: '2025-01-15T10:00:00Z',
        participants: ['alice@example.com', 'bob@example.com'],
      }

      ddbMock.on(GetCommand).resolves({ Item: mockMessage })

      const result = await store.getMessage('msg-001')

      expect(result).toEqual(mockMessage)
      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should return undefined when message not found', async () => {
      ddbMock.on(GetCommand).resolves({})

      const result = await store.getMessage('nonexistent')

      expect(result).toBeUndefined()
    })

    it('should throw error on DynamoDB failure', async () => {
      ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'))

      await expect(store.getMessage('msg-001')).rejects.toThrow('DynamoDB error')
    })
  })

  describe('getThreadMessages', () => {
    it('should retrieve all messages for a thread', async () => {
      const mockMessages: Message[] = [
        {
          message_id: 'msg-001',
          thread_id: 'thread-001',
          from_email: 'alice@example.com',
          to: ['bob@example.com'],
          subject: 'Test 1',
          timestamp: '2025-01-15T10:00:00Z',
          participants: ['alice@example.com', 'bob@example.com'],
        },
        {
          message_id: 'msg-002',
          thread_id: 'thread-001',
          from_email: 'bob@example.com',
          to: ['alice@example.com'],
          subject: 'Re: Test 1',
          timestamp: '2025-01-15T11:00:00Z',
          participants: ['alice@example.com', 'bob@example.com'],
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockMessages })

      const result = await store.getThreadMessages('thread-001')

      expect(result).toEqual(mockMessages)
      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.IndexName).toBe('thread-index')
    })

    it('should return empty array when no messages found', async () => {
      ddbMock.on(QueryCommand).resolves({})

      const result = await store.getThreadMessages('empty-thread')

      expect(result).toEqual([])
    })

    it('should sort messages by timestamp', async () => {
      const mockMessages: Message[] = [
        {
          message_id: 'msg-002',
          thread_id: 'thread-001',
          from_email: 'bob@example.com',
          to: ['alice@example.com'],
          subject: 'Re: Test',
          timestamp: '2025-01-15T11:00:00Z',
          participants: ['alice@example.com', 'bob@example.com'],
        },
        {
          message_id: 'msg-001',
          thread_id: 'thread-001',
          from_email: 'alice@example.com',
          to: ['bob@example.com'],
          subject: 'Test',
          timestamp: '2025-01-15T10:00:00Z',
          participants: ['alice@example.com', 'bob@example.com'],
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockMessages })

      const result = await store.getThreadMessages('thread-001')

      expect(result[0].message_id).toBe('msg-002')
      expect(result[1].message_id).toBe('msg-001')
    })
  })
})
