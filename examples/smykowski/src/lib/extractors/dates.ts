import type { ClaudeClient } from '@schrute/lib/claude/client.js'

/**
 * DateParser uses Claude API to parse natural language dates
 *
 * Examples:
 * - "by Friday" -> ISO timestamp for next Friday
 * - "end of day Wednesday" -> ISO timestamp for Wednesday 17:00
 * - "next week" -> ISO timestamp for 7 days from now
 * - "by month end" -> ISO timestamp for last day of current month
 */
export class DateParser {
  constructor(private claudeClient: ClaudeClient) {}

  /**
   * Parse natural language date to ISO timestamp
   */
  async parseDate(
    dateText: string,
    referenceDate?: string
  ): Promise<{ iso: string; confidence: number } | null> {
    const reference = referenceDate || new Date().toISOString()

    const prompt = `Parse the following natural language date/time expression into an ISO 8601 timestamp.

Reference date/time (now): ${reference}

Date expression: "${dateText}"

Rules:
- Return ONLY a JSON object with "iso" (ISO 8601 timestamp) and "confidence" (0-1)
- "by Friday" means end of business day Friday (5:00 PM local time)
- "end of day" means 5:00 PM
- "end of week" means Friday 5:00 PM
- "next week" means 7 days from reference date
- "this week" means before end of current week
- "by month end" means last day of current month at 5:00 PM
- Assume local timezone is UTC unless specified
- If ambiguous or unparseable, return confidence < 0.5

Examples:
Input: "by Friday" (today is Monday)
Output: {"iso": "2025-11-15T17:00:00Z", "confidence": 0.9}

Input: "next week"
Output: {"iso": "2025-11-17T17:00:00Z", "confidence": 0.8}

Now parse: "${dateText}"
JSON:`

    try {
      const response = await this.claudeClient.prompt(prompt, {
        systemPrompt: 'You are a date/time parser that outputs only JSON.',
        maxTokens: 200,
      })

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return null
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Validate ISO format
      if (!parsed.iso || !this.isValidISO(parsed.iso)) {
        return null
      }

      // Check confidence
      if (parsed.confidence < 0.5) {
        return null
      }

      return {
        iso: parsed.iso,
        confidence: parsed.confidence,
      }
    } catch (error: any) {
      console.error('Date parsing error:', error.message)
      return null
    }
  }

  /**
   * Parse multiple date expressions
   */
  async parseDates(
    dateTexts: string[],
    referenceDate?: string
  ): Promise<Map<string, { iso: string; confidence: number }>> {
    const results = new Map<string, { iso: string; confidence: number }>()

    for (const text of dateTexts) {
      const parsed = await this.parseDate(text, referenceDate)
      if (parsed) {
        results.set(text, parsed)
      }
    }

    return results
  }

  /**
   * Extract date expressions from text
   */
  extractDateExpressions(text: string): string[] {
    const patterns = [
      /by\s+(?:end\s+of\s+)?(?:day\s+)?(\w+)/gi, // "by Friday", "by end of day Wednesday"
      /(?:this|next)\s+week/gi,
      /(?:end|start)\s+of\s+(?:week|month|year)/gi,
      /within\s+\d+\s+(?:days?|weeks?|months?)/gi,
      /in\s+\d+\s+(?:days?|weeks?|months?)/gi,
      /\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, // MM/DD or MM/DD/YYYY
      /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/gi, // "Nov 15"
    ]

    const matches = new Set<string>()

    for (const pattern of patterns) {
      const found = text.matchAll(pattern)
      for (const match of found) {
        matches.add(match[0].trim())
      }
    }

    return Array.from(matches)
  }

  /**
   * Validate ISO 8601 timestamp
   */
  private isValidISO(isoString: string): boolean {
    try {
      const date = new Date(isoString)
      return date.toISOString() === isoString || !isNaN(date.getTime())
    } catch {
      return false
    }
  }

  /**
   * Calculate time until deadline
   */
  getTimeUntil(deadline: string): {
    days: number
    hours: number
    isPast: boolean
  } {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diff = deadlineDate.getTime() - now.getTime()

    return {
      days: Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24)),
      hours: Math.floor(Math.abs(diff) / (1000 * 60 * 60)),
      isPast: diff < 0,
    }
  }

  /**
   * Format deadline as human-readable relative time
   */
  formatRelative(deadline: string): string {
    const { days, hours, isPast } = this.getTimeUntil(deadline)

    if (isPast) {
      if (days === 0) {
        return `${hours} hours ago`
      }
      return `${days} days ago`
    }

    if (days === 0) {
      return `in ${hours} hours`
    }

    if (days === 1) {
      return 'tomorrow'
    }

    if (days < 7) {
      return `in ${days} days`
    }

    const weeks = Math.floor(days / 7)
    return `in ${weeks} week${weeks > 1 ? 's' : ''}`
  }
}
