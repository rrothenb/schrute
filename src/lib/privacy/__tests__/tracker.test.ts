import { describe, it, expect, beforeEach } from '@jest/globals'
import { createPrivacyTracker } from '../tracker.js'
import { Email, SpeechAct, SpeechActType } from '../../types/index.js'

describe('Privacy Tracker', () => {
  let tracker: ReturnType<typeof createPrivacyTracker>

  beforeEach(() => {
    tracker = createPrivacyTracker()
  })

  const createTestEmail = (overrides: Partial<Email> = {}): Email => ({
    message_id: 'msg-1',
    thread_id: 'thread-1',
    from: { email: 'alice@test.com', name: 'Alice' },
    to: [{ email: 'bob@test.com', name: 'Bob' }],
    cc: [],
    subject: 'Test',
    body: 'Body',
    timestamp: '2025-01-15T10:00:00Z',
    ...overrides,
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

  describe('tracking', () => {
    it('should track participants from emails', () => {
      const email = createTestEmail({
        from: { email: 'alice@test.com', name: 'Alice' },
        to: [{ email: 'bob@test.com', name: 'Bob' }],
        cc: [{ email: 'charlie@test.com', name: 'Charlie' }],
      })

      tracker.trackEmails([email])

      const participants = tracker.getAllParticipants()
      expect(participants).toHaveLength(3)
    })

    it('should track message access', () => {
      const email = createTestEmail({ message_id: 'msg-1' })
      tracker.trackEmails([email])

      expect(tracker.hasAccessToMessage('alice@test.com', 'msg-1')).toBe(true)
      expect(tracker.hasAccessToMessage('bob@test.com', 'msg-1')).toBe(true)
      expect(tracker.hasAccessToMessage('charlie@test.com', 'msg-1')).toBe(false)
    })

    it('should track speech act access', () => {
      const email = createTestEmail({ message_id: 'msg-1' })
      tracker.trackEmails([email])

      const act = createTestAct({ id: 'act-1', source_message_id: 'msg-1' })
      tracker.trackSpeechActs([act])

      expect(tracker.hasAccessToSpeechAct('alice@test.com', 'act-1')).toBe(true)
      expect(tracker.hasAccessToSpeechAct('bob@test.com', 'act-1')).toBe(true)
    })
  })

  describe('filtering', () => {
    it('should filter emails based on participant access', () => {
      const email1 = createTestEmail({
        message_id: 'msg-1',
        from: { email: 'alice@test.com', name: 'Alice' },
        to: [{ email: 'bob@test.com', name: 'Bob' }],
      })

      const email2 = createTestEmail({
        message_id: 'msg-2',
        from: { email: 'alice@test.com', name: 'Alice' },
        to: [
          { email: 'bob@test.com', name: 'Bob' },
          { email: 'charlie@test.com', name: 'Charlie' },
        ],
      })

      tracker.trackEmails([email1, email2])

      // Charlie should only see msg-2
      const filtered = tracker.filterEmails([email1, email2], [
        { email: 'charlie@test.com', name: 'Charlie' },
      ])

      expect(filtered).toHaveLength(1)
      expect(filtered[0].message_id).toBe('msg-2')
    })

    it('should filter speech acts based on participant access', () => {
      const email1 = createTestEmail({
        message_id: 'msg-1',
        from: { email: 'alice@test.com', name: 'Alice' },
        to: [{ email: 'bob@test.com', name: 'Bob' }],
      })

      tracker.trackEmails([email1])

      const act1 = createTestAct({ id: 'act-1', source_message_id: 'msg-1' })
      tracker.trackSpeechActs([act1])

      // Charlie should not see act-1
      const filtered = tracker.filterSpeechActs([act1], [
        { email: 'charlie@test.com', name: 'Charlie' },
      ])

      expect(filtered).toHaveLength(0)
    })
  })

  describe('getAllParticipants', () => {
    it('should return all tracked participants', () => {
      const emails = [
        createTestEmail({
          message_id: 'msg-1',
          from: { email: 'alice@test.com', name: 'Alice' },
          to: [{ email: 'bob@test.com', name: 'Bob' }],
        }),
        createTestEmail({
          message_id: 'msg-2',
          from: { email: 'charlie@test.com', name: 'Charlie' },
          to: [{ email: 'alice@test.com', name: 'Alice' }],
        }),
      ]

      tracker.trackEmails(emails)

      const participants = tracker.getAllParticipants()
      expect(participants).toHaveLength(3)
    })

    it('should return empty array when no participants tracked', () => {
      const participants = tracker.getAllParticipants()
      expect(participants).toHaveLength(0)
    })
  })
})
