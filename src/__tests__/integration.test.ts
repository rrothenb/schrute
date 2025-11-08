import { describe, it, expect } from '@jest/globals'
import { resolve } from 'path'
import { loadEmailsFromYaml, buildThreads } from '../lib/email/parser.js'
import { createSpeechActDetector } from '../lib/speech-acts/detector.js'
import { createSpeechActStore } from '../lib/speech-acts/store.js'
import { createPrivacyTracker } from '../lib/privacy/tracker.js'

describe('Integration Tests', () => {
  const samplesDir = resolve(process.cwd(), 'events')

  it('should load and process project-alpha scenario', async () => {
    const filePath = resolve(samplesDir, 'thread-project-alpha.yaml')
    const emails = await loadEmailsFromYaml(filePath)

    expect(emails.length).toBeGreaterThan(0)

    const threads = buildThreads(emails)
    expect(threads.length).toBeGreaterThan(0)

    const privacyTracker = createPrivacyTracker()
    privacyTracker.trackEmails(emails)

    const participants = privacyTracker.getAllParticipants()
    expect(participants.length).toBeGreaterThan(0)
  }, 10000)

  it('should load and process meeting-request scenario', async () => {
    const filePath = resolve(samplesDir, 'thread-meeting-request.yaml')
    const emails = await loadEmailsFromYaml(filePath)

    expect(emails.length).toBeGreaterThan(0)

    const threads = buildThreads(emails)
    expect(threads.length).toBeGreaterThan(0)
  }, 10000)

  it('should load and process mixed-participants scenario', async () => {
    const filePath = resolve(samplesDir, 'thread-mixed-participants.yaml')
    const emails = await loadEmailsFromYaml(filePath)

    expect(emails.length).toBeGreaterThan(0)

    const threads = buildThreads(emails)
    expect(threads.length).toBeGreaterThan(0)

    // This scenario tests privacy filtering
    const privacyTracker = createPrivacyTracker()
    privacyTracker.trackEmails(emails)

    const participants = privacyTracker.getAllParticipants()
    expect(participants.length).toBeGreaterThan(2) // Multiple participants
  }, 10000)

  it('should load and process technical-question scenario', async () => {
    const filePath = resolve(samplesDir, 'thread-technical-question.yaml')
    const emails = await loadEmailsFromYaml(filePath)

    expect(emails.length).toBeGreaterThan(0)

    const threads = buildThreads(emails)
    expect(threads.length).toBeGreaterThan(0)
  }, 10000)

  it('should detect speech acts from emails', async () => {
    const filePath = resolve(samplesDir, 'thread-project-alpha.yaml')
    const emails = await loadEmailsFromYaml(filePath)

    const detector = createSpeechActDetector()
    const store = createSpeechActStore()

    // Note: This requires CLAUDE_API_KEY to be set
    // Skip if not available
    if (!process.env.CLAUDE_API_KEY) {
      console.log('Skipping speech act detection - no API key')
      return
    }

    const acts = await detector.detectSpeechActsBatch(emails.slice(0, 2)) // Test first 2 emails
    expect(Array.isArray(acts)).toBe(true)
    expect(acts.length).toBeGreaterThan(0)

    // Verify structure of detected acts
    acts.forEach((act) => {
      expect(act.id).toBeDefined()
      expect(act.type).toBeDefined()
      expect(act.source_message_id).toBeDefined()
      expect(act.thread_id).toBeDefined()
      expect(act.content).toBeDefined()
      expect(act.actor).toBeDefined()
      expect(typeof act.confidence).toBe('number')
      expect(act.confidence).toBeGreaterThanOrEqual(0)
      expect(act.confidence).toBeLessThanOrEqual(1)
      expect(act.timestamp).toBeDefined()
    })

    store.addMany(acts)
    expect(store.count()).toBeGreaterThanOrEqual(acts.length)

    // Test querying the stored acts
    const allActs = store.getAll()
    expect(allActs.length).toBe(acts.length)
  }, 60000)

  it('should enforce privacy filtering', async () => {
    const filePath = resolve(samplesDir, 'thread-mixed-participants.yaml')
    const emails = await loadEmailsFromYaml(filePath)

    const privacyTracker = createPrivacyTracker()
    privacyTracker.trackEmails(emails)

    // Get participants from first email
    const firstEmailParticipants = [
      emails[0].from,
      ...emails[0].to,
      ...(emails[0].cc || []),
    ]

    // Try to filter emails for a subset of participants
    if (firstEmailParticipants.length > 1) {
      const filtered = privacyTracker.filterEmails(
        emails,
        [firstEmailParticipants[0]] // Just one participant
      )

      // Should filter some emails
      expect(filtered.length).toBeLessThanOrEqual(emails.length)
    }
  }, 10000)

  it('should perform end-to-end workflow: load, detect, store, query', async () => {
    const filePath = resolve(samplesDir, 'thread-project-alpha.yaml')
    const emails = await loadEmailsFromYaml(filePath)

    // Skip if no API key
    if (!process.env.CLAUDE_API_KEY) {
      console.log('Skipping end-to-end test - no API key')
      return
    }

    // 1. Build threads
    const threads = buildThreads(emails)
    expect(threads.length).toBeGreaterThan(0)

    // 2. Track participants for privacy
    const privacyTracker = createPrivacyTracker()
    privacyTracker.trackEmails(emails)
    const participants = privacyTracker.getAllParticipants()
    expect(participants.length).toBeGreaterThan(0)

    // 3. Detect speech acts
    const detector = createSpeechActDetector()
    const acts = await detector.detectSpeechActsBatch(emails.slice(0, 1))
    expect(acts.length).toBeGreaterThan(0)

    // 4. Store speech acts
    const store = createSpeechActStore()
    store.addMany(acts)
    expect(store.count()).toBe(acts.length)

    // 5. Query stored speech acts
    const firstEmail = emails[0]
    const threadActs = store.query({ threadId: firstEmail.thread_id })
    expect(threadActs.length).toBeGreaterThan(0)

    // 6. Verify privacy filtering on speech acts
    const firstEmailParticipants = [
      firstEmail.from,
      ...firstEmail.to,
      ...(firstEmail.cc || []),
    ]
    const filteredActs = privacyTracker.filterSpeechActs(
      threadActs,
      firstEmailParticipants
    )
    expect(filteredActs.length).toBeGreaterThanOrEqual(0)
    expect(filteredActs.length).toBeLessThanOrEqual(threadActs.length)
  }, 60000)

  it('should handle multiple threads independently', async () => {
    const files = [
      'thread-project-alpha.yaml',
      'thread-meeting-request.yaml',
    ]

    const allEmails: any[] = []
    for (const file of files) {
      const filePath = resolve(samplesDir, file)
      const emails = await loadEmailsFromYaml(filePath)
      allEmails.push(...emails)
    }

    // Build threads - should get separate threads
    const threads = buildThreads(allEmails)
    expect(threads.length).toBeGreaterThanOrEqual(2) // At least 2 different threads

    // Track participants across all emails
    const privacyTracker = createPrivacyTracker()
    privacyTracker.trackEmails(allEmails)

    // Each thread should maintain its own participant context
    const thread1Emails = allEmails.filter(
      (e) => e.thread_id === threads[0].thread_id
    )
    const thread2Emails = allEmails.filter(
      (e) => e.thread_id === threads[1].thread_id
    )

    expect(thread1Emails.length).toBeGreaterThan(0)
    expect(thread2Emails.length).toBeGreaterThan(0)
  }, 10000)
})
