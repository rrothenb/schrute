/**
 * Responder Lambda Handler
 * Invoked by processor Lambda when Schrute should respond
 *
 * Responsibilities:
 * 1. Fetch thread messages and speech acts
 * 2. Assemble context with relevance ranking
 * 3. Load personality configuration
 * 4. Generate response using Claude
 * 5. Send email via SES
 * 6. Store sent email in system
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import {
  DynamoDBMessageStore,
  DynamoDBSpeechActStore,
  DynamoDBActivationLogStore,
  S3EmailStore,
} from '~/lib/storage'
import { ContextAssembler } from '~/lib/memory/context-assembler'
import { QueryHandler } from '~/lib/query/handler'
import { PrivacyTracker } from '~/lib/privacy/tracker'
import { ClaudeClient } from '~/lib/claude/client'
import type { Email, QueryRequest, PersonalityConfig } from '~/lib/types'
import { v4 as uuidv4 } from 'uuid'
import yaml from 'yaml'

// Environment variables
const ANTHROPIC_API_KEY_SECRET = process.env.ANTHROPIC_API_KEY_SECRET!
const MESSAGES_TABLE = process.env.MESSAGES_TABLE!
const SPEECH_ACTS_TABLE = process.env.SPEECH_ACTS_TABLE!
const ACTIVATION_LOG_TABLE = process.env.ACTIVATION_LOG_TABLE!
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET!
const PERSONALITIES_BUCKET = process.env.PERSONALITIES_BUCKET!
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL!
const CONTEXT_WINDOW_SIZE = parseInt(process.env.CONTEXT_WINDOW_SIZE || '10', 10)
const AWS_REGION = process.env.AWS_REGION || 'us-east-1'

// Clients
const sesClient = new SESClient({ region: AWS_REGION })
const secretsClient = new SecretsManagerClient({ region: AWS_REGION })
const s3Client = new S3Client({ region: AWS_REGION })

// Stores
const messageStore = new DynamoDBMessageStore(MESSAGES_TABLE, AWS_REGION)
const speechActStore = new DynamoDBSpeechActStore(SPEECH_ACTS_TABLE, AWS_REGION)
const activationLogStore = new DynamoDBActivationLogStore(ACTIVATION_LOG_TABLE, AWS_REGION)
const emailStore = new S3EmailStore('', PROCESSED_BUCKET, AWS_REGION)

// Cache for API key and personalities
let cachedApiKey: string | null = null
const personalityCache = new Map<string, string>()

/**
 * Responder event payload from processor Lambda
 */
interface ResponderEvent {
  messageId: string
  threadId: string
  timestamp: string
  from: string
  subject: string
}

/**
 * Main Lambda handler
 */
