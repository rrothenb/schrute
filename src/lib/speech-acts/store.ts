import { SpeechAct, SpeechActType, EmailAddress } from '~/lib/types/index.js'

export interface SpeechActQuery {
  type?: SpeechActType
  threadId?: string
  participantEmail?: string
  afterTimestamp?: string
  beforeTimestamp?: string
  minConfidence?: number
}

export class SpeechActStore {
  private acts: Map<string, SpeechAct> = new Map()

  /**
   * Add a speech act to the store
   */
  add(act: SpeechAct): void {
    this.acts.set(act.id, act)
  }

  /**
   * Add multiple speech acts
   */
  addMany(acts: SpeechAct[]): void {
    for (const act of acts) {
      this.add(act)
    }
  }

  /**
   * Get a speech act by ID
   */
  get(id: string): SpeechAct | undefined {
    return this.acts.get(id)
  }

  /**
   * Query speech acts
   */
  query(query: SpeechActQuery = {}): SpeechAct[] {
    let results = Array.from(this.acts.values())

    if (query.type) {
      results = results.filter((act) => act.type === query.type)
    }

    if (query.threadId) {
      results = results.filter((act) => act.thread_id === query.threadId)
    }

    if (query.participantEmail) {
      results = results.filter((act) =>
        act.participants.some((p) => p.email === query.participantEmail)
      )
    }

    if (query.afterTimestamp) {
      const after = new Date(query.afterTimestamp)
      results = results.filter((act) => new Date(act.timestamp) >= after)
    }

    if (query.beforeTimestamp) {
      const before = new Date(query.beforeTimestamp)
      results = results.filter((act) => new Date(act.timestamp) <= before)
    }

    if (query.minConfidence !== undefined) {
      const minConf = query.minConfidence
      results = results.filter((act) => act.confidence >= minConf)
    }

    // Sort by timestamp (newest first)
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /**
   * Get all speech acts
   */
  getAll(): SpeechAct[] {
    return Array.from(this.acts.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  /**
   * Get speech acts by type
   */
  getByType(type: SpeechActType): SpeechAct[] {
    return this.query({ type })
  }

  /**
   * Get speech acts for a thread
   */
  getByThread(threadId: string): SpeechAct[] {
    return this.query({ threadId })
  }

  /**
   * Get speech acts visible to a participant
   */
  getVisibleTo(participant: EmailAddress): SpeechAct[] {
    return Array.from(this.acts.values()).filter((act) =>
      act.participants.some((p) => p.email === participant.email)
    )
  }

  /**
   * Clear all speech acts
   */
  clear(): void {
    this.acts.clear()
  }

  /**
   * Get count of speech acts
   */
  count(): number {
    return this.acts.size
  }

  /**
   * Serialize to JSON
   */
  toJSON(): SpeechAct[] {
    return this.getAll()
  }

  /**
   * Load from JSON
   */
  fromJSON(acts: SpeechAct[]): void {
    this.clear()
    this.addMany(acts)
  }
}

export function createSpeechActStore(): SpeechActStore {
  return new SpeechActStore()
}
