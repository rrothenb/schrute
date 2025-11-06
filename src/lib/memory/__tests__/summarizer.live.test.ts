import { describe, it, expect, beforeAll } from '@jest/globals'
import { resolve } from 'path'
import { loadEmailsFromYaml } from '../../email/parser.js'
import { summarizeEmails, summarizeEmailBatches } from '../summarizer.js'
import { Email } from '~/lib/types/index.js'

/**
 * Live API Tests for Memory Summarizer
 *
 * These tests make actual calls to the Anthropic Claude API.
 * They are skipped if ANTHROPIC_API_KEY is not set.
 *
 * To run these tests:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   npm test -- summarizer.live.test.ts
 *
 * Estimated API costs per test run: ~$0.03-0.05
 */

const hasApiKey = !!process.env.ANTHROPIC_API_KEY
const describeIfApiKey = hasApiKey ? describe : describe.skip

describeIfApiKey('Memory Summarizer - Live API Tests', () => {
  let projectAlphaEmails: Email[]
  let meetingRequestEmails: Email[]

  beforeAll(async () => {
    // Load sample emails for testing
    projectAlphaEmails = await loadEmailsFromYaml(
      resolve(process.cwd(), 'events/thread-project-alpha.yaml')
    )
    meetingRequestEmails = await loadEmailsFromYaml(
      resolve(process.cwd(), 'events/thread-meeting-request.yaml')
    )
  }, 30000)

  it('should summarize a single email', async () => {
    const emails = [projectAlphaEmails[0]]
    const threadId = 'test-thread-001'

    const summary = await summarizeEmails(emails, threadId)

    expect(summary.thread_id).toBe(threadId)
    expect(summary.summary).toBeDefined()
    expect(typeof summary.summary).toBe('string')
    expect(summary.summary.length).toBeGreaterThan(10)

    expect(Array.isArray(summary.key_points)).toBe(true)
    expect(summary.key_points.length).toBeGreaterThan(0)

    expect(Array.isArray(summary.participants)).toBe(true)
    expect(summary.participants.length).toBeGreaterThan(0)

    expect(Array.isArray(summary.message_ids)).toBe(true)
    expect(summary.message_ids).toContain(emails[0].message_id)

    expect(summary.created_at).toBeDefined()
  }, 30000)

  it('should summarize multiple emails in a thread', async () => {
    const threadId = projectAlphaEmails[0].thread_id

    const summary = await summarizeEmails(projectAlphaEmails, threadId)

    expect(summary.thread_id).toBe(threadId)
    expect(summary.summary).toBeDefined()
    expect(summary.summary.length).toBeGreaterThan(20)

    // Should have multiple key points for a multi-email thread
    expect(summary.key_points.length).toBeGreaterThanOrEqual(1)
    expect(summary.key_points.length).toBeLessThanOrEqual(7)

    // Should capture all participants
    expect(summary.participants.length).toBeGreaterThan(0)

    // Should capture all message IDs
    expect(summary.message_ids.length).toBe(projectAlphaEmails.length)
    projectAlphaEmails.forEach((email) => {
      expect(summary.message_ids).toContain(email.message_id)
    })
  }, 30000)

  it('should extract key points from email content', async () => {
    const threadId = projectAlphaEmails[0].thread_id

    const summary = await summarizeEmails(projectAlphaEmails, threadId)

    expect(Array.isArray(summary.key_points)).toBe(true)

    // Key points should be concise
    summary.key_points.forEach((point) => {
      expect(typeof point).toBe('string')
      expect(point.length).toBeGreaterThan(5)
      expect(point.length).toBeLessThan(200) // Should be concise
    })
  }, 30000)

  it('should capture all participants from emails', async () => {
    const threadId = projectAlphaEmails[0].thread_id

    const summary = await summarizeEmails(projectAlphaEmails, threadId)

    // Build expected participant list
    const expectedEmails = new Set<string>()
    projectAlphaEmails.forEach((email) => {
      expectedEmails.add(email.from.email)
      email.to.forEach((addr) => expectedEmails.add(addr.email))
      email.cc?.forEach((addr) => expectedEmails.add(addr.email))
    })

    // Check all expected participants are in summary
    const summaryEmails = new Set(summary.participants.map((p) => p.email))
    expectedEmails.forEach((email) => {
      expect(summaryEmails.has(email)).toBe(true)
    })
  }, 30000)

  it('should summarize different thread types consistently', async () => {
    const summary1 = await summarizeEmails(
      projectAlphaEmails,
      projectAlphaEmails[0].thread_id
    )

    const summary2 = await summarizeEmails(
      meetingRequestEmails,
      meetingRequestEmails[0].thread_id
    )

    // Both should have valid structure
    expect(summary1.summary).toBeDefined()
    expect(summary2.summary).toBeDefined()

    expect(summary1.key_points.length).toBeGreaterThan(0)
    expect(summary2.key_points.length).toBeGreaterThan(0)

    // Summaries should be different (different content)
    expect(summary1.summary).not.toBe(summary2.summary)
  }, 60000)

  it('should handle batch summarization', async () => {
    const emailGroups = [
      [projectAlphaEmails[0]],
      projectAlphaEmails.slice(1, 3),
    ]

    const threadId = projectAlphaEmails[0].thread_id

    const summaries = await summarizeEmailBatches(emailGroups, threadId)

    expect(Array.isArray(summaries)).toBe(true)
    expect(summaries.length).toBe(2)

    summaries.forEach((summary) => {
      expect(summary.thread_id).toBe(threadId)
      expect(summary.summary).toBeDefined()
      expect(summary.key_points.length).toBeGreaterThan(0)
      expect(summary.participants.length).toBeGreaterThan(0)
    })
  }, 60000)

  it('should throw error for empty email list', async () => {
    await expect(summarizeEmails([], 'test-thread')).rejects.toThrow(
      'Cannot summarize empty email list'
    )
  })

  it('should handle emails with minimal content', async () => {
    const minimalEmail: Email = {
      message_id: 'msg-minimal-001',
      thread_id: 'thread-minimal',
      from: { email: 'test@company.com', name: 'Test User' },
      to: [{ email: 'recipient@company.com', name: 'Recipient' }],
      cc: [],
      subject: 'Quick note',
      body: 'OK',
      timestamp: new Date().toISOString(),
      in_reply_to: undefined,
    }

    const summary = await summarizeEmails([minimalEmail], 'thread-minimal')

    expect(summary.summary).toBeDefined()
    expect(summary.key_points).toBeDefined()
    expect(Array.isArray(summary.key_points)).toBe(true)
    // Minimal content like "OK" may have no key points - that's valid
    expect(summary.participants.length).toBe(2) // From and To
  }, 30000)

  it('should handle emails with long content', async () => {
    const longBody = `
      This is a detailed email with multiple paragraphs discussing various topics.

      First, we need to address the project timeline. The current schedule shows
      we are behind by approximately two weeks. This is due to several factors
      including resource constraints and unexpected technical challenges.

      Second, the budget needs to be reviewed. We have spent more than anticipated
      on infrastructure costs. A detailed breakdown will be provided in the next
      meeting.

      Third, team morale is an important consideration. We should plan a team
      building activity to help everyone recharge.

      Finally, stakeholder communication needs improvement. We should establish
      a weekly update cadence to keep everyone informed.
    `

    const longEmail: Email = {
      message_id: 'msg-long-001',
      thread_id: 'thread-long',
      from: { email: 'manager@company.com', name: 'Manager' },
      to: [{ email: 'team@company.com', name: 'Team' }],
      cc: [],
      subject: 'Project Status Update',
      body: longBody,
      timestamp: new Date().toISOString(),
      in_reply_to: undefined,
    }

    const summary = await summarizeEmails([longEmail], 'thread-long')

    expect(summary.summary).toBeDefined()
    expect(summary.summary.length).toBeLessThan(longBody.length) // Should be shorter

    // Should extract multiple key points from detailed email
    expect(summary.key_points.length).toBeGreaterThanOrEqual(3)
    expect(summary.key_points.length).toBeLessThanOrEqual(7)
  }, 30000)

  it('should preserve timestamps in metadata', async () => {
    const beforeTime = Date.now()

    const summary = await summarizeEmails(
      [projectAlphaEmails[0]],
      'test-thread'
    )

    const afterTime = Date.now()
    const summaryTime = new Date(summary.created_at).getTime()

    expect(summaryTime).toBeGreaterThanOrEqual(beforeTime)
    expect(summaryTime).toBeLessThanOrEqual(afterTime)
  }, 30000)
})

if (!hasApiKey) {
  console.log('⚠️  Skipping Memory Summarizer live API tests - ANTHROPIC_API_KEY not set')
}
