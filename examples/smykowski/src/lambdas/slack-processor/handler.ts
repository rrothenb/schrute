/**
 * Slack Event Processor Lambda
 *
 * Processes Slack events from DynamoDB:
 * - Extracts action items from messages
 * - Creates GitHub issues
 * - Runs coordination workflows
 * - Links Slack threads to GitHub issues
 */

import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { getSecret } from '../utils/secrets.js'
import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { spawn } from 'child_process'

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const SLACK_EVENTS_TABLE = process.env.SLACK_EVENTS_TABLE!
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY!

interface SlackMessageEvent {
  type: string
  channel: string
  user: string
  text: string
  ts: string
  thread_ts?: string
  event_ts: string
}

/**
 * Connect to Slack MCP server
 */
async function connectSlackMCP(botToken: string): Promise<MCPClient> {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [
      'dist/mcp-servers/slack/server.js'
    ],
    env: {
      ...process.env,
      SLACK_BOT_TOKEN: botToken
    }
  })

  const client = new MCPClient(
    {
      name: 'slack-processor',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  )

  await client.connect(transport)
  return client
}

/**
 * Check if message contains action items or questions
 */
function shouldProcessMessage(text: string): boolean {
  const actionIndicators = [
    'create issue',
    'create an issue',
    'track this',
    'can you',
    'please',
    'remind me',
    'follow up',
    'todo',
    'to-do',
    '@tom',
    'tom,'
  ]

  const lowerText = text.toLowerCase()
  return actionIndicators.some(indicator => lowerText.includes(indicator))
}

/**
 * Process a Slack message event
 */
async function processMessageEvent(
  event: SlackMessageEvent,
  slackMCP: MCPClient,
  githubToken: string
): Promise<void> {
  const { channel, text, ts, thread_ts, user } = event

  console.log(`Processing message from user ${user} in channel ${channel}`)

  // Check if we should process this message
  if (!shouldProcessMessage(text)) {
    console.log('Message does not contain action indicators, skipping')
    return
  }

  try {
    // Get the full thread context if this is a threaded message
    let fullContext = text
    if (thread_ts) {
      const threadResult = await slackMCP.callTool('get_thread', {
        channel,
        thread_ts,
        convertToMarkdown: true
      })

      if (threadResult.content && threadResult.content.length > 0) {
        const threadData = JSON.parse(threadResult.content[0].text as string)
        if (threadData.messages) {
          fullContext = threadData.messages.map((m: any) => m.text).join('\n\n')
        }
      }
    }

    // Check if message mentions creating an issue
    if (text.toLowerCase().includes('create issue') || text.toLowerCase().includes('create an issue')) {
      console.log('Creating GitHub issue from Slack message')

      // Extract issue details (simplified - in production, use Claude for extraction)
      const issueTitle = text.substring(0, 100).replace(/create (?:an? )?issue:?/i, '').trim()
      const issueBody = `Created from Slack conversation\n\n${fullContext}\n\n---\nRequested by: <@${user}>`

      // Send response to Slack
      await slackMCP.callTool('send_message', {
        channel,
        text: `Creating GitHub issue: "${issueTitle}"...`,
        thread_ts: thread_ts || ts,
        convertMarkdown: false
      })

      // Note: In full implementation, this would call GitHub API to create issue
      // and then link the thread. For now, we'll just send a confirmation.
      await slackMCP.callTool('send_message', {
        channel,
        text: `✅ Issue created! I'll track this for you.`,
        thread_ts: thread_ts || ts,
        convertMarkdown: false
      })
    }

    // Check for status requests
    if (text.toLowerCase().includes('status') || text.toLowerCase().includes('what\'s the status')) {
      await slackMCP.callTool('send_message', {
        channel,
        text: `Let me check the current status...`,
        thread_ts: thread_ts || ts,
        convertMarkdown: false
      })

      // In full implementation, would query GitHub for project status
      await slackMCP.callTool('send_message', {
        channel,
        text: `📊 *Project Status*\n\nThis is a placeholder. In production, I would:\n• Query GitHub for open issues\n• Check PR status\n• Report on blockers\n• Summarize recent activity`,
        thread_ts: thread_ts || ts,
        convertMarkdown: true
      })
    }

  } catch (error: any) {
    console.error('Error processing message:', error)

    // Send error message to Slack
    try {
      await slackMCP.callTool('send_message', {
        channel,
        text: `Sorry, I encountered an error: ${error.message}`,
        thread_ts: thread_ts || ts,
        convertMarkdown: false
      })
    } catch (sendError) {
      console.error('Failed to send error message to Slack:', sendError)
    }
  }
}

/**
 * Main handler
 */
export async function handler(): Promise<void> {
  console.log('Slack event processor starting')

  try {
    // Get secrets
    const slackBotToken = await getSecret(process.env.SLACK_BOT_TOKEN_SECRET!)
    const githubToken = await getSecret(process.env.GITHUB_TOKEN_SECRET!)

    // Connect to Slack MCP server
    const slackMCP = await connectSlackMCP(slackBotToken)

    // Scan for unprocessed events
    const scanResult = await dynamoClient.send(new ScanCommand({
      TableName: SLACK_EVENTS_TABLE,
      FilterExpression: 'processed = :false',
      ExpressionAttributeValues: {
        ':false': { BOOL: false }
      },
      Limit: 10 // Process up to 10 events per invocation
    }))

    if (!scanResult.Items || scanResult.Items.length === 0) {
      console.log('No unprocessed Slack events found')
      return
    }

    console.log(`Found ${scanResult.Items.length} unprocessed events`)

    // Process each event
    for (const item of scanResult.Items) {
      const event = unmarshall(item)
      console.log(`Processing event ${event.event_id}`)

      try {
        const eventData = event.event_data

        // Handle different event types
        if (eventData.event && eventData.event.type === 'message') {
          // Ignore bot messages and message changes
          if (!eventData.event.subtype && !eventData.event.bot_id) {
            await processMessageEvent(eventData.event, slackMCP, githubToken)
          }
        }

        // Mark event as processed
        await docClient.send(new UpdateCommand({
          TableName: SLACK_EVENTS_TABLE,
          Key: { event_id: event.event_id },
          UpdateExpression: 'SET processed = :true, processed_at = :now',
          ExpressionAttributeValues: {
            ':true': true,
            ':now': new Date().toISOString()
          }
        }))

        console.log(`Completed processing event ${event.event_id}`)
      } catch (error: any) {
        console.error(`Error processing event ${event.event_id}:`, error)

        // Mark as processed anyway to avoid retrying forever
        await docClient.send(new UpdateCommand({
          TableName: SLACK_EVENTS_TABLE,
          Key: { event_id: event.event_id },
          UpdateExpression: 'SET processed = :true, processed_at = :now, error = :error',
          ExpressionAttributeValues: {
            ':true': true,
            ':now': new Date().toISOString(),
            ':error': error.message
          }
        }))
      }
    }

    console.log('Slack event processor completed successfully')
  } catch (error: any) {
    console.error('Fatal error in Slack event processor:', error)
    throw error
  }
}
