import { describe, it, expect, beforeEach } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBActivationLogStore } from '~/lib/storage/dynamodb-activation-store.js'
import type { ActivationLog } from '~/lib/storage/interfaces.js'

const ddbMock = mockClient(DynamoDBClient)

describe('DynamoDBActivationLogStore', () => {
  let store: DynamoDBActivationLogStore
  const tableName = 'test-activation-log'

  beforeEach(() => {
    ddbMock.reset()
    store = new DynamoDBActivationLogStore(tableName)
  })

  describe('logActivation', () => {
    it('should log an activation decision', async () => {
      const log: ActivationLog = {
        logId: 'log-001',
        threadId: 'thread-001',
        messageId: 'msg-001',
        timestamp: '2025-01-15T10:00:00Z',
        shouldRespond: true,
        reason: 'Direct mention',
        schruteAddressed: true,
      }

      ddbMock.on(PutItemCommand).resolves({})

      await store.logActivation(log)

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
    })

    it('should log decisions to not respond', async () => {
      const log: ActivationLog = {
        logId: 'log-002',
        threadId: 'thread-001',
        messageId: 'msg-002',
        timestamp: '2025-01-15T11:00:00Z',
        shouldRespond: false,
        reason: 'Not directly relevant',
        schruteAddressed: false,
      }

      ddbMock.on(PutItemCommand).resolves({})

      await store.logActivation(log)

      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should throw error on DynamoDB failure', async () => {
      const log: ActivationLog = {
        logId: 'log-003',
        threadId: 'thread-001',
        messageId: 'msg-003',
        timestamp: '2025-01-15T12:00:00Z',
        shouldRespond: true,
        reason: 'Test',
        schruteAddressed: true,
      }

      ddbMock.on(PutItemCommand).rejects(new Error('DynamoDB error'))

      await expect(store.logActivation(log)).rejects.toThrow('DynamoDB error')
    })
  })

  describe('getActivationLogsByThread', () => {
    it('should retrieve activation logs for a thread', async () => {
      const mockItems = [
        {
          logId: { S: 'log-001' },
          threadId: { S: 'thread-001' },
          messageId: { S: 'msg-001' },
          timestamp: { S: '2025-01-15T10:00:00Z' },
          shouldRespond: { BOOL: true },
          reason: { S: 'Direct mention' },
          schruteAddressed: { BOOL: true },
        },
        {
          logId: { S: 'log-002' },
          threadId: { S: 'thread-001' },
          messageId: { S: 'msg-002' },
          timestamp: { S: '2025-01-15T11:00:00Z' },
          shouldRespond: { BOOL: false },
          reason: { S: 'Not relevant' },
          schruteAddressed: { BOOL: false },
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockItems })

      const result = await store.getActivationLogsByThread('thread-001')

      expect(result.length).toBe(2)
      expect(result[0].logId).toBe('log-001')
      expect(result[0].shouldRespond).toBe(true)
      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.IndexName).toBe('thread_id-timestamp-index')
    })

    it('should return empty array when no logs found', async () => {
      ddbMock.on(QueryCommand).resolves({})

      const result = await store.getActivationLogsByThread('empty-thread')

      expect(result).toEqual([])
    })
  })
})
