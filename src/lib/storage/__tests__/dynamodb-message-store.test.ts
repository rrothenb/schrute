import { describe, it, expect, beforeEach } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBMessageStore } from '~/lib/storage/dynamodb-message-store.js'
import type { Message } from '~/lib/types/index.js'

const ddbMock = mockClient(DynamoDBClient)

describe('DynamoDBMessageStore', () => {
  let store: DynamoDBMessageStore
  const tableName = 'test-messages'

  beforeEach(() => {
    ddbMock.reset()
    store = new DynamoDBMessageStore(tableName)
  })

  describe('putMessage', () => {
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

      ddbMock.on(PutItemCommand).resolves({})

      await store.putMessage(message)

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
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

      ddbMock.on(PutItemCommand).resolves({})

      await store.putMessage(message)

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

      ddbMock.on(PutItemCommand).rejects(new Error('DynamoDB error'))

      await expect(store.putMessage(message)).rejects.toThrow('DynamoDB error')
    })
  })

  describe('getMessage', () => {
    it('should retrieve a message by ID', async () => {
      const mockMessage = {
        message_id: { S: 'msg-001' },
        thread_id: { S: 'thread-001' },
        from_email: { S: 'alice@example.com' },
        to: { L: [{ S: 'bob@example.com' }] },
        subject: { S: 'Test' },
        timestamp: { S: '2025-01-15T10:00:00Z' },
        participants: { L: [{ S: 'alice@example.com' }, { S: 'bob@example.com' }] },
      }

      ddbMock.on(GetItemCommand).resolves({ Item: mockMessage })

      const result = await store.getMessage('msg-001')

      expect(result?.message_id).toBe('msg-001')
      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should return null when message not found', async () => {
      ddbMock.on(GetItemCommand).resolves({})

      const result = await store.getMessage('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw error on DynamoDB failure', async () => {
      ddbMock.on(GetItemCommand).rejects(new Error('DynamoDB error'))

      await expect(store.getMessage('msg-001')).rejects.toThrow('DynamoDB error')
    })
  })

  describe('getMessagesByThread', () => {
    it('should retrieve all messages for a thread', async () => {
      const mockItems = [
        {
          message_id: { S: 'msg-001' },
          thread_id: { S: 'thread-001' },
          from_email: { S: 'alice@example.com' },
          to: { L: [{ S: 'bob@example.com' }] },
          subject: { S: 'Test 1' },
          timestamp: { S: '2025-01-15T10:00:00Z' },
          participants: { L: [{ S: 'alice@example.com' }, { S: 'bob@example.com' }] },
        },
        {
          message_id: { S: 'msg-002' },
          thread_id: { S: 'thread-001' },
          from_email: { S: 'bob@example.com' },
          to: { L: [{ S: 'alice@example.com' }] },
          subject: { S: 'Re: Test 1' },
          timestamp: { S: '2025-01-15T11:00:00Z' },
          participants: { L: [{ S: 'alice@example.com' }, { S: 'bob@example.com' }] },
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockItems })

      const result = await store.getMessagesByThread('thread-001')

      expect(result.length).toBe(2)
      expect(result[0].message_id).toBe('msg-001')
      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.IndexName).toBe('thread_id-timestamp-index')
    })

    it('should return empty array when no messages found', async () => {
      ddbMock.on(QueryCommand).resolves({})

      const result = await store.getMessagesByThread('empty-thread')

      expect(result).toEqual([])
    })

    it('should return messages sorted by timestamp', async () => {
      const mockItems = [
        {
          message_id: { S: 'msg-001' },
          thread_id: { S: 'thread-001' },
          from_email: { S: 'alice@example.com' },
          to: { L: [{ S: 'bob@example.com' }] },
          subject: { S: 'Test' },
          timestamp: { S: '2025-01-15T10:00:00Z' },
          participants: { L: [{ S: 'alice@example.com' }, { S: 'bob@example.com' }] },
        },
        {
          message_id: { S: 'msg-002' },
          thread_id: { S: 'thread-001' },
          from_email: { S: 'bob@example.com' },
          to: { L: [{ S: 'alice@example.com' }] },
          subject: { S: 'Re: Test' },
          timestamp: { S: '2025-01-15T11:00:00Z' },
          participants: { L: [{ S: 'alice@example.com' }, { S: 'bob@example.com' }] },
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockItems })

      const result = await store.getMessagesByThread('thread-001')

      expect(result[0].message_id).toBe('msg-001')
      expect(result[1].message_id).toBe('msg-002')
    })
  })
})
