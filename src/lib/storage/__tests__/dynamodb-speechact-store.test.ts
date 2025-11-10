import { describe, it, expect, beforeEach } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { DynamoDBSpeechActStore } from '~/lib/storage/dynamodb-speechact-store.js'
import { SpeechActType, type SpeechAct } from '~/lib/types/index.js'

const ddbMock = mockClient(DynamoDBDocumentClient)

describe('DynamoDBSpeechActStore', () => {
  let store: DynamoDBSpeechActStore
  const tableName = 'test-speech-acts'

  beforeEach(() => {
    ddbMock.reset()
    store = new DynamoDBSpeechActStore(tableName)
  })

  describe('storeSpeechAct', () => {
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

      ddbMock.on(PutCommand).resolves({})

      await store.storeSpeechAct(speechAct)

      expect(ddbMock.calls()).toHaveLength(1)
      const call = ddbMock.call(0)
      expect(call.args[0].input.TableName).toBe(tableName)
      expect(call.args[0].input.Item?.id).toBe('act-001')
      expect(call.args[0].input.Item?.type).toBe('request')
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

      ddbMock.on(PutCommand).resolves({})

      await store.storeSpeechAct(speechAct)

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

      ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'))

      await expect(store.storeSpeechAct(speechAct)).rejects.toThrow('DynamoDB error')
    })
  })

  describe('getSpeechAct', () => {
    it('should retrieve a speech act by ID', async () => {
      const mockSpeechAct: SpeechAct = {
        id: 'act-001',
        type: SpeechActType.REQUEST,
        content: 'Test request',
        actor: { email: 'alice@example.com' },
        participants: [{ email: 'alice@example.com' }],
        confidence: 0.9,
        source_message_id: 'msg-001',
        thread_id: 'thread-001',
        timestamp: '2025-01-15T10:00:00Z',
      }

      ddbMock.on(GetCommand).resolves({ Item: mockSpeechAct })

      const result = await store.getSpeechAct('act-001')

      expect(result).toEqual(mockSpeechAct)
      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should return undefined when speech act not found', async () => {
      ddbMock.on(GetCommand).resolves({})

      const result = await store.getSpeechAct('nonexistent')

      expect(result).toBeUndefined()
    })
  })

  describe('getThreadSpeechActs', () => {
    it('should retrieve all speech acts for a thread', async () => {
      const mockSpeechActs: SpeechAct[] = [
        {
          id: 'act-001',
          type: SpeechActType.REQUEST,
          content: 'Request 1',
          actor: { email: 'alice@example.com' },
          participants: [{ email: 'alice@example.com' }],
          confidence: 0.9,
          source_message_id: 'msg-001',
          thread_id: 'thread-001',
          timestamp: '2025-01-15T10:00:00Z',
        },
        {
          id: 'act-002',
          type: SpeechActType.COMMITMENT,
          content: 'Commitment 1',
          actor: { email: 'bob@example.com' },
          participants: [{ email: 'bob@example.com' }],
          confidence: 0.95,
          source_message_id: 'msg-002',
          thread_id: 'thread-001',
          timestamp: '2025-01-15T11:00:00Z',
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockSpeechActs })

      const result = await store.getThreadSpeechActs('thread-001')

      expect(result).toEqual(mockSpeechActs)
      expect(ddbMock.calls()).toHaveLength(1)
    })

    it('should return empty array when no speech acts found', async () => {
      ddbMock.on(QueryCommand).resolves({})

      const result = await store.getThreadSpeechActs('empty-thread')

      expect(result).toEqual([])
    })
  })

  describe('getSpeechActsByType', () => {
    it('should retrieve speech acts by type', async () => {
      const mockSpeechActs: SpeechAct[] = [
        {
          id: 'act-001',
          type: SpeechActType.REQUEST,
          content: 'Request 1',
          actor: { email: 'alice@example.com' },
          participants: [{ email: 'alice@example.com' }],
          confidence: 0.9,
          source_message_id: 'msg-001',
          thread_id: 'thread-001',
          timestamp: '2025-01-15T10:00:00Z',
        },
        {
          id: 'act-002',
          type: SpeechActType.REQUEST,
          content: 'Request 2',
          actor: { email: 'bob@example.com' },
          participants: [{ email: 'bob@example.com' }],
          confidence: 0.85,
          source_message_id: 'msg-002',
          thread_id: 'thread-001',
          timestamp: '2025-01-15T11:00:00Z',
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockSpeechActs })

      const result = await store.getSpeechActsByType('thread-001', SpeechActType.REQUEST)

      expect(result).toEqual(mockSpeechActs)
      expect(result.every(act => act.type === SpeechActType.REQUEST)).toBe(true)
    })

    it('should handle different speech act types', async () => {
      const mockCommitments: SpeechAct[] = [
        {
          id: 'act-003',
          type: SpeechActType.COMMITMENT,
          content: 'I will do this',
          actor: { email: 'charlie@example.com' },
          participants: [{ email: 'charlie@example.com' }],
          confidence: 0.95,
          source_message_id: 'msg-003',
          thread_id: 'thread-002',
          timestamp: '2025-01-15T12:00:00Z',
        },
      ]

      ddbMock.on(QueryCommand).resolves({ Items: mockCommitments })

      const result = await store.getSpeechActsByType('thread-002', SpeechActType.COMMITMENT)

      expect(result).toEqual(mockCommitments)
    })
  })
})
