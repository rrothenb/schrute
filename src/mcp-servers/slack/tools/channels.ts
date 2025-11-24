/**
 * Channel management tools for Slack MCP server
 */

import type { SlackClient } from '../client.js'
import type { MappingsStorage } from '../storage/mappings.js'
import type { ChannelMapping } from '../types.js'

export interface CreateChannelArgs {
  name: string
  is_private?: boolean
}

export interface GetChannelArgs {
  channel_id: string
}

export interface ListChannelsArgs {
  exclude_archived?: boolean
}

export interface MapChannelArgs {
  slack_channel_id: string
  github_repo: string
  notify_on_issues?: boolean
  notify_on_prs?: boolean
}

/**
 * Create a new Slack channel
 */
export async function createChannel(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: CreateChannelArgs
): Promise<any> {
  const { name, is_private = false } = _args

  const result = await _client.createChannel(name, is_private)

  if (!result.ok) {
    throw new Error(`Failed to create channel: ${result.error}`)
  }

  return {
    success: true,
    channel: result.channel
  }
}

/**
 * Get information about a Slack channel
 */
export async function getChannel(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: GetChannelArgs
): Promise<any> {
  const { channel_id } = _args

  const result = await _client.getChannel(channel_id)

  if (!result.ok) {
    throw new Error(`Failed to get channel: ${result.error}`)
  }

  // Check if this channel is mapped to a GitHub repo
  const mapping = _storage.getChannelMapping(channel_id)

  return {
    success: true,
    channel: result.channel,
    mappedToGitHub: mapping ? {
      repo: mapping.githubRepo,
      notifyOnIssues: mapping.notifyOnIssues,
      notifyOnPRs: mapping.notifyOnPRs
    } : null
  }
}

/**
 * List all Slack channels
 */
export async function listChannels(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: ListChannelsArgs = {}
): Promise<any> {
  const { exclude_archived = true } = _args

  const result = await _client.listChannels(exclude_archived)

  if (!result.ok) {
    throw new Error(`Failed to list channels: ${result.error}`)
  }

  const channels = result.channels || []

  // Add mapping info to each channel
  const channelsWithMappings = channels.map(channel => {
    const mapping = _storage.getChannelMapping(channel.id)
    return {
      ...channel,
      mappedToGitHub: mapping ? {
        repo: mapping.githubRepo,
        notifyOnIssues: mapping.notifyOnIssues,
        notifyOnPRs: mapping.notifyOnPRs
      } : null
    }
  })

  return {
    success: true,
    channelCount: channelsWithMappings.length,
    channels: channelsWithMappings
  }
}

/**
 * Map a Slack channel to a GitHub repository
 */
export async function mapChannelToRepo(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: MapChannelArgs
): Promise<any> {
  const {
    slack_channel_id,
    github_repo,
    notify_on_issues = true,
    notify_on_prs = true
  } = _args

  // Verify the channel exists
  const channelResult = await _client.getChannel(slack_channel_id)
  if (!channelResult.ok) {
    throw new Error(`Channel not found: ${channelResult.error}`)
  }

  const mapping: ChannelMapping = {
    slackChannelId: slack_channel_id,
    slackChannelName: channelResult.channel!.name,
    githubRepo: github_repo,
    notifyOnIssues: notify_on_issues,
    notifyOnPRs: notify_on_prs
  }

  await _storage.addChannelMapping(mapping)

  return {
    success: true,
    mapping
  }
}

/**
 * Remove a channel-to-repo mapping
 */
export async function unmapChannel(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: { slack_channel_id: string }
): Promise<any> {
  const { slack_channel_id } = _args

  const existingMapping = _storage.getChannelMapping(slack_channel_id)
  if (!existingMapping) {
    throw new Error(`No mapping found for channel ${slack_channel_id}`)
  }

  await _storage.removeChannelMapping(slack_channel_id)

  return {
    success: true,
    removedMapping: existingMapping
  }
}

/**
 * Get the Slack channel for a GitHub repo
 */
export async function getChannelForRepo(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: { github_repo: string }
): Promise<any> {
  const { github_repo } = _args

  const mapping = _storage.getChannelByRepo(github_repo)

  if (!mapping) {
    return {
      success: true,
      found: false,
      repo: github_repo
    }
  }

  return {
    success: true,
    found: true,
    repo: github_repo,
    channel: {
      id: mapping.slackChannelId,
      name: mapping.slackChannelName,
      notifyOnIssues: mapping.notifyOnIssues,
      notifyOnPRs: mapping.notifyOnPRs
    }
  }
}

/**
 * List all channel mappings
 */
export async function listChannelMappings(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: {} = {}
): Promise<any> {
  const mappings = _storage.getChannelMappings()

  return {
    success: true,
    mappingCount: mappings.length,
    mappings
  }
}
