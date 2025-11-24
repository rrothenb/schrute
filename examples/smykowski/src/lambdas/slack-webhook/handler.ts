/**
 * Slack Webhook Handler Lambda
 *
 * Receives Slack events, verifies signature, and stores them for processing.
 * This is intentionally minimal - just ingestion, no business logic.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import * as crypto from 'crypto'
import { getSecret } from '../utils/secrets.js'

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const SLACK_EVENTS_TABLE = process.env.SLACK_EVENTS_TABLE!

/**
 * Verify Slack request signature
 */
function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): boolean {
  // Reject old requests (replay attack prevention)
  const requestTimestamp = parseInt(timestamp, 10)
  const currentTimestamp = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTimestamp - requestTimestamp) > 60 * 5) {
    return false
  }

  // Calculate expected signature
  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex')

  // Use timingSafeEqual to prevent timing attacks
  const mySignatureBuffer = Buffer.from(mySignature)
  const signatureBuffer = Buffer.from(signature)

  if (mySignatureBuffer.length !== signatureBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(mySignatureBuffer, signatureBuffer)
}

/**
 * Handle Slack webhook events
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Received Slack webhook event')

  try {
    // Get signing secret
    const signingSecret = await getSecret(process.env.SLACK_SIGNING_SECRET!)

    // Verify signature
    const body = event.body || ''
    const timestamp = event.headers['X-Slack-Request-Timestamp'] || event.headers['x-slack-request-timestamp'] || ''
    const signature = event.headers['X-Slack-Signature'] || event.headers['x-slack-signature'] || ''

    if (!verifySlackSignature(body, timestamp, signature, signingSecret)) {
      console.error('Invalid Slack signature')
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' })
      }
    }

    // Parse event
    const slackEvent = JSON.parse(body)

    // Handle URL verification challenge
    if (slackEvent.type === 'url_verification') {
      console.log('Responding to URL verification challenge')
      return {
        statusCode: 200,
        body: JSON.stringify({ challenge: slackEvent.challenge })
      }
    }

    // Store event in DynamoDB for async processing
    const eventId = `slack-${Date.now()}-${Math.random().toString(36).substring(7)}`

    await docClient.send(new PutCommand({
      TableName: SLACK_EVENTS_TABLE,
      Item: {
        event_id: eventId,
        event_type: slackEvent.type,
        event_data: slackEvent,
        timestamp: new Date().toISOString(),
        processed: false,
        ttl: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days TTL
      }
    }))

    console.log(`Stored Slack event: ${eventId}`)

    // Return 200 immediately (Slack requires fast response)
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    }
  } catch (error: any) {
    console.error('Error processing Slack webhook:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
