import { v4 as uuidv4 } from 'uuid'
import type { Email } from '@schrute/lib/types/index.js'
import type { ClaudeClient } from '@schrute/lib/claude/client.js'
import type { ActionItem } from '~/lib/types/index.js'
import { DateParser } from './dates.js'

/**
 * ActionItemExtractor uses Claude API to extract action items from emails
 */
export class ActionItemExtractor {
  private dateParser: DateParser

  constructor(private claudeClient: ClaudeClient) {
    this.dateParser = new DateParser(claudeClient)
  }

  /**
   * Extract action items from an email
   */
  async extract(email: Email): Promise<ActionItem[]> {
    const prompt = `Extract action items from the following email. An action item is a specific task that someone needs to do.

Email:
From: ${email.from.name} <${email.from.email}>
To: ${email.to.map(t => `${t.name} <${t.email}>`).join(', ')}
Subject: ${email.subject}
Date: ${email.timestamp}

Body:
${email.body}

Extract ALL action items. For each action item, identify:
1. The description of the task
2. Who is assigned (if mentioned)
3. When it's due (if mentioned)

Return ONLY a JSON array of objects with this structure:
[
  {
    "description": "Implement authentication flow",
    "assignee_name": "Bob Smith",
    "assignee_email": "bob@team.com",
    "deadline_text": "by Friday"
  }
]

Rules:
- Only extract actual action items (tasks to be done), not discussions or decisions
- If assignee is not explicitly mentioned, omit assignee_name and assignee_email
- If no deadline is mentioned, omit deadline_text
- Be liberal in extraction - include items even if somewhat implicit
- Look for phrases like "will", "needs to", "should", "please", "can you"

JSON:`

    try {
      const response = await this.claudeClient.generateResponse({
        system: 'You are an expert at extracting action items from emails. Output only valid JSON.',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
      })

      // Extract JSON from response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        return []
      }

      const extractedItems = JSON.parse(jsonMatch[0])

      // Parse deadlines if present
      const actionItems: ActionItem[] = []

      for (const item of extractedItems) {
        let deadline: string | undefined
        let deadlineConfidence = 0

        if (item.deadline_text) {
          const parsed = await this.dateParser.parseDate(
            item.deadline_text,
            email.timestamp
          )
          if (parsed) {
            deadline = parsed.iso
            deadlineConfidence = parsed.confidence
          }
        }

        // Map email to GitHub username (simplified - would use team state in production)
        const githubUsername = this.inferGitHubUsername(item.assignee_email)

        actionItems.push({
          id: uuidv4(),
          description: item.description,
          assignee_email: item.assignee_email,
          assignee_name: item.assignee_name,
          assignee_github: githubUsername,
          deadline,
          deadline_text: item.deadline_text,
          source_message_id: email.message_id,
          thread_id: email.thread_id,
          extracted_at: new Date().toISOString(),
          confidence: deadlineConfidence > 0 ? (deadlineConfidence + 0.8) / 2 : 0.8,
          status: 'pending',
        })
      }

      return actionItems
    } catch (error: any) {
      console.error('Action item extraction error:', error.message)
      return []
    }
  }

  /**
   * Extract action items from multiple emails
   */
  async extractFromThread(emails: Email[]): Promise<ActionItem[]> {
    const allItems: ActionItem[] = []

    for (const email of emails) {
      const items = await this.extract(email)
      allItems.push(...items)
    }

    // Deduplicate similar action items
    return this.deduplicateItems(allItems)
  }

  /**
   * Check if two action items are similar (potential duplicates)
   */
  private areSimilar(item1: ActionItem, item2: ActionItem): boolean {
    // Same description (case insensitive, trimmed)
    const desc1 = item1.description.toLowerCase().trim()
    const desc2 = item2.description.toLowerCase().trim()

    if (desc1 === desc2) {
      return true
    }

    // Very similar descriptions (Levenshtein distance)
    const distance = this.levenshteinDistance(desc1, desc2)
    const maxLen = Math.max(desc1.length, desc2.length)
    const similarity = 1 - distance / maxLen

    return similarity > 0.85
  }

  /**
   * Deduplicate action items
   */
  private deduplicateItems(items: ActionItem[]): ActionItem[] {
    const unique: ActionItem[] = []

    for (const item of items) {
      const isDuplicate = unique.some(existing => this.areSimilar(existing, item))
      if (!isDuplicate) {
        unique.push(item)
      }
    }

    return unique
  }

  /**
   * Simple Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Infer GitHub username from email (simplified)
   * In production, this would query team state from DynamoDB
   */
  private inferGitHubUsername(email?: string): string | undefined {
    if (!email) return undefined

    // Simple heuristic: use part before @ as username
    const username = email.split('@')[0]
    return username
  }

  /**
   * Filter action items by assignee
   */
  filterByAssignee(items: ActionItem[], email: string): ActionItem[] {
    return items.filter(item => item.assignee_email === email)
  }

  /**
   * Filter action items by deadline proximity
   */
  filterByDeadline(items: ActionItem[], maxDaysAway: number): ActionItem[] {
    const now = new Date()

    return items.filter(item => {
      if (!item.deadline) return false

      const deadline = new Date(item.deadline)
      const daysAway = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

      return daysAway >= 0 && daysAway <= maxDaysAway
    })
  }
}
