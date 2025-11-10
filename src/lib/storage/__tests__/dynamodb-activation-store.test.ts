import { describe, it, expect, beforeEach } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { DynamoDBActivationStore } from '~/lib/storage/dynamodb-activation-store.js'
import type { ActivationDecision } from '~/lib/types/index.js'

const ddbMock = mockClient(DynamoDBDocumentClient)

describe('DynamoDBActivationStore', () => {
  let store: DynamoDBActivationStore
  const tableName = 'test-activation-log'

  beforeEach(() => {
    ddbMock.reset()
    store = new DynamoDBActivationStore(tableName)
  })

  describe('logDecision', () => {
    it('should log an activation decision', async () => {
      const decision: ActivationDecision = {
        should_respond: true,
        confidence: 0.95,
        reasons: ['Direct mention', 'Question asked'],
      }

      ddbMock.on(PutCommand).resolves({})

      await store.logDecision('msg-001', decision)

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
      expect(call.args[0].input.Item?.message_id).toBe('msg-001')
      expect(call.args[0].input.Item?.should_respond).toBe(true)
    })

    it('should log decisions to not respond', async () => {
      const decision: ActivationDecision = {
        should_respond: false,
        confidence: 0.85,
        reasons: ['Not directly relevant'],
      }

      ddbMock.on(PutCommand).resolves({})

      await store.logDecision('msg-002', decision)

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.Item?.should_respond).toBe(false)
    })

    it('should throw error on DynamoDB failure', async () => {
      const decision: ActivationDecision = {
        should_respond: true,
        confidence: 0.9,
        reasons: ['Test'],
      }

      ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'))

      await expect(store.logDecision('msg-003', decision)).rejects.toThrow('DynamoDB error')
    })
  })

  describe('getDecisionHistory', () => {
    it('should retrieve decision history for a thread', async () => {
      const mockDecisions = [
        {
          message_id: 'msg-001',
          thread_id: 'thread-001',
          should_respond: true,
          confidence: 0.95,
          reasons: ['Direct mention'],
          timestamp: '2025-01-15T10:00:00Z',
        },
        {
          message_id: 'msg-002',
          thread_id: 'thread-001',
          should_respond: false,
          confidence: 0.8,
          reasons: ['Not relevant'],
          timestamp: '2025-01-15T11:00:00Z',
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockDecisions })

      const result = await store.getDecisionHistory('thread-001')

      expect(result).toEqual(mockDecisions)
      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should return empty array when no history found', async () => {
      ddbMock.on(QueryCommand).resolves({})

      const result = await store.getDecisionHistory('empty-thread')

      expect(result).toEqual([])
    })
  })
})
