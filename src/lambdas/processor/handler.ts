/**
 * Processor Lambda Handler
 * Invoked by ingest Lambda after email is stored
 *
 * Responsibilities:
 * 1. Fetch email from DynamoDB
 * 2. Detect speech acts using Claude
 * 3. Store speech acts in DynamoDB
 * 4. Decide if Schrute should respond (activation)
 * 5. Log activation decision
 * 6. If should respond, invoke responder Lambda
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import {
  DynamoDBMessageStore,
  DynamoDBSpeechActStore,
  DynamoDBActivationLogStore,
  S3EmailStore,
} from '~/lib/storage'
import { SpeechActDetector } from '~/lib/speech-acts/detector'
import { ActivationDecider } from '~/lib/activation/decider'
import type { Email, SchruteConfig } from '~/lib/types'
import { v4 as uuidv4 } from 'uuid'

// Environment variables
const ANTHROPIC_API_KEY_SECRET = process.env.ANTHROPIC_API_KEY_SECRET!
const MESSAGES_TABLE = process.env.MESSAGES_TABLE!
const SPEECH_ACTS_TABLE = process.env.SPEECH_ACTS_TABLE!
const ACTIVATION_LOG_TABLE = process.env.ACTIVATION_LOG_TABLE!
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET!
const RESPONDER_FUNCTION = process.env.RESPONDER_FUNCTION!
const SCHRUTE_EMAIL = process.env.SCHRUTE_EMAIL!
const AWS_REGION = process.env.AWS_REGION || 'us-east-1'

// Clients
const lambdaClient = new LambdaClient({ region: AWS_REGION })
const secretsClient = new SecretsManagerClient({ region: AWS_REGION })

// Stores
const messageStore = new DynamoDBMessageStore(MESSAGES_TABLE, AWS_REGION)
const speechActStore = new DynamoDBSpeechActStore(SPEECH_ACTS_TABLE, AWS_REGION)
const activationLogStore = new DynamoDBActivationLogStore(ACTIVATION_LOG_TABLE, AWS_REGION)
const emailStore = new S3EmailStore('', PROCESSED_BUCKET, AWS_REGION)

// Cache for API key
let cachedApiKey: string | null = null

/**
 * Processor event payload from ingest Lambda
 */
interface ProcessorEvent {
  messageId: string
  threadId: string
  timestamp: string
  from: string
  subject: string
}

/**
 * Main Lambda handler
 */
export async function handler(event: ProcessorEvent): Promise<void> {
  console.log('Processor Lambda triggered', JSON.stringify(event, null, 2))

  try {
    // 1. Get API key (ensures it's cached for detector/decider)
    await getAnthropicApiKey()

    // 2. Fetch message and email
    const message = await messageStore.getMessage(event.messageId)
    if (!message) {
      throw new Error(`Message not found: ${event.messageId}`)
    }

    const emailJson = await emailStore.getProcessedEmail(`${event.threadId}/${event.messageId}.json`)
    if (!emailJson) {
      throw new Error(`Processed email not found: ${event.threadId}/${event.messageId}`)
    }
    const email: Email = JSON.parse(emailJson)

    // 3. Detect speech acts
    const detector = new SpeechActDetector()
    const speechActs = await detector.detectSpeechActs(email)

    console.log(`Detected ${speechActs.length} speech acts`, {
      acts: speechActs.map((act) => ({ type: act.type, confidence: act.confidence })),
    })

    // 4. Store speech acts
    for (const act of speechActs) {
      await speechActStore.putSpeechAct(act)
    }

    // 5. Decide if should respond (activation)
    const schruteConfig: SchruteConfig = {
      name: 'Schrute',
      email: { email: SCHRUTE_EMAIL },
      personality: 'default',
      aliases: [],
      areas_of_responsibility: [],
      expertise_keywords: [],
    }

    const decider = new ActivationDecider()
    const recentMessages = await messageStore.getMessagesByThread(event.threadId)

    // Convert Message[] to Email[] for activation decision
    const recentEmails = await Promise.all(
      recentMessages.slice(-5).map(async (msg) => {
        const json = await emailStore.getProcessedEmail(`${msg.thread_id}/${msg.message_id}.json`)
        return json ? (JSON.parse(json) as Email) : null
      })
    )
    const validEmails = recentEmails.filter((e): e is Email => e !== null)

    const decision = await decider.shouldRespond({
      email,
      threadHistory: validEmails,
      schruteConfig,
    })

    console.log('Activation decision', {
      shouldRespond: decision.should_respond,
      confidence: decision.confidence,
      reasons: decision.reasons,
    })

    // 6. Log activation decision
    await activationLogStore.logActivation({
      logId: uuidv4(),
      threadId: event.threadId,
      messageId: event.messageId,
      timestamp: event.timestamp,
      shouldRespond: decision.should_respond,
      reason: decision.reasons.join('; '),
      schruteAddressed: decision.reasons.some((r) => r.toLowerCase().includes('addressed')),
    })

    // 7. If should respond, invoke responder Lambda
    if (decision.should_respond) {
      await invokeResponder(event)
      console.log('Invoked responder Lambda', { messageId: event.messageId })
    } else {
      console.log('Not responding to this email', { reasons: decision.reasons })
    }
  } catch (error) {
    console.error('Error processing email', { event, error })
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
 * Invoke responder Lambda asynchronously
 */
async function invokeResponder(event: ProcessorEvent): Promise<void> {
  const command = new InvokeCommand({
    FunctionName: RESPONDER_FUNCTION,
    InvocationType: 'Event', // Async invocation
    Payload: JSON.stringify(event),
  })

  await lambdaClient.send(command)
}
