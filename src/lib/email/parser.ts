import { readFile } from 'fs/promises'
import { parse } from 'yaml'
import { z } from 'zod'
import {
  Email,
  EmailSchema,
  EmailThread,
  EmailAddress,
  EmailAddressSchema,
} from '~/lib/types/index.js'

/**
 * Schema for a YAML file containing multiple emails
 */
const EmailFileSchema = z.object({
  emails: z.array(EmailSchema),
})

/**
 * Load and parse emails from a YAML file
 */
export async function loadEmailsFromYaml(filePath: string): Promise<Email[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const parsed = parse(content)
    const validated = EmailFileSchema.parse(parsed)
    return validated.emails
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid email format in ${filePath}: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      )
    }
    throw new Error(`Failed to load emails from ${filePath}: ${error}`)
  }
}

/**
 * Build email threads from a list of emails
 */
export function buildThreads(emails: Email[]): EmailThread[] {
  const threadMap = new Map<string, Email[]>()

  // Group emails by thread_id
  for (const email of emails) {
    const existing = threadMap.get(email.thread_id) || []
    existing.push(email)
    threadMap.set(email.thread_id, existing)
  }

  // Sort each thread by timestamp and build thread objects
  const threads: EmailThread[] = []
  for (const [thread_id, messages] of threadMap) {
    // Sort messages chronologically
    const sortedMessages = messages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // Collect unique participants
    const participantMap = new Map<string, EmailAddress>()
    for (const msg of sortedMessages) {
      participantMap.set(msg.from.email, msg.from)
      for (const recipient of [...msg.to, ...(msg.cc || [])]) {
        participantMap.set(recipient.email, recipient)
      }
    }

    threads.push({
      thread_id,
      subject: sortedMessages[0].subject,
      messages: sortedMessages,
      participants: Array.from(participantMap.values()),
    })
  }

  return threads
}

/**
 * Get all participants from an email (sender + recipients)
 */
export function getEmailParticipants(email: Email): EmailAddress[] {
  const participantMap = new Map<string, EmailAddress>()
  participantMap.set(email.from.email, email.from)
  for (const recipient of [...email.to, ...(email.cc || [])]) {
    participantMap.set(recipient.email, recipient)
  }
  return Array.from(participantMap.values())
}

/**
 * Check if an email address is a participant in an email
 */
export function isParticipant(email: Email, address: string): boolean {
  return getEmailParticipants(email).some((p) => p.email === address)
}

/**
 * Get all participants in a thread
 */
export function getThreadParticipants(thread: EmailThread): EmailAddress[] {
  const participantMap = new Map<string, EmailAddress>()
  for (const message of thread.messages) {
    for (const participant of getEmailParticipants(message)) {
      participantMap.set(participant.email, participant)
    }
  }
  return Array.from(participantMap.values())
}

/**
 * Validate email address
 */
export function validateEmailAddress(address: unknown): EmailAddress {
  return EmailAddressSchema.parse(address)
}
