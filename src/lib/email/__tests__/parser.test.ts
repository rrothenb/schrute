import { describe, it, expect } from '@jest/globals'
import { buildThreads } from '../parser.js'
import { Email } from '../../types/index.js'

describe('Email Threading', () => {
  it('should build threads from emails', () => {
    const emails: Email[] = [
      {
        message_id: 'msg-1',
        thread_id: 'thread-1',
        from: { email: 'alice@test.com', name: 'Alice' },
        to: [{ email: 'bob@test.com', name: 'Bob' }],
        cc: [],
        subject: 'Test Subject',
        body: 'Hello',
        timestamp: '2025-01-15T10:00:00Z',
      },
      {
        message_id: 'msg-2',
        thread_id: 'thread-1',
        from: { email: 'bob@test.com', name: 'Bob' },
        to: [{ email: 'alice@test.com', name: 'Alice' }],
        cc: [],
        subject: 'Re: Test Subject',
        body: 'Hi back',
        timestamp: '2025-01-15T11:00:00Z',
        in_reply_to: 'msg-1',
      },
      {
        message_id: 'msg-3',
        thread_id: 'thread-2',
        from: { email: 'charlie@test.com', name: 'Charlie' },
        to: [{ email: 'alice@test.com', name: 'Alice' }],
        cc: [],
        subject: 'Different Thread',
        body: 'Another conversation',
        timestamp: '2025-01-15T12:00:00Z',
      },
    ]

    const threads = buildThreads(emails)

    expect(threads).toHaveLength(2)
    expect(threads[0].thread_id).toBe('thread-1')
    expect(threads[0].messages).toHaveLength(2)
    expect(threads[1].thread_id).toBe('thread-2')
    expect(threads[1].messages).toHaveLength(1)
  })

  it('should extract unique participants', () => {
    const emails: Email[] = [
      {
        message_id: 'msg-1',
        thread_id: 'thread-1',
        from: { email: 'alice@test.com', name: 'Alice' },
        to: [{ email: 'bob@test.com', name: 'Bob' }],
        cc: [{ email: 'charlie@test.com', name: 'Charlie' }],
        subject: 'Test',
        body: 'Body',
        timestamp: '2025-01-15T10:00:00Z',
      },
      {
        message_id: 'msg-2',
        thread_id: 'thread-1',
        from: { email: 'bob@test.com', name: 'Bob' },
        to: [{ email: 'alice@test.com', name: 'Alice' }],
        cc: [],
        subject: 'Re: Test',
        body: 'Reply',
        timestamp: '2025-01-15T11:00:00Z',
      },
    ]

    const threads = buildThreads(emails)

    expect(threads[0].participants).toHaveLength(3)
    const participantEmails = threads[0].participants.map((p: { email: string }) => p.email)
    expect(participantEmails).toContain('alice@test.com')
    expect(participantEmails).toContain('bob@test.com')
    expect(participantEmails).toContain('charlie@test.com')
  })

  it('should handle empty email list', () => {
    const threads = buildThreads([])
    expect(threads).toHaveLength(0)
  })

  it('should use subject from first message', () => {
    const emails: Email[] = [
      {
        message_id: 'msg-1',
        thread_id: 'thread-1',
        from: { email: 'alice@test.com', name: 'Alice' },
        to: [{ email: 'bob@test.com', name: 'Bob' }],
        cc: [],
        subject: 'Original Subject',
        body: 'Body',
        timestamp: '2025-01-15T10:00:00Z',
      },
      {
        message_id: 'msg-2',
        thread_id: 'thread-1',
        from: { email: 'bob@test.com', name: 'Bob' },
        to: [{ email: 'alice@test.com', name: 'Alice' }],
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
