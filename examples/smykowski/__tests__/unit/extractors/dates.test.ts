import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { DateParser } from '~/lib/extractors/dates.js'
import type { ClaudeClient } from '@schrute/lib/claude/client.js'

describe('DateParser', () => {
  let mockClaudeClient: jest.Mocked<ClaudeClient>
  let parser: DateParser

  beforeEach(() => {
    mockClaudeClient = {
      prompt: jest.fn(),
    } as any

    parser = new DateParser(mockClaudeClient)
  })

  describe('parseDate', () => {
    it('should parse "by Friday" correctly', async () => {
      mockClaudeClient.prompt.mockResolvedValue('{"iso": "2025-11-15T17:00:00Z", "confidence": 0.9}')

      const result = await parser.parseDate('by Friday', '2025-11-10T10:00:00Z')

      expect(result).not.toBeNull()
      expect(result!.iso).toBe('2025-11-15T17:00:00Z')
      expect(result!.confidence).toBe(0.9)
    })

    it('should parse "end of day Wednesday" correctly', async () => {
      mockClaudeClient.prompt.mockResolvedValue('{"iso": "2025-11-13T17:00:00Z", "confidence": 0.85}')

      const result = await parser.parseDate('end of day Wednesday')

      expect(result).not.toBeNull()
      expect(result!.confidence).toBeGreaterThan(0.5)
    })

    it('should parse "next week" correctly', async () => {
      mockClaudeClient.prompt.mockResolvedValue('{"iso": "2025-11-17T17:00:00Z", "confidence": 0.8}')

      const result = await parser.parseDate('next week')

      expect(result).not.toBeNull()
      expect(result!.iso).toContain('2025-11')
    })

    it('should return null for ambiguous dates with low confidence', async () => {
      mockClaudeClient.prompt.mockResolvedValue('{"iso": "2025-11-15T17:00:00Z", "confidence": 0.3}')

      const result = await parser.parseDate('sometime')

      expect(result).toBeNull()
    })

    it('should return null for invalid responses', async () => {
      mockClaudeClient.prompt.mockResolvedValue('Not valid JSON')

      const result = await parser.parseDate('by Friday')

      expect(result).toBeNull()
    })

    it('should handle API errors gracefully', async () => {
      mockClaudeClient.prompt.mockRejectedValue(new Error('API error'))

      const result = await parser.parseDate('by Friday')

      expect(result).toBeNull()
    })
  })

  describe('extractDateExpressions', () => {
    it('should extract "by Friday" patterns', () => {
      const text = 'Please complete this by Friday'
      const expressions = parser.extractDateExpressions(text)

      expect(expressions).toContain('by Friday')
    })

    it('should extract "end of day" patterns', () => {
      const text = 'Need this by end of day Wednesday'
      const expressions = parser.extractDateExpressions(text)

      expect(expressions.length).toBeGreaterThan(0)
    })

    it('should extract "next week" patterns', () => {
      const text = 'We will deliver next week'
      const expressions = parser.extractDateExpressions(text)

      expect(expressions).toContain('next week')
    })

    it('should extract date formats like MM/DD', () => {
      const text = 'Due date is 11/15'
      const expressions = parser.extractDateExpressions(text)

      expect(expressions).toContain('11/15')
    })

    it('should extract month names with dates', () => {
      const text = 'Deadline is Nov 15'
      const expressions = parser.extractDateExpressions(text)

      expect(expressions.some(e => e.toLowerCase().includes('nov'))).toBe(true)
    })
  })

  describe('getTimeUntil', () => {
    it('should calculate days until future deadline', () => {
      const now = new Date('2025-11-10T10:00:00Z')
      const deadline = new Date('2025-11-15T17:00:00Z').toISOString()

      // Mock current time
      const result = parser.getTimeUntil(deadline)

      expect(result.isPast).toBe(false)
      expect(result.days).toBeGreaterThan(0)
    })

    it('should identify past deadlines', () => {
      const deadline = new Date('2025-11-01T17:00:00Z').toISOString()

      const result = parser.getTimeUntil(deadline)

      expect(result.isPast).toBe(true)
    })
  })

  describe('formatRelative', () => {
    it('should format "tomorrow" correctly', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const formatted = parser.formatRelative(tomorrow)

      expect(formatted).toBe('tomorrow')
    })

    it('should format hours for same-day deadlines', () => {
      const later = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()

      const formatted = parser.formatRelative(later)

      expect(formatted).toContain('hours')
    })

    it('should format past dates with "ago"', () => {
      const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

      const formatted = parser.formatRelative(past)

      expect(formatted).toContain('ago')
    })
  })
})
