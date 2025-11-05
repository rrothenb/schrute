import { describe, it, expect, beforeEach } from '@jest/globals'
import { createSpeechActStore } from '../store.js'
import { SpeechAct, SpeechActType } from '../../types/index.js'

describe('Speech Act Store', () => {
  let store: ReturnType<typeof createSpeechActStore>

  beforeEach(() => {
    store = createSpeechActStore()
  })

  const createTestAct = (overrides: Partial<SpeechAct> = {}): SpeechAct => ({
    id: 'act-1',
    type: SpeechActType.REQUEST,
    content: 'Please send the report',
    actor: { email: 'alice@test.com', name: 'Alice' },
    participants: [
      { email: 'alice@test.com', name: 'Alice' },
      { email: 'bob@test.com', name: 'Bob' },
    ],
    confidence: 0.95,
    source_message_id: 'msg-1',
    thread_id: 'thread-1',
    timestamp: '2025-01-15T10:00:00Z',
    ...overrides,
  })

  describe('basic operations', () => {
    it('should add and retrieve speech act', () => {
      const act = createTestAct()
      store.add(act)

      const retrieved = store.get(act.id)
      expect(retrieved).toEqual(act)
    })

    it('should return undefined for non-existent act', () => {
      const retrieved = store.get('non-existent')
      expect(retrieved).toBeUndefined()
    })

    it('should count speech acts', () => {
      expect(store.count()).toBe(0)

      store.add(createTestAct({ id: 'act-1' }))
      expect(store.count()).toBe(1)

      store.add(createTestAct({ id: 'act-2' }))
      expect(store.count()).toBe(2)
    })

    it('should get all acts', () => {
      const acts = [
        createTestAct({ id: 'act-1' }),
        createTestAct({ id: 'act-2' }),
        createTestAct({ id: 'act-3' }),
      ]

      store.addMany(acts)

      const all = store.getAll()
      expect(all).toHaveLength(3)
    })
  })

  describe('query by type', () => {
    it('should filter by type', () => {
      store.add(createTestAct({ id: 'act-1', type: SpeechActType.REQUEST }))
      store.add(createTestAct({ id: 'act-2', type: SpeechActType.QUESTION }))
      store.add(createTestAct({ id: 'act-3', type: SpeechActType.COMMITMENT }))

      const requests = store.getByType(SpeechActType.REQUEST)
      expect(requests).toHaveLength(1)
      expect(requests[0].id).toBe('act-1')
    })
  })

  describe('query by thread', () => {
    it('should filter by thread', () => {
      store.add(createTestAct({ id: 'act-1', thread_id: 'thread-1' }))
      store.add(createTestAct({ id: 'act-2', thread_id: 'thread-1' }))
      store.add(createTestAct({ id: 'act-3', thread_id: 'thread-2' }))

      const thread1Acts = store.getByThread('thread-1')
      expect(thread1Acts).toHaveLength(2)
    })
  })

  describe('query method', () => {
    it('should query by multiple criteria', () => {
      store.addMany([
        createTestAct({ id: 'act-1', type: SpeechActType.REQUEST, confidence: 0.95 }),
        createTestAct({ id: 'act-2', type: SpeechActType.REQUEST, confidence: 0.75 }),
        createTestAct({ id: 'act-3', type: SpeechActType.QUESTION, confidence: 0.85 }),
      ])

      const highConfidenceRequests = store.query({
        type: SpeechActType.REQUEST,
        minConfidence: 0.9,
      })

      expect(highConfidenceRequests).toHaveLength(1)
      expect(highConfidenceRequests[0].id).toBe('act-1')
    })

    it('should query by participant', () => {
      store.addMany([
        createTestAct({
          id: 'act-1',
          participants: [{ email: 'alice@test.com', name: 'Alice' }],
        }),
        createTestAct({
          id: 'act-2',
          participants: [{ email: 'bob@test.com', name: 'Bob' }],
        }),
      ])

      const aliceActs = store.query({ participantEmail: 'alice@test.com' })
      expect(aliceActs).toHaveLength(1)
      expect(aliceActs[0].id).toBe('act-1')
    })
  })
})
