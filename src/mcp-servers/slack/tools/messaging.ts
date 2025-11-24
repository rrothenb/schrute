/**
 * Messaging tools for Slack MCP server
 */

import type { SlackClient } from '../client.js'
import type { MappingsStorage } from '../storage/mappings.js'
import { markdownToSlack, slackToMarkdown } from './formatting.js'

export interface SendMessageArgs {
  channel: string
  text: string
  thread_ts?: string
  blocks?: any[]
  convertMarkdown?: boolean
}

export interface ReadChannelArgs {
  channel: string
  limit?: number
  oldest?: string
  latest?: string
  convertToMarkdown?: boolean
}

export interface GetThreadArgs {
  channel: string
  thread_ts: string
  convertToMarkdown?: boolean
}

export interface UpdateMessageArgs {
  channel: string
  ts: string
  text: string
  blocks?: any[]
  convertMarkdown?: boolean
}

/**
 * Send a message to a Slack channel or thread
 */
export async function sendMessage(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: SendMessageArgs
): Promise<any> {
  const { channel, text, thread_ts, blocks, convertMarkdown = true } = _args

  // Convert markdown if requested
  const formattedText = convertMarkdown ? markdownToSlack(text) : text

  const result = await _client.sendMessage(channel, formattedText, thread_ts, blocks)

  if (!result.ok) {
    throw new Error(`Failed to send message: ${result.error}`)
  }

  return {
    success: true,
    timestamp: result.ts,
    channel,
    thread_ts
  }
}

/**
 * Read messages from a Slack channel
 */
export async function readChannel(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: ReadChannelArgs
): Promise<any> {
  const { channel, limit = 100, oldest, latest, convertToMarkdown = true } = _args

  const result = await _client.readChannel(channel, limit, oldest, latest)

  if (!result.ok) {
    throw new Error(`Failed to read channel: ${result.error}`)
  }

  const messages = result.messages || []

  // Convert to markdown if requested
  if (convertToMarkdown) {
    messages.forEach(msg => {
      if (msg.text) {
        msg.text = slackToMarkdown(msg.text)
      }
    })
  }

  return {
    success: true,
    channel,
    messageCount: messages.length,
    messages
  }
}

/**
 * Get all messages in a Slack thread
 */
export async function getThread(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: GetThreadArgs
): Promise<any> {
  const { channel, thread_ts, convertToMarkdown = true } = _args

  const result = await _client.getThread(channel, thread_ts)

  if (!result.ok) {
    throw new Error(`Failed to get thread: ${result.error}`)
  }

  const messages = result.messages || []

  // Convert to markdown if requested
  if (convertToMarkdown) {
    messages.forEach(msg => {
      if (msg.text) {
        msg.text = slackToMarkdown(msg.text)
      }
    })
  }

  // Check if this thread is linked to a GitHub issue
  const threadMapping = _storage.getThreadMapping(channel, thread_ts)

  return {
    success: true,
    channel,
    thread_ts,
    messageCount: messages.length,
    messages,
    linkedToGitHub: threadMapping ? {
      repo: threadMapping.githubRepo,
      issueNumber: threadMapping.githubIssueNumber,
      prNumber: threadMapping.githubPRNumber
    } : null
  }
}

/**
 * Update an existing message
 */
export async function updateMessage(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: UpdateMessageArgs
): Promise<any> {
  const { channel, ts, text, blocks, convertMarkdown = true } = _args

  // Convert markdown if requested
  const formattedText = convertMarkdown ? markdownToSlack(text) : text

  const result = await _client.updateMessage(channel, ts, formattedText, blocks)

  if (!result.ok) {
    throw new Error(`Failed to update message: ${result.error}`)
  }

  return {
    success: true,
    channel,
    timestamp: ts
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: { channel: string; ts: string }
): Promise<any> {
  const { channel, ts } = _args

  const result = await _client.deleteMessage(channel, ts)

  if (!result.ok) {
    throw new Error(`Failed to delete message: ${result.error}`)
  }

  return {
    success: true,
    channel,
    timestamp: ts
  }
}

/**
 * Add a reaction to a message
 */
export async function addReaction(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: { channel: string; timestamp: string; emoji: string }
): Promise<any> {
  const { channel, timestamp, emoji } = _args

  // Remove : from emoji if present
  const cleanEmoji = emoji.replace(/:/g, '')

  const result = await _client.addReaction(channel, timestamp, cleanEmoji)

  if (!result.ok) {
    throw new Error(`Failed to add reaction: ${result.error}`)
  }

  return {
    success: true,
    channel,
    timestamp,
    emoji: cleanEmoji
  }
}
