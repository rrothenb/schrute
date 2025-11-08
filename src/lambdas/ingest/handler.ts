/**
 * Ingest Lambda Handler
 * Triggered by S3 event when new email arrives from SES
 *
 * Responsibilities:
 * 1. Parse EML email from S3
 * 2. Store message metadata in DynamoDB
 * 3. Update thread metadata
 * 4. Store processed email JSON in S3
 * 5. Invoke processor Lambda
 */

import { S3Event, S3EventRecord } from 'aws-lambda'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { parseEML, extractParticipants } from '~/lib/email/eml-parser'
import {
  DynamoDBMessageStore,
  DynamoDBThreadStore,
  S3EmailStore,
} from '~/lib/storage'
import type { Message, Thread, Email } from '~/lib/types'

// Environment variables
const THREADS_TABLE = process.env.THREADS_TABLE!
const MESSAGES_TABLE = process.env.MESSAGES_TABLE!
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET!
const PROCESSOR_FUNCTION = process.env.PROCESSOR_FUNCTION!
const AWS_REGION = process.env.AWS_REGION || 'us-east-1'

// Clients
const s3Client = new S3Client({ region: AWS_REGION })
const lambdaClient = new LambdaClient({ region: AWS_REGION })

// Stores
const messageStore = new DynamoDBMessageStore(MESSAGES_TABLE, AWS_REGION)
const threadStore = new DynamoDBThreadStore(THREADS_TABLE, AWS_REGION)
const emailStore = new S3EmailStore('', PROCESSED_BUCKET, AWS_REGION)

/**
 * Main Lambda handler
 */
export async function handler(event: S3Event): Promise<void> {
  console.log('Ingest Lambda triggered', JSON.stringify(event, null, 2))

  for (const record of event.Records) {
    try {
      await processEmailRecord(record)
    } catch (error) {
      console.error('Error processing record', { record, error })
      // Log but continue processing other records
    }
  }
}

/**
 * Process a single S3 event record
 */
async function processEmailRecord(record: S3EventRecord): Promise<void> {
  const bucket = record.s3.bucket.name
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))

  console.log('Processing email', { bucket, key })

  // 1. Fetch raw email from S3
  const emlContent = await fetchRawEmail(bucket, key)

  // 2. Parse EML
  const email = await parseEML(emlContent)
  console.log('Parsed email', {
    messageId: email.message_id,
    threadId: email.thread_id,
    from: email.from.email,
    subject: email.subject,
  })

  // 3. Convert to Message format
  const message = emailToMessage(email, key)

  // 4. Store message in DynamoDB
  await messageStore.putMessage(message)
  console.log('Stored message in DynamoDB', { messageId: message.message_id })

  // 5. Update or create thread
  await updateThread(email, message)

  // 6. Store processed email JSON in S3
  const processedKey = await emailStore.putProcessedEmail(
    email.thread_id,
    email.message_id,
    JSON.stringify(email, null, 2)
  )
  console.log('Stored processed email in S3', { key: processedKey })

  // 7. Invoke processor Lambda
  await invokeProcessor(email, message)
  console.log('Invoked processor Lambda', { messageId: email.message_id })
}

/**
 * Fetch raw email from S3
 */
async function fetchRawEmail(bucket: string, key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const response = await s3Client.send(command)
  const body = await response.Body?.transformToString()

  if (!body) {
    throw new Error('Empty email body')
  }

  return body
}

/**
 * Convert Email to Message format
 */
function emailToMessage(email: Email, s3Key: string): Message {
  const participants = extractParticipants(email)

  return {
    message_id: email.message_id,
    thread_id: email.thread_id,
    from_email: email.from.email,
    from_name: email.from.name,
    to: email.to.map((addr) => addr.email),
    cc: email.cc?.map((addr) => addr.email),
    subject: email.subject,
    timestamp: email.timestamp,
    in_reply_to: email.in_reply_to,
    s3_key: s3Key,
    participants,
  }
}

/**
 * Update or create thread in DynamoDB
 */
async function updateThread(email: Email, message: Message): Promise<void> {
  // Check if thread exists
  const existingThread = await threadStore.getThread(email.thread_id)

  if (existingThread) {
    // Update existing thread
    await threadStore.updateThreadParticipants(email.thread_id, message.participants)
    await threadStore.updateThreadLastMessage(
      email.thread_id,
      email.message_id,
      email.timestamp
    )
  } else {
    // Create new thread
    const newThread: Thread = {
      thread_id: email.thread_id,
      subject: email.subject,
      participants: message.participants,
      created_at: email.timestamp,
      updated_at: email.timestamp,
      message_count: 1,
      last_message_id: email.message_id,
    }
    await threadStore.putThread(newThread)
  }
}

/**
 * Invoke processor Lambda asynchronously
 */
async function invokeProcessor(email: Email, _message: Message): Promise<void> {
  const payload = {
    messageId: email.message_id,
    threadId: email.thread_id,
    timestamp: email.timestamp,
    from: email.from.email,
    subject: email.subject,
  }

  const command = new InvokeCommand({
    FunctionName: PROCESSOR_FUNCTION,
    InvocationType: 'Event', // Async invocation
    Payload: JSON.stringify(payload),
  })

  await lambdaClient.send(command)
}
