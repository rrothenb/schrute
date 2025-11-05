import type { Email, EmailSummary, MemoryContext, SpeechAct, KnowledgeEntry } from '~/lib/types'
import { summarizeEmails } from './summarizer'

export interface MemoryManagerOptions {
  /**
   * Number of most recent messages to keep in full
   * Default: 10
   */
  recentMessageCount?: number

  /**
   * Number of messages to include in each summary batch
   * Default: 5
   */
  summaryBatchSize?: number
}

/**
 * Manages hybrid memory: recent messages in full, older messages as summaries
 */
export class MemoryManager {
  private recentMessageCount: number
  private summaryBatchSize: number
  private summaries: Map<string, EmailSummary[]> = new Map()

  constructor(options: MemoryManagerOptions = {}) {
    this.recentMessageCount = options.recentMessageCount ?? 10
    this.summaryBatchSize = options.summaryBatchSize ?? 5
  }

  /**
   * Build memory context from emails, deciding what to keep recent vs summarize
   */
  async buildContext(
    emails: Email[],
    threadId: string,
    relevantSpeechActs: SpeechAct[] = [],
    relevantKnowledge: KnowledgeEntry[] = []
  ): Promise<MemoryContext> {
    // Sort emails by timestamp (oldest first)
    const sortedEmails = [...emails].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // Split into recent (keep full) and older (summarize)
    const recentMessages =
      sortedEmails.length > this.recentMessageCount
        ? sortedEmails.slice(-this.recentMessageCount)
        : sortedEmails

    const olderMessages =
      sortedEmails.length > this.recentMessageCount
        ? sortedEmails.slice(0, -this.recentMessageCount)
        : []

    // Generate summaries for older messages if needed
    let summaries: EmailSummary[] = []
    if (olderMessages.length > 0) {
      // Check if we already have summaries for this thread
      const cachedSummaries = this.summaries.get(threadId)
      if (cachedSummaries && this.summariesCoverMessages(cachedSummaries, olderMessages)) {
        summaries = cachedSummaries
      } else {
        // Generate new summaries
        summaries = await this.generateSummaries(olderMessages, threadId)
        this.summaries.set(threadId, summaries)
      }
    }

    return {
      recent_messages: recentMessages,
      summaries,
      relevant_speech_acts: relevantSpeechActs,
      relevant_knowledge: relevantKnowledge,
    }
  }

  /**
   * Generate summaries for a list of emails, batching them appropriately
   */
  private async generateSummaries(emails: Email[], threadId: string): Promise<EmailSummary[]> {
    if (emails.length === 0) return []

    const summaries: EmailSummary[] = []
    const batches: Email[][] = []

    // Create batches
    for (let i = 0; i < emails.length; i += this.summaryBatchSize) {
      batches.push(emails.slice(i, i + this.summaryBatchSize))
    }

    // Summarize each batch
    for (const batch of batches) {
      const summary = await summarizeEmails(batch, threadId)
      summaries.push(summary)
    }

    return summaries
  }

  /**
   * Check if existing summaries cover the given messages
   */
  private summariesCoverMessages(summaries: EmailSummary[], messages: Email[]): boolean {
    const summaryMessageIds = new Set(summaries.flatMap((s) => s.message_ids))
    return messages.every((m) => summaryMessageIds.has(m.message_id))
  }

  /**
   * Format memory context as text for use in prompts
   */
  formatContext(context: MemoryContext): string {
    const parts: string[] = []

    // Add summaries of older messages
    if (context.summaries.length > 0) {
      parts.push('=== EARLIER CONVERSATION SUMMARY ===\n')
      context.summaries.forEach((summary, idx) => {
        parts.push(`Summary ${idx + 1}:`)
        parts.push(summary.summary)
        parts.push('\nKey Points:')
        summary.key_points.forEach((point) => {
          parts.push(`  - ${point}`)
        })
        parts.push('')
      })
      parts.push('')
    }

    // Add recent messages in full
    if (context.recent_messages.length > 0) {
      parts.push('=== RECENT MESSAGES ===\n')
      context.recent_messages.forEach((email, idx) => {
        parts.push(`Message ${idx + 1} (${email.timestamp}):`)
        parts.push(`From: ${email.from.name || email.from.email}`)
        parts.push(`To: ${email.to.map((t) => t.name || t.email).join(', ')}`)
        parts.push(`Subject: ${email.subject}`)
        parts.push('')
        parts.push(email.body)
        parts.push('---\n')
      })
    }

    // Add relevant speech acts
    if (context.relevant_speech_acts.length > 0) {
      parts.push('=== DETECTED SPEECH ACTS ===\n')
      context.relevant_speech_acts.forEach((act) => {
        parts.push(
          `[${act.type.toUpperCase()}] ${act.actor.name || act.actor.email}: ${act.content}`
        )
      })
      parts.push('')
    }

    // Add relevant knowledge
    if (context.relevant_knowledge.length > 0) {
      parts.push('=== STORED KNOWLEDGE ===\n')
      context.relevant_knowledge.forEach((entry) => {
        parts.push(`[${entry.category}] ${entry.title}`)
        parts.push(entry.content)
        parts.push('')
      })
    }

    return parts.join('\n')
  }

  /**
   * Clear cached summaries (useful for testing or when threads are updated)
   */
  clearCache(threadId?: string): void {
    if (threadId) {
      this.summaries.delete(threadId)
    } else {
      this.summaries.clear()
    }
  }
}

/**
 * Create a singleton memory manager instance
 */
let memoryManagerInstance: MemoryManager | null = null

export function getMemoryManager(options?: MemoryManagerOptions): MemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager(options)
  }
  return memoryManagerInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetMemoryManager(): void {
  memoryManagerInstance = null
}
