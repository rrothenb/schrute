import { describe, it, expect, beforeAll } from '@jest/globals'
import { DateParser } from '~/lib/extractors/dates.js'
import { ClaudeClient } from '@schrute/lib/claude/client.js'

describe('DateParser - Live Claude API Tests', () => {
  let parser: DateParser
  let claudeClient: ClaudeClient

  beforeAll(() => {
    if (!process.env.CLAUDE_API_KEY) {
      console.log('Skipping live Claude API tests - CLAUDE_API_KEY not set')
    }
    claudeClient = new ClaudeClient(process.env.CLAUDE_API_KEY || 'dummy')
    parser = new DateParser(claudeClient)
  })

  // Skip all tests if no API key
  const testIf = process.env.CLAUDE_API_KEY ? it : it.skip

  testIf('should parse "by Friday" with live API', async () => {
    const result = await parser.parseDate('by Friday', '2025-11-10T10:00:00Z')

    expect(result).not.toBeNull()
    expect(result!.iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(result!.confidence).toBeGreaterThan(0.5)

    // Should be a Friday
    const date = new Date(result!.iso)
    expect(date.getDay()).toBe(5) // Friday = 5
  }, 10000)

  testIf('should parse "end of day Wednesday" with live API', async () => {
    const result = await parser.parseDate('end of day Wednesday', '2025-11-10T10:00:00Z')

    expect(result).not.toBeNull()
    expect(result!.confidence).toBeGreaterThan(0.5)

    // Should be a Wednesday at 5pm
    const date = new Date(result!.iso)
    expect(date.getDay()).toBe(3) // Wednesday = 3
    expect(date.getUTCHours()).toBe(17) // 5pm
  }, 10000)

  testIf('should parse "next week" with live API', async () => {
    const referenceDate = '2025-11-10T10:00:00Z'
    const result = await parser.parseDate('next week', referenceDate)

    expect(result).not.toBeNull()
    expect(result!.confidence).toBeGreaterThan(0.5)

    // Should be approximately 7 days later
    const reference = new Date(referenceDate)
    const parsed = new Date(result!.iso)
    const daysDiff = (parsed.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24)

    expect(daysDiff).toBeGreaterThan(5)
    expect(daysDiff).toBeLessThan(10)
  }, 10000)

  testIf('should parse "by month end" with live API', async () => {
    const result = await parser.parseDate('by month end', '2025-11-10T10:00:00Z')

    expect(result).not.toBeNull()
    expect(result!.confidence).toBeGreaterThan(0.5)

    // Should be Nov 30 (last day of November)
    const date = new Date(result!.iso)
    expect(date.getMonth()).toBe(10) // November = 10
    expect(date.getDate()).toBeGreaterThan(28) // Last few days
  }, 10000)

  testIf('should parse "this week" with live API', async () => {
    const result = await parser.parseDate('this week', '2025-11-10T10:00:00Z')

    expect(result).not.toBeNull()
    expect(result!.confidence).toBeGreaterThan(0.5)
  }, 10000)

  testIf('should parse "tomorrow" with live API', async () => {
    const referenceDate = '2025-11-10T10:00:00Z'
    const result = await parser.parseDate('tomorrow', referenceDate)

    expect(result).not.toBeNull()

    const reference = new Date(referenceDate)
    const parsed = new Date(result!.iso)
    const daysDiff = Math.round((parsed.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24))

    expect(daysDiff).toBe(1)
  }, 10000)

  testIf('should parse "in 3 days" with live API', async () => {
    const referenceDate = '2025-11-10T10:00:00Z'
    const result = await parser.parseDate('in 3 days', referenceDate)

    expect(result).not.toBeNull()

    const reference = new Date(referenceDate)
    const parsed = new Date(result!.iso)
    const daysDiff = Math.round((parsed.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24))

    expect(daysDiff).toBeGreaterThanOrEqual(2)
    expect(daysDiff).toBeLessThanOrEqual(4)
  }, 10000)

  testIf('should return null for completely ambiguous dates', async () => {
    const result = await parser.parseDate('whenever', '2025-11-10T10:00:00Z')

    // Either null or very low confidence
    if (result) {
      expect(result.confidence).toBeLessThan(0.5)
    }
  }, 10000)

  testIf('should handle multiple date parsing calls efficiently', async () => {
    const dates = ['by Friday', 'next Monday', 'end of week']
    const results = await parser.parseDates(dates, '2025-11-10T10:00:00Z')

    expect(results.size).toBeGreaterThan(0)
    for (const [text, parsed] of results) {
      expect(parsed.iso).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(parsed.confidence).toBeGreaterThan(0.5)
    }
  }, 30000)
})
