/**
 * Storage abstraction interfaces for local and cloud storage
 */

import type { Message, Thread, SpeechAct } from '~/lib/types'

/**
 * Generic storage interface for messages
 */
export interface IMessageStore {
  /**
   * Store a message
   */
  putMessage(message: Message): Promise<void>

  /**
   * Get a message by ID
   */
  getMessage(messageId: string): Promise<Message | null>

  /**
   * Get all messages in a thread, sorted by timestamp
   */
  getMessagesByThread(threadId: string): Promise<Message[]>

  /**
   * Get messages in a thread within a time range
   */
  getMessagesByThreadAndTimeRange(
    threadId: string,
    startTime: string,
    endTime: string
  ): Promise<Message[]>
}

/**
 * Generic storage interface for threads
 */
export interface IThreadStore {
  /**
   * Store or update thread metadata
   */
  putThread(thread: Thread): Promise<void>

  /**
   * Get thread metadata
   */
  getThread(threadId: string): Promise<Thread | null>

  /**
   * Update thread participants (add new participants)
   */
  updateThreadParticipants(threadId: string, newParticipants: string[]): Promise<void>

  /**
   * Update thread last message
   */
  updateThreadLastMessage(threadId: string, messageId: string, timestamp: string): Promise<void>
}

/**
 * Generic storage interface for speech acts
 */
export interface ISpeechActStore {
  /**
   * Store a speech act
   */
  putSpeechAct(act: SpeechAct): Promise<void>

  /**
   * Get speech acts by thread
   */
  getSpeechActsByThread(threadId: string): Promise<SpeechAct[]>

  /**
   * Get speech acts by type
   */
  getSpeechActsByType(type: string): Promise<SpeechAct[]>

  /**
   * Get all speech acts
   */
  getAllSpeechActs(): Promise<SpeechAct[]>
}

/**
 * Generic storage interface for activation logs
 */
export interface IActivationLogStore {
  /**
   * Log an activation decision
   */
  logActivation(log: ActivationLog): Promise<void>

  /**
   * Get activation logs for a thread
   */
  getActivationLogsByThread(threadId: string): Promise<ActivationLog[]>
}

/**
 * Activation log entry
 */
export interface ActivationLog {
  logId: string
  threadId: string
  messageId: string
  timestamp: string
  shouldRespond: boolean
  reason: string
  schruteAddressed: boolean
  responseSent?: boolean
  responseMessageId?: string
}

/**
 * Generic storage interface for email content
 */
export interface IEmailStore {
  /**
   * Store raw email (EML format)
   */
  putRawEmail(messageId: string, content: string): Promise<string>

  /**
   * Get raw email
   */
  getRawEmail(key: string): Promise<string | null>

  /**
   * Store processed email (JSON)
   */
  putProcessedEmail(threadId: string, messageId: string, content: string): Promise<string>

  /**
   * Get processed email
   */
  getProcessedEmail(key: string): Promise<string | null>
}

/**
 * Generic storage interface for knowledge entries
 */
export interface IKnowledgeStore {
  /**
   * Store knowledge entry
   */
  putKnowledge(id: string, category: string, content: string): Promise<string>

  /**
   * Get knowledge entry
   */
  getKnowledge(id: string, category: string): Promise<string | null>

  /**
   * List knowledge entries by category
   */
  listKnowledgeByCategory(category: string): Promise<Array<{ id: string; key: string }>>

  /**
   * Delete knowledge entry
   */
  deleteKnowledge(id: string, category: string): Promise<void>
}
