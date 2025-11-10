import { getClaudeClient } from '~/lib/claude/index.js'
import { Email, SpeechAct, SpeechActType } from '~/lib/types/index.js'
import { getEmailParticipants } from '~/lib/email/index.js'
import { randomUUID } from 'crypto'

interface DetectedSpeechAct {
  type: string
  content: string
  confidence: number
  metadata?: Record<string, unknown>
}

// Mapping from string to enum values - using string literals to avoid module loading issues
const SPEECH_ACT_TYPE_MAP: Record<string, SpeechActType> = {
  REQUEST: 'request' as SpeechActType,
  QUESTION: 'question' as SpeechActType,
  COMMITMENT: 'commitment' as SpeechActType,
  DECISION: 'decision' as SpeechActType,
  STATEMENT: 'statement' as SpeechActType,
  GREETING: 'greeting' as SpeechActType,
  ACKNOWLEDGMENT: 'acknowledgment' as SpeechActType,
  SUGGESTION: 'suggestion' as SpeechActType,
  OBJECTION: 'objection' as SpeechActType,
  AGREEMENT: 'agreement' as SpeechActType,
}

const SPEECH_ACT_DETECTION_PROMPT = `You are an expert at analyzing email communication and identifying speech acts.

A speech act is a specific communicative action performed through language. Examples include:
- REQUEST: Asking someone to do something ("Can you send me the report?")
- QUESTION: Seeking information ("What is the deadline?")
- COMMITMENT: Promising or committing to do something ("I will finish this by Friday")
- DECISION: Stating a decision that has been made ("We've decided to use React")
- STATEMENT: Declaring facts or information ("The meeting is at 2pm")
- GREETING: Social opening ("Hi team")
- ACKNOWLEDGMENT: Confirming receipt or understanding ("Got it, thanks")
- SUGGESTION: Proposing an idea ("How about we use approach X?")
- OBJECTION: Expressing disagreement or concern ("I'm worried about the timeline")
- AGREEMENT: Expressing agreement ("That sounds good to me")

Analyze the following email and extract ALL speech acts. Be exhaustive - don't miss anything.

Email from: {from}
To: {to}
Subject: {subject}
Body:
{body}

For each speech act, provide:
1. type: One of the types listed above (in UPPERCASE)
2. content: The specific text or paraphrased content of the speech act
3. confidence: A number between 0 and 1 indicating your confidence in this classification
4. metadata: Any additional context (optional)

Respond with a JSON array of speech acts.`

export class SpeechActDetector {
  private client = getClaudeClient()

  /**
   * Detect all speech acts in an email
   */
  async detectSpeechActs(email: Email): Promise<SpeechAct[]> {
    const prompt = SPEECH_ACT_DETECTION_PROMPT.replace('{from}', this.formatEmailAddress(email.from))
      .replace('{to}', email.to.map((a) => this.formatEmailAddress(a)).join(', '))
      .replace('{subject}', email.subject)
      .replace('{body}', email.body)

    try {
      const detected = await this.client.promptJson<DetectedSpeechAct[]>(prompt, {
        temperature: 0.3, // Lower temperature for more consistent detection
      })

      const participants = getEmailParticipants(email)

      return detected.map((act) => ({
        id: randomUUID(),
        type: this.mapSpeechActType(act.type),
        content: act.content,
        actor: email.from,
        participants,
        confidence: act.confidence,
        source_message_id: email.message_id,
        thread_id: email.thread_id,
        timestamp: email.timestamp,
        metadata: act.metadata,
      }))
    } catch (error) {
      console.error('Failed to detect speech acts:', error)
      return []
    }
  }

  /**
   * Detect speech acts for multiple emails
   */
  async detectSpeechActsBatch(emails: Email[]): Promise<SpeechAct[]> {
    const results = await Promise.all(emails.map((email) => this.detectSpeechActs(email)))
    return results.flat()
  }

  private formatEmailAddress(address: { email: string; name?: string }): string {
    return address.name ? `${address.name} <${address.email}>` : address.email
  }

  private mapSpeechActType(typeStr: string): SpeechActType {
    const normalized = typeStr.toUpperCase()
    // Use the pre-defined mapping to avoid runtime enum issues
    return SPEECH_ACT_TYPE_MAP[normalized] || ('statement' as SpeechActType)
  }
}

export function createSpeechActDetector(): SpeechActDetector {
  return new SpeechActDetector()
}
