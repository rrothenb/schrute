/**
 * EML email format parser
 * Parses raw email messages (RFC 822 format) from SES
 */

import { simpleParser, ParsedMail, AddressObject } from 'mailparser'
import type { Email, EmailAddress } from '~/lib/types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Parse EML content into Email type
 */
export async function parseEML(emlContent: string): Promise<Email> {
  const parsed = await simpleParser(emlContent)

  // Extract message ID (use existing or generate)
  const messageId = extractMessageId(parsed) || `msg-${uuidv4()}`

  // Extract thread ID from references or in-reply-to
  const threadId = extractThreadId(parsed) || `thread-${uuidv4()}`

  // Extract sender
  const from = extractSender(parsed)

  // Extract recipients
  const to = extractRecipients(parsed.to)
  const cc = extractRecipients(parsed.cc)

  // Extract subject
  const subject = parsed.subject || '(no subject)'

  // Extract body (prefer text, fall back to HTML)
  const body = parsed.text || parsed.html || ''

  // Extract timestamp
  const timestamp = parsed.date ? parsed.date.toISOString() : new Date().toISOString()

  // Extract in-reply-to
  const inReplyTo = parsed.inReplyTo || undefined

  return {
    message_id: messageId,
    thread_id: threadId,
    from,
    to,
    cc,
    subject,
    body,
    timestamp,
    in_reply_to: inReplyTo,
  }
}

/**
 * Extract message ID from parsed email
 */
function extractMessageId(parsed: ParsedMail): string | null {
  if (parsed.messageId) {
    // Clean up message ID (remove < and >)
    return parsed.messageId.replace(/[<>]/g, '')
  }
  return null
}

/**
 * Extract thread ID from email headers
 * Uses References header or In-Reply-To, or generates new
 */
function extractThreadId(parsed: ParsedMail): string | null {
  // Try References header first (most reliable for threading)
  if (parsed.references && parsed.references.length > 0) {
    // Use first reference as thread ID
    return parsed.references[0].replace(/[<>]/g, '')
  }

  // Try In-Reply-To
  if (parsed.inReplyTo) {
    return parsed.inReplyTo.replace(/[<>]/g, '')
  }

  // For new threads, we'll generate a new ID
  return null
}

/**
 * Extract sender from parsed email
 */
function extractSender(parsed: ParsedMail): EmailAddress {
  if (parsed.from && parsed.from.value && parsed.from.value.length > 0) {
    const sender = parsed.from.value[0]
    return {
      email: sender.address || '',
      name: sender.name,
    }
  }

  // Fallback
  return {
    email: 'unknown@unknown.com',
  }
}

/**
 * Extract recipients from address object
 */
function extractRecipients(addressObj: AddressObject | AddressObject[] | undefined): EmailAddress[] {
  if (!addressObj) {
    return []
  }

  // Handle array of address objects
  const addresses = Array.isArray(addressObj) ? addressObj : [addressObj]

  const recipients: EmailAddress[] = []

  for (const addr of addresses) {
    if (addr.value) {
      for (const recipient of addr.value) {
        recipients.push({
          email: recipient.address || '',
          name: recipient.name,
        })
      }
    }
  }

  return recipients
}

/**
 * Extract all participants (from, to, cc) as email strings
 */
export function extractParticipants(email: Email): string[] {
  const participants = new Set<string>()

  participants.add(email.from.email)

  for (const recipient of email.to) {
    participants.add(recipient.email)
  }

  for (const recipient of email.cc || []) {
    participants.add(recipient.email)
  }

  return Array.from(participants)
}
