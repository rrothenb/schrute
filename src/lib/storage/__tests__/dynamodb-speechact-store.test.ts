import { describe, it, expect, beforeEach } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBClient, PutItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBSpeechActStore } from '~/lib/storage/dynamodb-speechact-store.js'
import { SpeechActType, type SpeechAct } from '~/lib/types/index.js'

const ddbMock = mockClient(DynamoDBClient)

describe('DynamoDBSpeechActStore', () => {
  let store: DynamoDBSpeechActStore
  const tableName = 'test-speech-acts'

  beforeEach(() => {
    ddbMock.reset()
    store = new DynamoDBSpeechActStore(tableName)
  })

  describe('putSpeechAct', () => {
    it('should store a speech act in DynamoDB', async () => {
      const speechAct: SpeechAct = {
        id: 'act-001',
        type: SpeechActType.REQUEST,
        content: 'Please review the document',
        actor: { email: 'alice@example.com', name: 'Alice' },
        participants: [
          { email: 'alice@example.com', name: 'Alice' },
          { email: 'bob@example.com', name: 'Bob' },
        ],
        confidence: 0.95,
        source_message_id: 'msg-001',
        thread_id: 'thread-001',
        timestamp: '2025-01-15T10:00:00Z',
      }

      ddbMock.on(PutItemCommand).resolves({})

      await store.putSpeechAct(speechAct)

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
    })

    it('should handle speech acts with metadata', async () => {
      const speechAct: SpeechAct = {
        id: 'act-002',
        type: SpeechActType.COMMITMENT,
        content: 'I will complete by Friday',
        actor: { email: 'bob@example.com', name: 'Bob' },
        participants: [{ email: 'bob@example.com', name: 'Bob' }],
        confidence: 0.9,
        source_message_id: 'msg-002',
        thread_id: 'thread-001',
        timestamp: '2025-01-15T11:00:00Z',
        metadata: {
          deadline: '2025-01-19',
          priority: 'high',
        },
      }

      ddbMock.on(PutItemCommand).resolves({})

      await store.putSpeechAct(speechAct)

      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should throw error on DynamoDB failure', async () => {
      const speechAct: SpeechAct = {
        id: 'act-003',
        type: SpeechActType.QUESTION,
        content: 'What is the status?',
        actor: { email: 'charlie@example.com' },
        participants: [{ email: 'charlie@example.com' }],
        confidence: 0.85,
        source_message_id: 'msg-003',
        thread_id: 'thread-002',
        timestamp: '2025-01-15T12:00:00Z',
      }

      ddbMock.on(PutItemCommand).rejects(new Error('DynamoDB error'))

      await expect(store.putSpeechAct(speechAct)).rejects.toThrow('DynamoDB error')
    })
  })

  describe('getSpeechActsByThread', () => {
    it('should retrieve all speech acts for a thread', async () => {
      const mockItems = [
        {
          act_id: { S: 'act-001' },
          type: { S: 'request' },
          content: { S: 'Request 1' },
          from_email: { S: 'alice@example.com' },
          participants: { L: [{ S: 'alice@example.com' }] },
          confidence: { N: '0.9' },
          source_message_id: { S: 'msg-001' },
          thread_id: { S: 'thread-001' },
          timestamp: { S: '2025-01-15T10:00:00Z' },
          metadata: { M: {} },
        },
        {
          act_id: { S: 'act-002' },
          type: { S: 'commitment' },
          content: { S: 'Commitment 1' },
          from_email: { S: 'bob@example.com' },
          participants: { L: [{ S: 'bob@example.com' }] },
          confidence: { N: '0.95' },
          source_message_id: { S: 'msg-002' },
          thread_id: { S: 'thread-001' },
          timestamp: { S: '2025-01-15T11:00:00Z' },
          metadata: { M: {} },
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockItems })

      const result = await store.getSpeechActsByThread('thread-001')

      expect(result.length).toBe(2)
      expect(result[0].id).toBe('act-001')
      expect(result[0].type).toBe('request')
      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.IndexName).toBe('thread_id-timestamp-index')
    })

    it('should return empty array when no speech acts found', async () => {
      ddbMock.on(QueryCommand).resolves({})

      const result = await store.getSpeechActsByThread('empty-thread')

      expect(result).toEqual([])
    })
  })

  describe('getSpeechActsByType', () => {
    it('should retrieve speech acts by type', async () => {
      const mockItems = [
        {
          act_id: { S: 'act-001' },
          type: { S: 'request' },
          content: { S: 'Request 1' },
          from_email: { S: 'alice@example.com' },
          participants: { L: [{ S: 'alice@example.com' }] },
          confidence: { N: '0.9' },
          source_message_id: { S: 'msg-001' },
          thread_id: { S: 'thread-001' },
          timestamp: { S: '2025-01-15T10:00:00Z' },
          metadata: { M: {} },
        },
        {
          act_id: { S: 'act-002' },
          type: { S: 'request' },
          content: { S: 'Request 2' },
          from_email: { S: 'bob@example.com' },
          participants: { L: [{ S: 'bob@example.com' }] },
          confidence: { N: '0.85' },
          source_message_id: { S: 'msg-002' },
          thread_id: { S: 'thread-001' },
          timestamp: { S: '2025-01-15T11:00:00Z' },
          metadata: { M: {} },
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockItems })

      const result = await store.getSpeechActsByType('request')

      expect(result.length).toBe(2)
      expect(result.every(act => act.type === 'request')).toBe(true)
      const call = ddbMock.call(0)
      expect(call.args[0].input.IndexName).toBe('type-timestamp-index')
    })

    it('should handle different speech act types', async () => {
      const mockCommitments = [
        {
          act_id: { S: 'act-003' },
          type: { S: 'commitment' },
          content: { S: 'I will do this' },
          from_email: { S: 'charlie@example.com' },
          participants: { L: [{ S: 'charlie@example.com' }] },
          confidence: { N: '0.95' },
          source_message_id: { S: 'msg-003' },
          thread_id: { S: 'thread-002' },
          timestamp: { S: '2025-01-15T12:00:00Z' },
          metadata: { M: {} },
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockCommitments })

      const result = await store.getSpeechActsByType('commitment')

      expect(result.length).toBe(1)
      expect(result[0].type).toBe('commitment')
    })
  })

  describe('getAllSpeechActs', () => {
    it('should retrieve all speech acts', async () => {
      const mockItems = [
        {
          act_id: { S: 'act-001' },
          type: { S: 'request' },
          content: { S: 'Request' },
          from_email: { S: 'alice@example.com' },
          participants: { L: [{ S: 'alice@example.com' }] },
          confidence: { N: '0.9' },
          source_message_id: { S: 'msg-001' },
          thread_id: { S: 'thread-001' },
          timestamp: { S: '2025-01-15T10:00:00Z' },
          metadata: { M: {} },
        },
      ]

      ddbMock.on(ScanCommand).resolves({ Items: mockItems })

      const result = await store.getAllSpeechActs()

      expect(result.length).toBe(1)
      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should return empty array when no speech acts exist', async () => {
      ddbMock.on(ScanCommand).resolves({})

      const result = await store.getAllSpeechActs()

      expect(result).toEqual([])
    })
  })
})
