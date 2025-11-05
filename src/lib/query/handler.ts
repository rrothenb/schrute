import { getClaudeClient } from '~/lib/claude/index.js'
import {
  QueryRequest,
  QueryResponse,
  Email,
  SpeechAct,
  KnowledgeEntry,
  EmailAddress,
  PersonalityConfig,
  MemoryContext,
} from '~/lib/types/index.js'
import { PrivacyTracker } from '~/lib/privacy/index.js'
import { getMemoryManager } from '~/lib/memory/index.js'

export interface QueryContext {
  emails: Email[]
  speechActs: SpeechAct[]
  knowledgeEntries?: KnowledgeEntry[]
  privacyTracker: PrivacyTracker
  personality?: PersonalityConfig
  threadId?: string
  useMemorySystem?: boolean // Enable hybrid memory (default: false for backward compatibility)
}

const BASE_SYSTEM_PROMPT = `You are Schrute, an AI coordination assistant. You help people by answering questions about their email conversations, tracking decisions and commitments, and maintaining shared knowledge.

IMPORTANT PRIVACY RULES:
- You can ONLY reference information that ALL current participants in this conversation have access to
- If you cannot fully answer a question due to privacy constraints, you must:
  1. Provide whatever information you CAN safely share
  2. Explicitly state that you cannot provide more information
  3. Name the specific participant(s) whose presence prevents full disclosure
- NEVER leak confidential information to unauthorized participants

When answering questions:
- Be concise and factual
- Cite specific emails or speech acts when relevant
- If you're not sure about something, say so - don't guess
- Focus on reliability over speculation`

export class QueryHandler {
  private client = getClaudeClient()

  /**
   * Handle a query request
   */
  async handleQuery(request: QueryRequest, context: QueryContext): Promise<QueryResponse> {
    const allParticipants = [request.asker, ...request.context_participants]

    // Filter context based on privacy
    const accessibleEmails = context.privacyTracker.filterEmails(context.emails, allParticipants)
    const accessibleSpeechActs = context.privacyTracker.filterSpeechActs(
      context.speechActs,
      allParticipants
    )
    const accessibleKnowledge = context.knowledgeEntries
      ? context.privacyTracker.filterKnowledgeEntries(context.knowledgeEntries, allParticipants)
      : []

    // Build the prompt (with or without memory system)
    const systemPrompt = this.buildSystemPrompt(context.personality)
    let userPrompt: string

    if (context.useMemorySystem && context.threadId) {
      // Use memory system to build context
      const memoryManager = getMemoryManager()
      const memoryContext = await memoryManager.buildContext(
        accessibleEmails,
        context.threadId,
        accessibleSpeechActs,
        accessibleKnowledge
      )
      userPrompt = this.buildUserPromptWithMemory(
        request.query,
        memoryContext,
        allParticipants
      )
    } else {
      // Legacy approach: use all accessible emails
      userPrompt = this.buildUserPrompt(
        request.query,
        accessibleEmails,
        accessibleSpeechActs,
        accessibleKnowledge,
        allParticipants
      )
    }

    // Get response from Claude
    const answer = await this.client.prompt(userPrompt, {
      systemPrompt,
      temperature: 0.3, // Lower temperature for factual responses
    })

    // Determine sources and privacy status
    const sources = this.extractSources(accessibleEmails, accessibleSpeechActs, accessibleKnowledge)
    const privacyRestricted = accessibleEmails.length < context.emails.length ||
      accessibleSpeechActs.length < context.speechActs.length

    let restrictedInfo: string | undefined
    if (privacyRestricted) {
      const restrictedParticipants = this.findRestrictedParticipants(
        context,
        allParticipants
      )
      if (restrictedParticipants.length > 0) {
        const names = restrictedParticipants.map((p) => p.name || p.email).join(', ')
        restrictedInfo = `Some information has been withheld due to the presence of: ${names}`
      }
    }

    return {
      answer,
      sources,
      privacy_restricted: privacyRestricted,
      restricted_info: restrictedInfo,
    }
  }

  private buildSystemPrompt(personality?: PersonalityConfig): string {
    let prompt = BASE_SYSTEM_PROMPT

    if (personality) {
      prompt += `\n\nPERSONALITY:\n`
      prompt += `- Name: ${personality.name}\n`
      prompt += `- Tone: ${personality.tone}\n`
      prompt += `- Speaking Style: ${personality.speaking_style}\n`

      if (personality.constraints && personality.constraints.length > 0) {
        prompt += `- Constraints: ${personality.constraints.join('; ')}\n`
      }

      if (personality.system_prompt_additions) {
        prompt += `\n${personality.system_prompt_additions}\n`
      }

      if (personality.example_phrases && personality.example_phrases.length > 0) {
        prompt += `\nExample phrases you might use: ${personality.example_phrases.join('; ')}\n`
      }
    }

    return prompt
  }

