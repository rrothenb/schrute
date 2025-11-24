/**
 * User management tools for Slack MCP server
 */

import type { SlackClient } from '../client.js'
import type { MappingsStorage } from '../storage/mappings.js'
import type { UserMapping } from '../types.js'

export interface GetUserArgs {
  user_id: string
}

export interface GetUserByEmailArgs {
  email: string
}

export interface MapUserArgs {
  slack_user_id: string
  github_username: string
  email: string
  notify_direct_messages?: boolean
  notify_mentions?: boolean
  notify_assignments?: boolean
}

/**
 * Get information about a Slack user
 */
export async function getUser(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: GetUserArgs
): Promise<any> {
  const { user_id } = _args

  const result = await _client.getUser(user_id)

  if (!result.ok) {
    throw new Error(`Failed to get user: ${result.error}`)
  }

  // Check if this user is mapped to a GitHub username
  const mapping = _storage.getUserMapping(user_id)

  return {
    success: true,
    user: result.user,
    mappedToGitHub: mapping ? {
      githubUsername: mapping.githubUsername,
      email: mapping.email,
      notificationPreferences: mapping.notificationPreferences
    } : null
  }
}

/**
 * Get user by email address
 */
export async function getUserByEmail(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: GetUserByEmailArgs
): Promise<any> {
  const { email } = _args

  const result = await _client.getUserByEmail(email)

  if (!result.ok) {
    throw new Error(`Failed to get user by email: ${result.error}`)
  }

  // Check if this user is mapped
  const mapping = _storage.getUserMapping(result.user!.id)

  return {
    success: true,
    user: result.user,
    mappedToGitHub: mapping ? {
      githubUsername: mapping.githubUsername,
      email: mapping.email,
      notificationPreferences: mapping.notificationPreferences
    } : null
  }
}

/**
 * Map a Slack user to a GitHub username
 */
export async function mapUserToGitHub(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: MapUserArgs
): Promise<any> {
  const {
    slack_user_id,
    github_username,
    email,
    notify_direct_messages = true,
    notify_mentions = true,
    notify_assignments = true
  } = _args

  // Verify the user exists
  const userResult = await _client.getUser(slack_user_id)
  if (!userResult.ok) {
    throw new Error(`User not found: ${userResult.error}`)
  }

  const mapping: UserMapping = {
    slackUserId: slack_user_id,
    slackUsername: userResult.user!.name,
    githubUsername: github_username,
    email,
    notificationPreferences: {
      directMessages: notify_direct_messages,
      mentions: notify_mentions,
      assignments: notify_assignments
    }
  }

  await _storage.addUserMapping(mapping)

  return {
    success: true,
    mapping
  }
}

/**
 * Remove a user mapping
 */
export async function unmapUser(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: { slack_user_id: string }
): Promise<any> {
  const { slack_user_id } = _args

  const existingMapping = _storage.getUserMapping(slack_user_id)
  if (!existingMapping) {
    throw new Error(`No mapping found for user ${slack_user_id}`)
  }

  await _storage.removeUserMapping(slack_user_id)

  return {
    success: true,
    removedMapping: existingMapping
  }
}

/**
 * Get Slack user for a GitHub username
 */
export async function getUserForGitHub(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: { github_username: string }
): Promise<any> {
  const { github_username } = _args

  const mapping = _storage.getUserByGitHub(github_username)

  if (!mapping) {
    return {
      success: true,
      found: false,
      githubUsername: github_username
    }
  }

  return {
    success: true,
    found: true,
    githubUsername: github_username,
    slackUser: {
      id: mapping.slackUserId,
      username: mapping.slackUsername,
      email: mapping.email,
      notificationPreferences: mapping.notificationPreferences
    }
  }
}

/**
 * Get Slack user for an email address (using mapping)
 */
export async function getUserForEmail(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: { email: string }
): Promise<any> {
  const { email } = _args

  const mapping = _storage.getUserByEmail(email)

  if (!mapping) {
    return {
      success: true,
      found: false,
      email
    }
  }

  return {
    success: true,
    found: true,
    email,
    slackUser: {
      id: mapping.slackUserId,
      username: mapping.slackUsername,
      githubUsername: mapping.githubUsername,
      notificationPreferences: mapping.notificationPreferences
    }
  }
}

/**
 * List all user mappings
 */
export async function listUserMappings(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: {} = {}
): Promise<any> {
  const mappings = _storage.getUserMappings()

  return {
    success: true,
    mappingCount: mappings.length,
    mappings
  }
}