export async function handler(event: ResponderEvent): Promise<void> {
  console.log('Responder Lambda triggered', JSON.stringify(event, null, 2))

  try {
    // 1. Get API key
    const apiKey = await getAnthropicApiKey()
    const claudeClient = new ClaudeClient(apiKey)

    // 2. Fetch all messages in thread
    const messages = await messageStore.getMessagesByThread(event.threadId)
    console.log(`Fetched ${messages.length} messages from thread`)

    // 3. Load full emails from S3
    const emails: Email[] = []
    for (const msg of messages) {
      const emailJson = await emailStore.getProcessedEmail(`${msg.thread_id}/${msg.message_id}.json`)
      if (emailJson) {
        emails.push(JSON.parse(emailJson))
      }
    }

    // 4. Fetch speech acts
    const speechActs = await speechActStore.getSpeechActsByThread(event.threadId)
    console.log(`Fetched ${speechActs.length} speech acts`)

    // 5. Assemble context with relevance ranking
    const assembler = new ContextAssembler(claudeClient, {
      recentWindowSize: CONTEXT_WINDOW_SIZE,
    })
    let context = await assembler.assembleContext(emails, speechActs)
    context = assembler.trimContext(context) // Ensure within token budget

    console.log('Assembled context', {
      recentMessages: context.recent_messages.length,
      summaries: context.summaries.length,
      speechActs: context.relevant_speech_acts.length,
      estimatedTokens: assembler.estimateTokens(context),
    })

    // 6. Load personality (default for now)
    const personalityYaml = await loadPersonality('default')
    const personality: PersonalityConfig | undefined = personalityYaml
      ? (yaml.parse(personalityYaml) as PersonalityConfig)
      : undefined

    // 7. Get the triggering email
    const triggeringEmail = emails.find((e) => e.message_id === event.messageId)
    if (!triggeringEmail) {
      throw new Error(`Triggering email not found: ${event.messageId}`)
    }

    // 8. Generate response using query handler
    // Create privacy tracker and query context
    const privacyTracker = new PrivacyTracker()
    privacyTracker.trackEmails(emails)

    const queryHandler = new QueryHandler()

    const queryRequest: QueryRequest = {
      query: `Respond to this email appropriately:\n\nFrom: ${triggeringEmail.from.name || triggeringEmail.from.email}\nSubject: ${triggeringEmail.subject}\n\n${triggeringEmail.body}`,
      thread_id: event.threadId,
      asker: { email: SES_FROM_EMAIL, name: 'Schrute' },
      context_participants: triggeringEmail.to.concat(triggeringEmail.cc || []),
    }

    const response = await queryHandler.handleQuery(queryRequest, {
      emails: context.recent_messages,
      speechActs: context.relevant_speech_acts,
      knowledgeEntries: context.relevant_knowledge,
      privacyTracker,
      personality,
      threadId: event.threadId,
    })

    console.log('Generated response', {
      answerLength: response.answer.length,
      sources: response.sources.length,
    })

    // 9. Send email via SES
    const responseSubject = triggeringEmail.subject.startsWith('Re: ')
      ? triggeringEmail.subject
      : `Re: ${triggeringEmail.subject}`

    await sendEmail(
      SES_FROM_EMAIL,
      triggeringEmail.from.email,
      responseSubject,
      response.answer,
      triggeringEmail.message_id
    )

    console.log('Sent email via SES', {
      to: triggeringEmail.from.email,
      subject: responseSubject,
    })

    // 10. Update activation log with response sent
    const logs = await activationLogStore.getActivationLogsByThread(event.threadId)
    const latestLog = logs.find((log) => log.messageId === event.messageId)
    if (latestLog) {
      latestLog.responseSent = true
      latestLog.responseMessageId = `schrute-response-${uuidv4()}`
      await activationLogStore.logActivation(latestLog)
    }

    console.log('Response complete', { messageId: event.messageId })
  } catch (error) {
    console.error('Error generating response', { event, error })
    throw error
  }
}

/**
 * Get Anthropic API key from Secrets Manager (with caching)
 */
async function getAnthropicApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey
  }

  const command = new GetSecretValueCommand({
    SecretId: ANTHROPIC_API_KEY_SECRET,
  })

  const response = await secretsClient.send(command)
  if (!response.SecretString) {
    throw new Error('API key secret is empty')
  }

  cachedApiKey = response.SecretString
  return cachedApiKey
}

/**
 * Load personality from S3 (with caching)
 */
async function loadPersonality(name: string): Promise<string> {
  if (personalityCache.has(name)) {
    return personalityCache.get(name)!
  }

  try {
    const command = new GetObjectCommand({
      Bucket: PERSONALITIES_BUCKET,
      Key: `${name}.yaml`,
    })

    const response = await s3Client.send(command)
    const content = await response.Body?.transformToString()

    if (content) {
      personalityCache.set(name, content)
      return content
    }
  } catch (error) {
    console.warn(`Failed to load personality ${name}, using default`, { error })
  }

  // Return empty personality config (will use defaults)
  return ''
}

/**
 * Send email via SES
 */
async function sendEmail(
  from: string,
  to: string,
  subject: string,
  body: string,
  _inReplyTo?: string
): Promise<void> {
  const command = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Text: {
          Data: body,
        },
      },
    },
    // Note: SES doesn't directly support In-Reply-To header via SendEmailCommand
    // Would need to use SendRawEmailCommand for full header control
  })

  await sesClient.send(command)
}
