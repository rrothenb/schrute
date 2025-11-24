#!/usr/bin/env node
/**
 * Slack MCP Server
 *
 * Provides tools for integrating Slack with Smykowski/Schrute:
 * - Send and read messages
 * - Manage channels and users
 * - Link Slack threads to GitHub issues/PRs
 * - Format messages between Slack and markdown
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js'

import { SlackClient } from './client.js'
import { MappingsStorage } from './storage/mappings.js'
import type { SlackConfig } from './types.js'

// Import tool handlers
import * as messaging from './tools/messaging.js'
import * as channels from './tools/channels.js'
import * as users from './tools/users.js'
import * as linking from './tools/linking.js'
import { markdownToSlack, slackToMarkdown } from './tools/formatting.js'

class SlackMCPServer {
  private server: Server
  private client: SlackClient
  private storage: MappingsStorage

  constructor(config: SlackConfig) {
    this.server = new Server(
      {
        name: 'slack-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )

    this.client = new SlackClient(config)
    this.storage = new MappingsStorage(config.mappingsPath)

    this.setupHandlers()
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools()
    }))

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        const result = await this.handleToolCall(name, args || {})
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message
              }, null, 2)
            }
          ],
          isError: true
        }
      }
    })
  }

  private getTools(): Tool[] {
    return [
      // Messaging tools
      {
        name: 'send_message',
        description: 'Send a message to a Slack channel or thread. Supports markdown conversion.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID to send message to' },
            text: { type: 'string', description: 'Message text (supports markdown)' },
            thread_ts: { type: 'string', description: 'Optional: Thread timestamp to reply in thread' },
            convertMarkdown: { type: 'boolean', description: 'Convert markdown to Slack format (default: true)' }
          },
          required: ['channel', 'text']
        }
      },
      {
        name: 'read_channel',
        description: 'Read message history from a Slack channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID to read from' },
            limit: { type: 'number', description: 'Number of messages to retrieve (default: 100)' },
            oldest: { type: 'string', description: 'Only messages after this timestamp' },
            latest: { type: 'string', description: 'Only messages before this timestamp' },
            convertToMarkdown: { type: 'boolean', description: 'Convert Slack format to markdown (default: true)' }
          },
          required: ['channel']
        }
      },
      {
        name: 'get_thread',
        description: 'Get all messages in a Slack thread. Returns linked GitHub issue if available.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID containing the thread' },
            thread_ts: { type: 'string', description: 'Thread timestamp' },
            convertToMarkdown: { type: 'boolean', description: 'Convert to markdown (default: true)' }
          },
          required: ['channel', 'thread_ts']
        }
      },
      {
        name: 'update_message',
        description: 'Update an existing Slack message',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID' },
            ts: { type: 'string', description: 'Message timestamp to update' },
            text: { type: 'string', description: 'New message text' },
            convertMarkdown: { type: 'boolean', description: 'Convert markdown (default: true)' }
          },
          required: ['channel', 'ts', 'text']
        }
      },
      {
        name: 'add_reaction',
        description: 'Add an emoji reaction to a message',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID' },
            timestamp: { type: 'string', description: 'Message timestamp' },
            emoji: { type: 'string', description: 'Emoji name (without colons)' }
          },
          required: ['channel', 'timestamp', 'emoji']
        }
      },

      // Channel tools
      {
        name: 'list_channels',
        description: 'List all Slack channels with their GitHub mappings',
        inputSchema: {
          type: 'object',
          properties: {
            exclude_archived: { type: 'boolean', description: 'Exclude archived channels (default: true)' }
          }
        }
      },
      {
        name: 'get_channel',
        description: 'Get information about a specific channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: { type: 'string', description: 'Channel ID' }
          },
          required: ['channel_id']
        }
      },
      {
        name: 'map_channel_to_repo',
        description: 'Map a Slack channel to a GitHub repository for notifications',
        inputSchema: {
          type: 'object',
          properties: {
            slack_channel_id: { type: 'string', description: 'Slack channel ID' },
            github_repo: { type: 'string', description: 'GitHub repo (owner/repo)' },
            notify_on_issues: { type: 'boolean', description: 'Notify on issue events (default: true)' },
            notify_on_prs: { type: 'boolean', description: 'Notify on PR events (default: true)' }
          },
          required: ['slack_channel_id', 'github_repo']
        }
      },
      {
        name: 'get_channel_for_repo',
        description: 'Find the Slack channel mapped to a GitHub repo',
        inputSchema: {
          type: 'object',
          properties: {
            github_repo: { type: 'string', description: 'GitHub repo (owner/repo)' }
          },
          required: ['github_repo']
        }
      },
      {
        name: 'list_channel_mappings',
        description: 'List all channel-to-repo mappings',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      // User tools
      {
        name: 'get_user',
        description: 'Get information about a Slack user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Slack user ID' }
          },
          required: ['user_id']
        }
      },
      {
        name: 'map_user_to_github',
        description: 'Map a Slack user to a GitHub username',
        inputSchema: {
          type: 'object',
          properties: {
            slack_user_id: { type: 'string', description: 'Slack user ID' },
            github_username: { type: 'string', description: 'GitHub username' },
            email: { type: 'string', description: 'User email address' },
            notify_direct_messages: { type: 'boolean', description: 'Enable DM notifications (default: true)' },
            notify_mentions: { type: 'boolean', description: 'Enable mention notifications (default: true)' },
            notify_assignments: { type: 'boolean', description: 'Enable assignment notifications (default: true)' }
          },
          required: ['slack_user_id', 'github_username', 'email']
        }
      },
      {
        name: 'get_user_for_github',
        description: 'Find the Slack user for a GitHub username',
        inputSchema: {
          type: 'object',
          properties: {
            github_username: { type: 'string', description: 'GitHub username' }
          },
          required: ['github_username']
        }
      },
      {
        name: 'get_user_for_email',
        description: 'Find the Slack user for an email address',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email address' }
          },
          required: ['email']
        }
      },
      {
        name: 'list_user_mappings',
        description: 'List all user mappings',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      // Linking tools
      {
        name: 'link_thread_to_issue',
        description: 'Link a Slack thread to a GitHub issue for bidirectional sync',
        inputSchema: {
          type: 'object',
          properties: {
            slack_channel_id: { type: 'string', description: 'Slack channel ID' },
            slack_thread_ts: { type: 'string', description: 'Thread timestamp' },
            github_repo: { type: 'string', description: 'GitHub repo (owner/repo)' },
            github_issue_number: { type: 'number', description: 'GitHub issue number' }
          },
          required: ['slack_channel_id', 'slack_thread_ts', 'github_repo', 'github_issue_number']
        }
      },
      {
        name: 'link_thread_to_pr',
        description: 'Link a Slack thread to a GitHub PR',
        inputSchema: {
          type: 'object',
          properties: {
            slack_channel_id: { type: 'string', description: 'Slack channel ID' },
            slack_thread_ts: { type: 'string', description: 'Thread timestamp' },
            github_repo: { type: 'string', description: 'GitHub repo (owner/repo)' },
            github_pr_number: { type: 'number', description: 'GitHub PR number' }
          },
          required: ['slack_channel_id', 'slack_thread_ts', 'github_repo', 'github_pr_number']
        }
      },
      {
        name: 'get_linked_issue',
        description: 'Get the GitHub issue/PR linked to a Slack thread',
        inputSchema: {
          type: 'object',
          properties: {
            slack_channel_id: { type: 'string', description: 'Slack channel ID' },
            slack_thread_ts: { type: 'string', description: 'Thread timestamp' }
          },
          required: ['slack_channel_id', 'slack_thread_ts']
        }
      },
      {
        name: 'get_linked_thread',
        description: 'Get the Slack thread linked to a GitHub issue/PR',
        inputSchema: {
          type: 'object',
          properties: {
            github_repo: { type: 'string', description: 'GitHub repo (owner/repo)' },
            github_issue_number: { type: 'number', description: 'GitHub issue number (or use pr_number)' },
            github_pr_number: { type: 'number', description: 'GitHub PR number (or use issue_number)' }
          },
          required: ['github_repo']
        }
      },
      {
        name: 'list_thread_mappings',
        description: 'List all thread-to-issue/PR mappings',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      // Formatting tools
      {
        name: 'markdown_to_slack',
        description: 'Convert GitHub markdown to Slack mrkdwn format',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Markdown text to convert' }
          },
          required: ['text']
        }
      },
      {
        name: 'slack_to_markdown',
        description: 'Convert Slack mrkdwn to GitHub markdown format',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Slack text to convert' }
          },
          required: ['text']
        }
      }
    ]
  }

  private async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      // Messaging
      case 'send_message':
        return messaging.sendMessage(this.client, this.storage, args)
      case 'read_channel':
        return messaging.readChannel(this.client, this.storage, args)
      case 'get_thread':
        return messaging.getThread(this.client, this.storage, args)
      case 'update_message':
        return messaging.updateMessage(this.client, this.storage, args)
      case 'delete_message':
        return messaging.deleteMessage(this.client, this.storage, args)
      case 'add_reaction':
        return messaging.addReaction(this.client, this.storage, args)

      // Channels
      case 'list_channels':
        return channels.listChannels(this.client, this.storage, args)
      case 'get_channel':
        return channels.getChannel(this.client, this.storage, args)
      case 'map_channel_to_repo':
        return channels.mapChannelToRepo(this.client, this.storage, args)
      case 'get_channel_for_repo':
        return channels.getChannelForRepo(this.client, this.storage, args)
      case 'list_channel_mappings':
        return channels.listChannelMappings(this.client, this.storage, args)

      // Users
      case 'get_user':
        return users.getUser(this.client, this.storage, args)
      case 'map_user_to_github':
        return users.mapUserToGitHub(this.client, this.storage, args)
      case 'get_user_for_github':
        return users.getUserForGitHub(this.client, this.storage, args)
      case 'get_user_for_email':
        return users.getUserForEmail(this.client, this.storage, args)
      case 'list_user_mappings':
        return users.listUserMappings(this.client, this.storage, args)

      // Linking
      case 'link_thread_to_issue':
        return linking.linkThreadToIssue(this.client, this.storage, args)
      case 'link_thread_to_pr':
        return linking.linkThreadToPR(this.client, this.storage, args)
      case 'get_linked_issue':
        return linking.getLinkedIssue(this.client, this.storage, args)
      case 'get_linked_thread':
        return linking.getLinkedThread(this.client, this.storage, args)
      case 'list_thread_mappings':
        return linking.listThreadMappings(this.client, this.storage, args)

      // Formatting
      case 'markdown_to_slack':
        return { success: true, converted: markdownToSlack(args.text) }
      case 'slack_to_markdown':
        return { success: true, converted: slackToMarkdown(args.text) }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }

  async start(): Promise<void> {
    // Load mappings from storage
    await this.storage.load()

    const transport = new StdioServerTransport()
    await this.server.connect(transport)

    console.error('Slack MCP Server running on stdio')
  }
}

// Start the server
async function main() {
  const botToken = process.env.SLACK_BOT_TOKEN
  if (!botToken) {
    console.error('Error: SLACK_BOT_TOKEN environment variable is required')
    process.exit(1)
  }

  const config: SlackConfig = {
    botToken,
    appToken: process.env.SLACK_APP_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    mappingsPath: process.env.SLACK_MAPPINGS_PATH || './slack-mappings.json'
  }

  const server = new SlackMCPServer(config)
  await server.start()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