  private buildUserPrompt(
    query: string,
    emails: Email[],
    speechActs: SpeechAct[],
    knowledge: KnowledgeEntry[],
    participants: EmailAddress[]
  ): string {
    let prompt = `Current conversation participants: ${participants.map((p) => p.name || p.email).join(', ')}\n\n`

    // Add email context
    if (emails.length > 0) {
      prompt += `RELEVANT EMAIL MESSAGES:\n`
      for (const email of emails.slice(-10)) { // Last 10 emails
        prompt += `\n[${email.timestamp}] From: ${email.from.name || email.from.email}\n`
        prompt += `To: ${email.to.map((a) => a.name || a.email).join(', ')}\n`
        prompt += `Subject: ${email.subject}\n`
        prompt += `${email.body}\n`
        prompt += `---\n`
      }
    }

    // Add speech act context
    if (speechActs.length > 0) {
      const requests = speechActs.filter((a) => a.type === 'request')
      const questions = speechActs.filter((a) => a.type === 'question')
      const commitments = speechActs.filter((a) => a.type === 'commitment')
      const decisions = speechActs.filter((a) => a.type === 'decision')

      if (decisions.length > 0) {
        prompt += `\nKEY DECISIONS:\n`
        decisions.forEach((d) => {
          prompt += `- ${d.content} (${d.actor.name || d.actor.email}, ${d.timestamp})\n`
        })
      }

      if (commitments.length > 0) {
        prompt += `\nCOMMITMENTS:\n`
        commitments.forEach((c) => {
          prompt += `- ${c.content} (${c.actor.name || c.actor.email}, ${c.timestamp})\n`
        })
      }

      if (requests.length > 0) {
        prompt += `\nOPEN REQUESTS:\n`
        requests.forEach((r) => {
          prompt += `- ${r.content} (${r.actor.name || r.actor.email}, ${r.timestamp})\n`
        })
      }

      if (questions.length > 0) {
        prompt += `\nQUESTIONS:\n`
        questions.forEach((q) => {
          prompt += `- ${q.content} (${q.actor.name || q.actor.email}, ${q.timestamp})\n`
        })
      }
    }

    // Add knowledge context
    if (knowledge.length > 0) {
      prompt += `\nSTORED KNOWLEDGE:\n`
      for (const entry of knowledge) {
        prompt += `\n[${entry.category}] ${entry.title}\n`
        prompt += `${entry.content}\n`
        prompt += `---\n`
      }
    }

    prompt += `\nQUERY: ${query}\n\n`
    prompt += `Please answer the query based on the information provided above. Remember to respect privacy constraints.`

    return prompt
  }

  /**
   * Build user prompt using memory system (hybrid: recent messages + summaries)
   */
  private buildUserPromptWithMemory(
    query: string,
    memoryContext: MemoryContext,
    participants: EmailAddress[]
  ): string {
    let prompt = `Current conversation participants: ${participants.map((p) => p.name || p.email).join(', ')}\n\n`

    // Use the memory manager's formatter
    const memoryManager = getMemoryManager()
    prompt += memoryManager.formatContext(memoryContext)

    prompt += `\n\nQUERY: ${query}\n\n`
    prompt += `Please answer the query based on the information provided above. Remember to respect privacy constraints.`

    return prompt
  }

  private extractSources(
    emails: Email[],
    speechActs: SpeechAct[],
    knowledge: KnowledgeEntry[]
  ): string[] {
    const sources: string[] = []
    sources.push(...emails.map((e) => e.message_id))
    sources.push(...speechActs.map((a) => a.id))
    sources.push(...knowledge.map((k) => k.id))
    return sources
  }

  private findRestrictedParticipants(
    context: QueryContext,
    currentParticipants: EmailAddress[]
  ): EmailAddress[] {
    const restricted: EmailAddress[] = []

    for (const participant of currentParticipants) {
      // Check if this participant has access to all emails
      const hasAccessToAll = context.emails.every((email) =>
        context.privacyTracker.hasAccessToMessage(participant.email, email.message_id)
      )

      if (!hasAccessToAll) {
        restricted.push(participant)
      }
    }

    return restricted
  }
}

export function createQueryHandler(): QueryHandler {
  return new QueryHandler()
}
