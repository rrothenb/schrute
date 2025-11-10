import { describe, it, expect } from '@jest/globals'
import { buildThreads, getEmailParticipants } from '~/lib/email/index.js'
import type { Email } from '~/lib/types/index.js'

describe('Email Threading and Utilities', () => {
  describe('getEmailParticipants', () => {
    it('should extract all participants from an email', () => {
      const email: Email = {
        message_id: 'msg-001',
        thread_id: 'thread-001',
        from: { email: 'alice@example.com', name: 'Alice' },
        to: [
          { email: 'bob@example.com', name: 'Bob' },
          { email: 'charlie@example.com', name: 'Charlie' },
        ],
        cc: [
          { email: 'diana@example.com', name: 'Diana' },
        ],
        subject: 'Test',
        body: 'Body',
        timestamp: '2025-01-15T10:00:00Z',
      }

      const participants = getEmailParticipants(email)

      expect(participants).toHaveLength(4)
      expect(participants).toContainEqual({ email: 'alice@example.com', name: 'Alice' })
      expect(participants).toContainEqual({ email: 'bob@example.com', name: 'Bob' })
      expect(participants).toContainEqual({ email: 'charlie@example.com', name: 'Charlie' })
      expect(participants).toContainEqual({ email: 'diana@example.com', name: 'Diana' })
    })

    it('should handle email without CC', () => {
      const email: Email = {
        message_id: 'msg-001',
        thread_id: 'thread-001',
        from: { email: 'alice@example.com', name: 'Alice' },
        to: [{ email: 'bob@example.com', name: 'Bob' }],
        cc: [],
        subject: 'Test',
        body: 'Body',
        timestamp: '2025-01-15T10:00:00Z',
      }

      const participants = getEmailParticipants(email)

      expect(participants).toHaveLength(2)
    })

    it('should not include duplicates', () => {
      const email: Email = {
        message_id: 'msg-001',
        thread_id: 'thread-001',
        from: { email: 'alice@example.com', name: 'Alice' },
        to: [
          { email: 'bob@example.com', name: 'Bob' },
          { email: 'alice@example.com', name: 'Alice' }, // Duplicate from sender
        ],
        cc: [],
        subject: 'Test',
        body: 'Body',
        timestamp: '2025-01-15T10:00:00Z',
      }

      const participants = getEmailParticipants(email)

      const emails = participants.map(p => p.email)
      const uniqueEmails = [...new Set(emails)]
      expect(emails.length).toBe(uniqueEmails.length)
    })
  })

  describe('buildThreads', () => {
    it('should group emails by thread_id', () => {
      const emails: Email[] = [
        {
          message_id: 'msg-001',
          thread_id: 'thread-001',
          from: { email: 'alice@example.com' },
          to: [{ email: 'bob@example.com' }],
          cc: [],
          subject: 'Test 1',
          body: 'Body 1',
          timestamp: '2025-01-15T10:00:00Z',
        },
        {
          message_id: 'msg-002',
          thread_id: 'thread-001',
          from: { email: 'bob@example.com' },
          to: [{ email: 'alice@example.com' }],
          cc: [],
          subject: 'Re: Test 1',
          body: 'Body 2',
          timestamp: '2025-01-15T11:00:00Z',
        },
        {
          message_id: 'msg-003',
          thread_id: 'thread-002',
          from: { email: 'charlie@example.com' },
          to: [{ email: 'diana@example.com' }],
          cc: [],
          subject: 'Different Thread',
          body: 'Body 3',
          timestamp: '2025-01-15T12:00:00Z',
        },
      ]

      const threads = buildThreads(emails)

      expect(threads.length).toBe(2)
      expect(threads[0].messages.length).toBe(2)
      expect(threads[1].messages.length).toBe(1)
    })

    it('should sort messages by timestamp within threads', () => {
      const emails: Email[] = [
        {
          message_id: 'msg-002',
          thread_id: 'thread-001',
          from: { email: 'bob@example.com' },
          to: [{ email: 'alice@example.com' }],
          cc: [],
          subject: 'Re: Test',
          body: 'Reply',
          timestamp: '2025-01-15T11:00:00Z',
        },
        {
          message_id: 'msg-001',
          thread_id: 'thread-001',
          from: { email: 'alice@example.com' },
          to: [{ email: 'bob@example.com' }],
          cc: [],
          subject: 'Test',
          body: 'Original',
          timestamp: '2025-01-15T10:00:00Z',
        },
      ]

      const threads = buildThreads(emails)

      expect(threads[0].messages[0].message_id).toBe('msg-001')
      expect(threads[0].messages[1].message_id).toBe('msg-002')
    })

    it('should collect all unique participants in thread', () => {
      const emails: Email[] = [
        {
          message_id: 'msg-001',
          thread_id: 'thread-001',
          from: { email: 'alice@example.com', name: 'Alice' },
          to: [{ email: 'bob@example.com', name: 'Bob' }],
          cc: [],
          subject: 'Test',
          body: 'Body',
          timestamp: '2025-01-15T10:00:00Z',
        },
        {
          message_id: 'msg-002',
          thread_id: 'thread-001',
          from: { email: 'bob@example.com', name: 'Bob' },
          to: [
            { email: 'alice@example.com', name: 'Alice' },
            { email: 'charlie@example.com', name: 'Charlie' },
          ],
          cc: [],
          subject: 'Re: Test',
          body: 'Reply',
          timestamp: '2025-01-15T11:00:00Z',
        },
      ]

      const threads = buildThreads(emails)

      expect(threads[0].participants.length).toBe(3)
      const participantEmails = threads[0].participants.map(p => p.email)
      expect(participantEmails).toContain('alice@example.com')
      expect(participantEmails).toContain('bob@example.com')
      expect(participantEmails).toContain('charlie@example.com')
    })

    it('should handle empty email array', () => {
      const threads = buildThreads([])

      expect(threads).toEqual([])
    })

    it('should use subject from first message', () => {
      const emails: Email[] = [
        {
          message_id: 'msg-001',
          thread_id: 'thread-001',
          from: { email: 'alice@example.com' },
          to: [{ email: 'bob@example.com' }],
          cc: [],
          subject: 'Original Subject',
          body: 'Body',
          timestamp: '2025-01-15T10:00:00Z',
        },
        {
          message_id: 'msg-002',
          thread_id: 'thread-001',
          from: { email: 'bob@example.com' },
          to: [{ email: 'alice@example.com' }],
          cc: [],
          subject: 'Re: Original Subject',
          body: 'Reply',
          timestamp: '2025-01-15T11:00:00Z',
        },
      ]

      const threads = buildThreads(emails)

      expect(threads[0].subject).toBe('Original Subject')
    })
  })
})
