/**
 * Slack API Client Wrapper
 */

import { WebClient, ChatPostMessageResponse, ConversationsHistoryResponse } from '@slack/web-api'
import type {
  SlackConfig,
  SlackMessage,
  SlackChannel,
  SlackUser
} from './types.js'

export class SlackClient {
  private client: WebClient

  constructor(config: SlackConfig) {
    this.client = new WebClient(config.botToken)
  }

  /**
   * Send a message to a channel or thread
   */
  async sendMessage(
    channel: string,
    text: string,
    thread_ts?: string,
    blocks?: any[]
  ): Promise<{ ok: boolean; ts?: string; error?: string }> {
    try {
      const result = await this.client.chat.postMessage({
        channel,
        text,
        thread_ts,
        blocks
      }) as ChatPostMessageResponse

      return {
        ok: result.ok,
        ts: result.ts,
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * Read channel history
   */
  async readChannel(
    channel: string,
    limit: number = 100,
    oldest?: string,
    latest?: string
  ): Promise<{ ok: boolean; messages?: SlackMessage[]; error?: string }> {
    try {
      const result = await this.client.conversations.history({
        channel,
        limit,
        oldest,
        latest
      }) as ConversationsHistoryResponse

      return {
        ok: result.ok,
        messages: (result.messages || []) as SlackMessage[],
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * Get all messages in a thread
   */
  async getThread(
    channel: string,
    thread_ts: string
  ): Promise<{ ok: boolean; messages?: SlackMessage[]; error?: string }> {
    try {
      const result = await this.client.conversations.replies({
        channel,
        ts: thread_ts
      })

      return {
        ok: result.ok,
        messages: (result.messages || []) as SlackMessage[],
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * Create a new channel
   */
  async createChannel(
    name: string,
    isPrivate: boolean = false
  ): Promise<{ ok: boolean; channel?: SlackChannel; error?: string }> {
    try {
      const result = isPrivate
        ? await this.client.conversations.create({ name, is_private: true })
        : await this.client.conversations.create({ name })

      return {
        ok: result.ok,
        channel: result.channel as SlackChannel,
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * Get channel info
   */
  async getChannel(channelId: string): Promise<{ ok: boolean; channel?: SlackChannel; error?: string }> {
    try {
      const result = await this.client.conversations.info({
        channel: channelId
      })

      return {
        ok: result.ok,
        channel: result.channel as SlackChannel,
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * List all channels
   */
  async listChannels(
    excludeArchived: boolean = true
  ): Promise<{ ok: boolean; channels?: SlackChannel[]; error?: string }> {
    try {
      const result = await this.client.conversations.list({
        exclude_archived: excludeArchived,
        types: 'public_channel,private_channel'
      })

      return {
        ok: result.ok,
        channels: (result.channels || []) as SlackChannel[],
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * Get user info
   */
  async getUser(userId: string): Promise<{ ok: boolean; user?: SlackUser; error?: string }> {
    try {
      const result = await this.client.users.info({
        user: userId
      })

      return {
        ok: result.ok,
        user: result.user as SlackUser,
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<{ ok: boolean; user?: SlackUser; error?: string }> {
    try {
      const result = await this.client.users.lookupByEmail({
        email
      })

      return {
        ok: result.ok,
        user: result.user as SlackUser,
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(
    channel: string,
    timestamp: string,
    name: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const result = await this.client.reactions.add({
        channel,
        timestamp,
        name
      })

      return {
        ok: result.ok,
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * Update a message
   */
  async updateMessage(
    channel: string,
    ts: string,
    text: string,
    blocks?: any[]
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const result = await this.client.chat.update({
        channel,
        ts,
        text,
        blocks
      })

      return {
        ok: result.ok,
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    channel: string,
    ts: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const result = await this.client.chat.delete({
        channel,
        ts
      })

      return {
        ok: result.ok,
        error: result.error
      }
    } catch (error: any) {
      return {
        ok: false,
        error: error.message
      }
    }
  }
}
