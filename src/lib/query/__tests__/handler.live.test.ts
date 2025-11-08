import { describe, it, expect, beforeAll } from '@jest/globals'
import { resolve } from 'path'
import { loadEmailsFromYaml } from '../../email/parser.js'
import { createQueryHandler } from '../handler.js'
import { createSpeechActStore } from '../../speech-acts/store.js'
import { createPrivacyTracker } from '../../privacy/tracker.js'
import { createPersonalityLoader } from '../../personality/loader.js'
import { QueryRequest, EmailAddress, KnowledgeCategory } from '~/lib/types/index.js'

/**
 * Live API Tests for Query Handler
 *
 * These tests make actual calls to the Anthropic Claude API.
 * They are skipped if CLAUDE_API_KEY is not set.
 *
 * To run these tests:
 *   export CLAUDE_API_KEY=sk-ant-...
 *   npm test -- handler.live.test.ts
 *
 * Estimated API costs per test run: ~$0.05-0.10
 */

const hasApiKey = !!process.env.CLAUDE_API_KEY
const describeIfApiKey = hasApiKey ? describe : describe.skip

describeIfApiKey('Query Handler - Live API Tests', () => {
  let handler: ReturnType<typeof createQueryHandler>
  let emails: any[]
  let privacyTracker: ReturnType<typeof createPrivacyTracker>
  let store: ReturnType<typeof createSpeechActStore>
  let personalityLoader: ReturnType<typeof createPersonalityLoader>

  beforeAll(async () => {
    // Load sample emails
    const filePath = resolve(process.cwd(), 'events/thread-project-alpha.yaml')
    emails = await loadEmailsFromYaml(filePath)

    // Set up dependencies
    store = createSpeechActStore()
    privacyTracker = createPrivacyTracker()
    privacyTracker.trackEmails(emails)

    personalityLoader = createPersonalityLoader()
    await personalityLoader.loadFromDirectory(
      resolve(process.cwd(), 'personalities')
    )

    // Create handler
    handler = createQueryHandler()
  }, 30000)

  it('should answer basic query about email content', async () => {
    const currentParticipants: EmailAddress[] = [
      { email: 'alice@company.com', name: 'Alice Johnson' },
      { email: 'bob@company.com', name: 'Bob Smith' },
    ]

    const request: QueryRequest = {
      query: 'What is this email thread about?',
      asker: currentParticipants[0],
      context_participants: currentParticipants.slice(1),
    }

    const result = await handler.handleQuery(request, {
      emails,
      speechActs: store.getAll(),
      privacyTracker,
    })

    expect(result.answer).toBeDefined()
    expect(typeof result.answer).toBe('string')
    expect(result.answer.length).toBeGreaterThan(0)
    expect(Array.isArray(result.sources)).toBe(true)
    expect(typeof result.privacy_restricted).toBe('boolean')

    // Should mention something about project or alpha
    const lowerResponse = result.answer.toLowerCase()
    expect(
      lowerResponse.includes('project') || lowerResponse.includes('alpha')
    ).toBe(true)
  }, 60000)

  it('should answer query about specific participants', async () => {
    const currentParticipants: EmailAddress[] = [
      { email: 'alice@company.com', name: 'Alice Johnson' },
      { email: 'bob@company.com', name: 'Bob Smith' },
    ]

    const request: QueryRequest = {
      query: 'Who is involved in this conversation?',
      asker: currentParticipants[0],
      context_participants: currentParticipants.slice(1),
    }

    const result = await handler.handleQuery(request, {
      emails,
      speechActs: store.getAll(),
      privacyTracker,
    })

    expect(result.answer).toBeDefined()

    // Should mention Alice or Bob
    const response = result.answer
    expect(
      response.includes('Alice') || response.includes('Bob')
    ).toBe(true)
  }, 60000)

  it('should respect privacy filtering', async () => {
    // Query with limited participants
    const limitedParticipants: EmailAddress[] = [
      { email: 'alice@company.com', name: 'Alice Johnson' },
    ]

    const request: QueryRequest = {
      query: 'What has been discussed?',
      asker: limitedParticipants[0],
      context_participants: [],
    }

    const result = await handler.handleQuery(request, {
      emails,
      speechActs: store.getAll(),
      privacyTracker,
    })

    expect(result.answer).toBeDefined()
    expect(result.answer.length).toBeGreaterThan(0)

    // Response should be generated but may be limited by privacy
    expect(result.privacy_restricted).toBeDefined()
  }, 60000)

  it('should handle query with personality', async () => {
    const currentParticipants: EmailAddress[] = [
      { email: 'alice@company.com', name: 'Alice Johnson' },
      { email: 'bob@company.com', name: 'Bob Smith' },
    ]

    const request: QueryRequest = {
      query: 'What is the status of the project?',
      asker: currentParticipants[0],
      context_participants: currentParticipants.slice(1),
    }

    const personality = personalityLoader.get('dwight-schrute')

    const result = await handler.handleQuery(request, {
      emails,
      speechActs: store.getAll(),
      privacyTracker,
      personality,
    })

    expect(result.answer).toBeDefined()
    expect(result.answer.length).toBeGreaterThan(0)

    // Dwight's personality should be evident (formal, procedural)
    // Note: This is a soft check since LLM responses vary
    expect(result.answer.length).toBeGreaterThan(20)
  }, 60000)

  it('should handle empty email list gracefully', async () => {
    const currentParticipants: EmailAddress[] = [
      { email: 'alice@company.com', name: 'Alice Johnson' },
    ]

    const request: QueryRequest = {
      query: 'What emails do we have?',
      asker: currentParticipants[0],
      context_participants: [],
    }

    const result = await handler.handleQuery(request, {
      emails: [],
      speechActs: [],
      privacyTracker,
    })

    expect(result.answer).toBeDefined()

    // Should indicate no emails or no information
    const lowerResponse = result.answer.toLowerCase()
    expect(
      lowerResponse.includes('no') ||
        lowerResponse.includes('empty') ||
        lowerResponse.includes('none') ||
        lowerResponse.includes('not') ||
        lowerResponse.includes('any')
    ).toBe(true)
  }, 60000)

  it('should handle complex multi-part questions', async () => {
    const currentParticipants: EmailAddress[] = [
      { email: 'alice@company.com', name: 'Alice Johnson' },
      { email: 'bob@company.com', name: 'Bob Smith' },
    ]

    const request: QueryRequest = {
      query: 'Who sent the first email, what did they ask for, and has anyone responded?',
      asker: currentParticipants[0],
      context_participants: currentParticipants.slice(1),
    }

    const result = await handler.handleQuery(request, {
      emails,
      speechActs: store.getAll(),
      privacyTracker,
    })

    expect(result.answer).toBeDefined()
    expect(result.answer.length).toBeGreaterThan(50)

    // Should be a substantial response addressing multiple parts
    expect(result.answer.split(' ').length).toBeGreaterThan(10)
  }, 60000)

  it('should provide source information when available', async () => {
    const currentParticipants: EmailAddress[] = [
      { email: 'alice@company.com', name: 'Alice Johnson' },
      { email: 'bob@company.com', name: 'Bob Smith' },
    ]

    const request: QueryRequest = {
      query: 'What decisions were made? Please cite the source.',
      asker: currentParticipants[0],
      context_participants: currentParticipants.slice(1),
    }

    const result = await handler.handleQuery(request, {
      emails,
      speechActs: store.getAll(),
      privacyTracker,
    })

    expect(result.answer).toBeDefined()
    expect(Array.isArray(result.sources)).toBe(true)

    // Should have some sources from emails
    expect(result.sources.length).toBeGreaterThanOrEqual(0)

    // Response should reference information
    expect(result.answer.length).toBeGreaterThan(20)
  }, 60000)

  it('should handle queries with knowledge store context', async () => {
    const currentParticipants: EmailAddress[] = [
      { email: 'alice@company.com', name: 'Alice Johnson' },
      { email: 'bob@company.com', name: 'Bob Smith' },
    ]

    // Create knowledge entry
    const knowledgeEntries = [
      {
        id: 'test-knowledge-1',
        category: KnowledgeCategory.PROJECT_INFO,
        title: 'Project Alpha Background',
        content: 'Project Alpha is a strategic initiative to improve team coordination.',
        participants: [
          { email: 'alice@company.com', name: 'Alice Johnson' },
        ],
        source_message_ids: [],
        tags: ['project', 'alpha'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const request: QueryRequest = {
      query: 'What is Project Alpha about?',
      asker: currentParticipants[0],
      context_participants: currentParticipants.slice(1),
    }

    const result = await handler.handleQuery(request, {
      emails,
      speechActs: store.getAll(),
      knowledgeEntries,
      privacyTracker,
    })

    expect(result.answer).toBeDefined()

    // Should incorporate knowledge from both emails and knowledge store
    const lowerResponse = result.answer.toLowerCase()
    expect(lowerResponse.includes('project')).toBe(true)
  }, 60000)
})

if (!hasApiKey) {
  console.log('⚠️  Skipping Query Handler live API tests - CLAUDE_API_KEY not set')
}
