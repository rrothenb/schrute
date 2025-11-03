import {
  Email,
  EmailAddress,
  SpeechAct,
  ParticipantContext,
  PrivacyFilterResult,
  KnowledgeEntry,
} from '~/lib/types/index.js'
import { getEmailParticipants } from '~/lib/email/index.js'

export class PrivacyTracker {
  // Map of participant email -> their context
  private participantContexts: Map<string, ParticipantContext> = new Map()

  /**
   * Track emails and build participant access mappings
   */
  trackEmails(emails: Email[]): void {
    for (const email of emails) {
      this.trackEmail(email)
    }
  }

  /**
   * Track a single email
   */
  trackEmail(email: Email): void {
    const participants = getEmailParticipants(email)

    for (const participant of participants) {
      let context = this.participantContexts.get(participant.email)

      if (!context) {
        context = {
          participant,
          accessible_messages: [],
          accessible_speech_acts: [],
          first_seen: email.timestamp,
        }
        this.participantContexts.set(participant.email, context)
      }

      // Add this message to their accessible messages
      if (!context.accessible_messages.includes(email.message_id)) {
        context.accessible_messages.push(email.message_id)
      }

      // Update first_seen if this is earlier
      if (new Date(email.timestamp) < new Date(context.first_seen)) {
        context.first_seen = email.timestamp
      }
    }
  }

  /**
   * Track speech acts
   */
  trackSpeechActs(acts: SpeechAct[]): void {
    for (const act of acts) {
      this.trackSpeechAct(act)
    }
  }

  /**
   * Track a single speech act
   */
  trackSpeechAct(act: SpeechAct): void {
    for (const participant of act.participants) {
      const context = this.participantContexts.get(participant.email)
      if (context && !context.accessible_speech_acts.includes(act.id)) {
        context.accessible_speech_acts.push(act.id)
      }
    }
  }

  /**
   * Check if a participant has access to a message
   */
  hasAccessToMessage(participantEmail: string, messageId: string): boolean {
    const context = this.participantContexts.get(participantEmail)
    return context ? context.accessible_messages.includes(messageId) : false
  }

  /**
   * Check if a participant has access to a speech act
   */
  hasAccessToSpeechAct(participantEmail: string, speechActId: string): boolean {
    const context = this.participantContexts.get(participantEmail)
    return context ? context.accessible_speech_acts.includes(speechActId) : false
  }

  /**
   * Check if ALL participants in a list have access to a message
   */
  allHaveAccessToMessage(participants: EmailAddress[], messageId: string): boolean {
    return participants.every((p) => this.hasAccessToMessage(p.email, messageId))
  }

  /**
   * Check if ALL participants in a list have access to a speech act
   */
  allHaveAccessToSpeechAct(participants: EmailAddress[], speechActId: string): boolean {
    return participants.every((p) => this.hasAccessToSpeechAct(p.email, speechActId))
  }

  /**
   * Filter emails to only those accessible by ALL current participants
   */
  filterEmails(emails: Email[], currentParticipants: EmailAddress[]): Email[] {
    return emails.filter((email) =>
      this.allHaveAccessToMessage(currentParticipants, email.message_id)
    )
  }

  /**
   * Filter speech acts to only those accessible by ALL current participants
   */
  filterSpeechActs(acts: SpeechAct[], currentParticipants: EmailAddress[]): SpeechAct[] {
    return acts.filter((act) => this.allHaveAccessToSpeechAct(currentParticipants, act.id))
  }

  /**
   * Filter knowledge entries to only those accessible by ALL current participants
   */
  filterKnowledgeEntries(
    entries: KnowledgeEntry[],
    currentParticipants: EmailAddress[]
  ): KnowledgeEntry[] {
    return entries.filter((entry) => {
      // Check if all current participants have access to at least one source message
      return currentParticipants.every((participant) =>
        entry.source_message_ids.some((msgId) => this.hasAccessToMessage(participant.email, msgId))
      )
    })
  }

  /**
   * Check if information can be shared with current participants
   * and provide detailed result
   */
  checkAccess(
    sourceMessageIds: string[],
    currentParticipants: EmailAddress[]
  ): PrivacyFilterResult {
    const restrictedParticipants: EmailAddress[] = []

    for (const participant of currentParticipants) {
      const hasAccess = sourceMessageIds.some((msgId) =>
        this.hasAccessToMessage(participant.email, msgId)
      )
      if (!hasAccess) {
        restrictedParticipants.push(participant)
      }
    }

    if (restrictedParticipants.length > 0) {
      const names = restrictedParticipants
        .map((p) => p.name || p.email)
        .join(', ')
      return {
        allowed: false,
        reason: `Cannot share this information due to the presence of: ${names}`,
        restricted_participants: restrictedParticipants,
      }
    }

    return {
      allowed: true,
    }
  }

  /**
   * Get participant context
   */
  getParticipantContext(email: string): ParticipantContext | undefined {
    return this.participantContexts.get(email)
  }

  /**
   * Get all tracked participants
   */
  getAllParticipants(): EmailAddress[] {
    return Array.from(this.participantContexts.values()).map((ctx) => ctx.participant)
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.participantContexts.clear()
  }
}

export function createPrivacyTracker(): PrivacyTracker {
  return new PrivacyTracker()
}
