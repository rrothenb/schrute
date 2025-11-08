/**
 * Enhanced context assembler with relevance ranking
 * Implements sliding window + speech act boosting + MCP skill relevance
 */

import type { Email, SpeechAct, MemoryContext, EmailSummary } from '~/lib/types'
import { summarizeEmails } from './summarizer'
import type { ClaudeClient } from '~/lib/claude/client'

export interface ContextAssemblerConfig {
  /**
   * Number of recent messages to include in full (default: 10)
   */
  recentWindowSize: number

  /**
   * Maximum total token budget for context (default: 46000)
   */
  maxTokens: number

  /**
   * Keywords from MCP skills to boost relevance (optional)
   */
  skillKeywords?: string[]
}

export interface RankedMessage {
  email: Email
  relevanceScore: number
  reason: string
}

export class ContextAssembler {
  private config: ContextAssemblerConfig

  constructor(_claudeClient: ClaudeClient, config?: Partial<ContextAssemblerConfig>) {
    this.config = {
      recentWindowSize: config?.recentWindowSize ?? 10,
      maxTokens: config?.maxTokens ?? 46000,
      skillKeywords: config?.skillKeywords ?? [],
    }
  }

  /**
   * Assemble context with relevance-based prioritization
   */
  async assembleContext(
    allMessages: Email[],
    speechActs: SpeechAct[]
  ): Promise<MemoryContext> {
    if (allMessages.length === 0) {
      return {
        recent_messages: [],
        summaries: [],
        relevant_speech_acts: speechActs,
        relevant_knowledge: [],
      }
    }

    // Sort messages by timestamp
    const sorted = [...allMessages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const windowSize = this.config.recentWindowSize

    // Split into recent and older messages
    const recentMessages = sorted.slice(-windowSize)
    const olderMessages = sorted.slice(0, -windowSize)

    // Rank older messages by relevance
    // const rankedOlder = this.rankMessages(olderMessages, speechActs)
    // TODO: Use rankedOlder for selective summarization

    // For now, summarize ALL older messages together
    // Future: could summarize in chunks or selectively based on relevance
    const summaries: EmailSummary[] = []
    if (olderMessages.length > 0) {
      const summary = await summarizeEmails(olderMessages, allMessages[0]?.thread_id || 'unknown')
      summaries.push(summary)
    }

    return {
      recent_messages: recentMessages,
      summaries,
      relevant_speech_acts: speechActs,
      relevant_knowledge: [],
    }
  }

  /**
   * Rank messages by relevance for context inclusion
   * TODO: Use this for selective summarization in the future
   */
  // @ts-ignore - Will be used for selective summarization
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private rankMessages(messages: Email[], speechActs: SpeechAct[]): RankedMessage[] {
    const messageIdToSpeechActs = new Map<string, SpeechAct[]>()

    // Group speech acts by message
    for (const act of speechActs) {
      const acts = messageIdToSpeechActs.get(act.source_message_id) || []
      acts.push(act)
      messageIdToSpeechActs.set(act.source_message_id, acts)
    }

    const ranked: RankedMessage[] = messages.map((email) => {
      let score = 1.0 // Base score
      const reasons: string[] = []

      // Boost if message contains speech acts
      const acts = messageIdToSpeechActs.get(email.message_id)
      if (acts && acts.length > 0) {
        score += acts.length * 2.0
        reasons.push(`Contains ${acts.length} speech act(s)`)

        // Extra boost for high-value speech acts
        const hasCommitment = acts.some((a) => a.type === 'commitment')
        const hasDecision = acts.some((a) => a.type === 'decision')
        if (hasCommitment) {
          score += 3.0
          reasons.push('Contains commitment')
        }
        if (hasDecision) {
          score += 3.0
          reasons.push('Contains decision')
        }
      }

      // Boost if message contains MCP skill keywords
      if (this.config.skillKeywords && this.config.skillKeywords.length > 0) {
        const body = email.body.toLowerCase()
        const subject = email.subject.toLowerCase()
        const matchingKeywords = this.config.skillKeywords.filter(
          (kw) => body.includes(kw.toLowerCase()) || subject.includes(kw.toLowerCase())
        )

        if (matchingKeywords.length > 0) {
          score += matchingKeywords.length * 1.5
          reasons.push(`Matches skill keywords: ${matchingKeywords.join(', ')}`)
        }
      }

      return {
        email,
        relevanceScore: score,
        reason: reasons.join('; ') || 'Base relevance',
      }
    })

    // Sort by relevance score descending
    return ranked.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Estimate token count for context (rough approximation)
   * Real implementation would use tiktoken or similar
   */
  estimateTokens(context: MemoryContext): number {
    let tokens = 0

    // Recent messages: ~4 chars per token
    for (const msg of context.recent_messages) {
      tokens += Math.ceil((msg.body.length + msg.subject.length) / 4)
    }

    // Summaries: ~4 chars per token
    for (const summary of context.summaries) {
      tokens += Math.ceil(summary.summary.length / 4)
      tokens += summary.key_points.reduce((sum, pt) => sum + Math.ceil(pt.length / 4), 0)
    }

    // Speech acts: ~4 chars per token
    for (const act of context.relevant_speech_acts) {
      tokens += Math.ceil(act.content.length / 4)
    }

    return tokens
  }

  /**
   * Trim context to fit within token budget
   * Prioritizes: recent messages > speech acts > summaries
   */
  trimContext(context: MemoryContext): MemoryContext {
    const estimatedTokens = this.estimateTokens(context)

    if (estimatedTokens <= this.config.maxTokens) {
      return context // Already within budget
    }

    // Simplified trimming: remove oldest summaries first
    // More sophisticated: remove least relevant older message summaries
    const trimmedSummaries = [...context.summaries]
    while (this.estimateTokens({ ...context, summaries: trimmedSummaries }) > this.config.maxTokens) {
      trimmedSummaries.pop()
      if (trimmedSummaries.length === 0) break
    }

    return {
      ...context,
      summaries: trimmedSummaries,
    }
  }
}
