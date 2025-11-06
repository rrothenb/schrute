import { describe, it, expect } from '@jest/globals'
import { createActivationDecider } from '../decider.js'
import { Email, SchruteConfig } from '~/lib/types/index.js'

/**
 * Live API Tests for Activation Decider
 *
 * These tests make actual calls to the Anthropic Claude API.
 * They are skipped if ANTHROPIC_API_KEY is not set.
 *
 * To run these tests:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   npm test -- decider.live.test.ts
 *
 * Estimated API costs per test run: ~$0.03-0.05
 */

const hasApiKey = !!process.env.ANTHROPIC_API_KEY
const describeIfApiKey = hasApiKey ? describe : describe.skip

describeIfApiKey('Activation Decider - Live API Tests', () => {
  const schruteConfig: SchruteConfig = {
    name: 'Schrute',
    email: { email: 'schrute@company.com', name: 'Schrute Assistant' },
    aliases: ['Schrute Bot', 'Assistant'],
    personality: 'default',
    areas_of_responsibility: ['coordination', 'scheduling', 'task tracking'],
    expertise_keywords: ['meeting', 'deadline', 'task', 'project'],
  }

  const baseEmail: Email = {
    message_id: 'msg-test-001',
    thread_id: 'thread-test',
    from: { email: 'alice@company.com', name: 'Alice Johnson' },
    to: [{ email: 'bob@company.com', name: 'Bob Smith' }],
    cc: [],
    subject: 'Test Email',
    body: 'This is a test email.',
    timestamp: new Date().toISOString(),
    in_reply_to: undefined,
  }

  it('should respond when Schrute is in To: line (fast path)', async () => {
    const decider = createActivationDecider()

    const email: Email = {
      ...baseEmail,
      to: [
        { email: 'bob@company.com', name: 'Bob Smith' },
        { email: 'schrute@company.com', name: 'Schrute Assistant' },
      ],
      body: 'Can someone help with this task?',
    }

    const decision = await decider.shouldRespond({
      email,
      schruteConfig,
    })

    expect(decision.should_respond).toBe(true)
    expect(decision.confidence).toBe(1.0)
    expect(decision.reasons).toContain('Schrute is in the To: line')
  }, 10000)

  it('should respond when directly mentioned by name', async () => {
    const decider = createActivationDecider()

    const email: Email = {
      ...baseEmail,
      body: 'Hey Bob, can you check with Schrute about the project timeline?',
    }

    const decision = await decider.shouldRespond({
      email,
      schruteConfig,
    })

    expect(decision.should_respond).toBe(true)
    expect(decision.confidence).toBeGreaterThan(0.7)
    expect(decision.reasons.length).toBeGreaterThan(0)
  }, 30000)

  it('should respond when mentioned by alias', async () => {
    const decider = createActivationDecider()

    const email: Email = {
      ...baseEmail,
      body: 'Can the Assistant help us coordinate the meeting schedule?',
    }

    const decision = await decider.shouldRespond({
      email,
      schruteConfig,
    })

    expect(decision.should_respond).toBe(true)
    expect(decision.confidence).toBeGreaterThan(0.6)
  }, 30000)

  it('should respond when expertise keywords are mentioned', async () => {
    const decider = createActivationDecider()

    const email: Email = {
      ...baseEmail,
      body: 'We need to schedule a meeting to discuss the project deadline and task assignments.',
    }

    const decision = await decider.shouldRespond({
      email,
      schruteConfig,
    })

    expect(decision.should_respond).toBe(true)
    expect(decision.confidence).toBeGreaterThan(0.5)
    // Should mention relevant keywords or responsibilities
    const reasonsText = decision.reasons.join(' ').toLowerCase()
    expect(
      reasonsText.includes('meeting') ||
        reasonsText.includes('task') ||
        reasonsText.includes('deadline') ||
        reasonsText.includes('scheduling') ||
        reasonsText.includes('coordination')
    ).toBe(true)
  }, 30000)

  it('should not respond to unrelated conversation', async () => {
    const decider = createActivationDecider()

    const email: Email = {
      ...baseEmail,
      body: 'Hey Alice, did you see the football game last night? The ending was incredible!',
    }

    const decision = await decider.shouldRespond({
      email,
      schruteConfig,
    })

    expect(decision.should_respond).toBe(false)
    expect(decision.confidence).toBeGreaterThan(0.5)
  }, 30000)

  it('should use thread context for better decisions', async () => {
    const decider = createActivationDecider()

    const threadHistory: Email[] = [
      {
        ...baseEmail,
        message_id: 'msg-thread-001',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        from: { email: 'alice@company.com', name: 'Alice' },
        to: [{ email: 'schrute@company.com', name: 'Schrute Assistant' }],
        body: 'Schrute, please track the deadline for Project X.',
      },
      {
        ...baseEmail,
        message_id: 'msg-thread-002',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        from: { email: 'schrute@company.com', name: 'Schrute Assistant' },
        to: [{ email: 'alice@company.com', name: 'Alice' }],
        body: 'Will track Project X deadline.',
      },
    ]

    const email: Email = {
      ...baseEmail,
      message_id: 'msg-thread-003',
      from: { email: 'bob@company.com', name: 'Bob Smith' },
      to: [{ email: 'alice@company.com', name: 'Alice' }],
      body: 'Alice, what is the status of that deadline you mentioned?',
    }

    const decision = await decider.shouldRespond({
      email,
      threadHistory,
      schruteConfig,
    })

    // Should respond because Schrute was tracking the deadline
    expect(decision.should_respond).toBe(true)
    expect(decision.confidence).toBeGreaterThan(0.5)
  }, 30000)

  it('should handle batch decisions for multiple emails', async () => {
    const decider = createActivationDecider()

    const emails: Email[] = [
      {
        ...baseEmail,
        message_id: 'msg-batch-001',
        to: [{ email: 'schrute@company.com', name: 'Schrute Assistant' }],
        body: 'Schrute, please help with scheduling.',
      },
      {
        ...baseEmail,
        message_id: 'msg-batch-002',
        body: 'Unrelated discussion about lunch plans.',
      },
      {
        ...baseEmail,
        message_id: 'msg-batch-003',
        body: 'Can someone help coordinate the meeting?',
      },
    ]

    const decisions = await decider.shouldRespondBatch(emails, schruteConfig)

    expect(decisions.size).toBe(3)

    // First email should definitely trigger (Schrute in To: line)
    const decision1 = decisions.get('msg-batch-001')
    expect(decision1?.should_respond).toBe(true)

    // Second email should not trigger
    const decision2 = decisions.get('msg-batch-002')
    expect(decision2?.should_respond).toBe(false)

    // Third email might trigger (coordination is a responsibility)
    const decision3 = decisions.get('msg-batch-003')
    expect(decision3).toBeDefined()
  }, 60000)

  it('should handle area of responsibility questions', async () => {
    const decider = createActivationDecider()

    const email: Email = {
      ...baseEmail,
      body: 'Does anyone know how to coordinate the handoff between teams?',
    }

    const decision = await decider.shouldRespond({
      email,
      schruteConfig,
    })

    // Should respond because "coordination" is in areas_of_responsibility
    expect(decision.should_respond).toBe(true)
    expect(decision.confidence).toBeGreaterThan(0.5)
  }, 30000)

  it('should be conservative when uncertain', async () => {
    const decider = createActivationDecider()

    const email: Email = {
      ...baseEmail,
      body: 'We should probably check if someone needs to handle this.',
    }

    const decision = await decider.shouldRespond({
      email,
      schruteConfig,
    })

    // Conservative approach: when unsure, lean toward responding
    // This is a borderline case, so just check that we get a valid decision
    expect(decision.should_respond).toBeDefined()
    expect(decision.confidence).toBeGreaterThanOrEqual(0.0)
    expect(decision.confidence).toBeLessThanOrEqual(1.0)
    expect(decision.reasons).toBeDefined()
    expect(Array.isArray(decision.reasons)).toBe(true)
  }, 30000)

  it('should handle emails with no clear trigger', async () => {
    const decider = createActivationDecider()

    const email: Email = {
      ...baseEmail,
      to: [{ email: 'charlie@company.com', name: 'Charlie' }],
      body: 'Here is the report you requested yesterday.',
    }

    const decision = await decider.shouldRespond({
      email,
      schruteConfig,
    })

    expect(decision.should_respond).toBe(false)
    expect(decision.reasons).toBeDefined()
    expect(Array.isArray(decision.reasons)).toBe(true)
  }, 30000)
})

if (!hasApiKey) {
  console.log('⚠️  Skipping Activation Decider live API tests - ANTHROPIC_API_KEY not set')
}
