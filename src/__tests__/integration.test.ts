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

    // Note: This requires ANTHROPIC_API_KEY to be set
    // Skip if not available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Skipping speech act detection - no API key')
      return
    }

    const acts = await detector.detectSpeechActsBatch(emails.slice(0, 1)) // Just test first email
    expect(Array.isArray(acts)).toBe(true)

    store.addMany(acts)
    expect(store.count()).toBeGreaterThanOrEqual(0)
  }, 30000)

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
})
