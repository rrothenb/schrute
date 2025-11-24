/**
 * GitHub-Slack linking tools for MCP server
 */

import type { SlackClient } from '../client.js'
import type { MappingsStorage } from '../storage/mappings.js'
import type { ThreadMapping } from '../types.js'

export interface LinkThreadToIssueArgs {
  slack_channel_id: string
  slack_thread_ts: string
  github_repo: string
  github_issue_number: number
}

export interface LinkThreadToPRArgs {
  slack_channel_id: string
  slack_thread_ts: string
  github_repo: string
  github_pr_number: number
}

export interface GetLinkedIssueArgs {
  slack_channel_id: string
  slack_thread_ts: string
}

export interface GetLinkedThreadArgs {
  github_repo: string
  github_issue_number?: number
  github_pr_number?: number
}

/**
 * Link a Slack thread to a GitHub issue
 */
export async function linkThreadToIssue(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: LinkThreadToIssueArgs
): Promise<any> {
  const { slack_channel_id, slack_thread_ts, github_repo, github_issue_number } = _args

  // Verify the thread exists by trying to read it
  const threadResult = await _client.getThread(slack_channel_id, slack_thread_ts)
  if (!threadResult.ok) {
    throw new Error(`Thread not found: ${threadResult.error}`)
  }

  const mapping: ThreadMapping = {
    slackChannelId: slack_channel_id,
    slackThreadTs: slack_thread_ts,
    githubRepo: github_repo,
    githubIssueNumber: github_issue_number,
    createdAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString()
  }

  await _storage.addThreadMapping(mapping)

  return {
    success: true,
    mapping
  }
}

/**
 * Link a Slack thread to a GitHub PR
 */
export async function linkThreadToPR(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: LinkThreadToPRArgs
): Promise<any> {
  const { slack_channel_id, slack_thread_ts, github_repo, github_pr_number } = _args

  // Verify the thread exists
  const threadResult = await _client.getThread(slack_channel_id, slack_thread_ts)
  if (!threadResult.ok) {
    throw new Error(`Thread not found: ${threadResult.error}`)
  }

  const mapping: ThreadMapping = {
    slackChannelId: slack_channel_id,
    slackThreadTs: slack_thread_ts,
    githubRepo: github_repo,
    githubPRNumber: github_pr_number,
    createdAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString()
  }

  await _storage.addThreadMapping(mapping)

  return {
    success: true,
    mapping
  }
}

/**
 * Get the GitHub issue/PR linked to a Slack thread
 */
export async function getLinkedIssue(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: GetLinkedIssueArgs
): Promise<any> {
  const { slack_channel_id, slack_thread_ts } = _args

  const mapping = _storage.getThreadMapping(slack_channel_id, slack_thread_ts)

  if (!mapping) {
    return {
      success: true,
      found: false,
      slackChannelId: slack_channel_id,
      slackThreadTs: slack_thread_ts
    }
  }

  return {
    success: true,
    found: true,
    slackChannelId: slack_channel_id,
    slackThreadTs: slack_thread_ts,
    githubRepo: mapping.githubRepo,
    githubIssueNumber: mapping.githubIssueNumber,
    githubPRNumber: mapping.githubPRNumber,
    createdAt: mapping.createdAt,
    lastSyncedAt: mapping.lastSyncedAt
  }
}

/**
 * Get the Slack thread linked to a GitHub issue/PR
 */
export async function getLinkedThread(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: GetLinkedThreadArgs
): Promise<any> {
  const { github_repo, github_issue_number, github_pr_number } = _args

  let mapping: ThreadMapping | undefined

  if (github_issue_number) {
    mapping = _storage.getThreadByIssue(github_repo, github_issue_number)
  } else if (github_pr_number) {
    mapping = _storage.getThreadByPR(github_repo, github_pr_number)
  } else {
    throw new Error('Must provide either github_issue_number or github_pr_number')
  }

  if (!mapping) {
    return {
      success: true,
      found: false,
      githubRepo: github_repo,
      githubIssueNumber: github_issue_number,
      githubPRNumber: github_pr_number
    }
  }

  return {
    success: true,
    found: true,
    githubRepo: github_repo,
    githubIssueNumber: github_issue_number,
    githubPRNumber: github_pr_number,
    slackChannelId: mapping.slackChannelId,
    slackThreadTs: mapping.slackThreadTs,
    createdAt: mapping.createdAt,
    lastSyncedAt: mapping.lastSyncedAt
  }
}

/**
 * Unlink a Slack thread from GitHub
 */
export async function unlinkThread(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: { slack_channel_id: string; slack_thread_ts: string }
): Promise<any> {
  const { slack_channel_id, slack_thread_ts } = _args

  const existingMapping = _storage.getThreadMapping(slack_channel_id, slack_thread_ts)
  if (!existingMapping) {
    throw new Error(`No mapping found for thread ${slack_thread_ts} in channel ${slack_channel_id}`)
  }

  await _storage.removeThreadMapping(slack_channel_id, slack_thread_ts)

  return {
    success: true,
    removedMapping: existingMapping
  }
}

/**
 * Update thread sync timestamp
 */
export async function updateThreadSync(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: { slack_channel_id: string; slack_thread_ts: string }
): Promise<any> {
  const { slack_channel_id, slack_thread_ts } = _args

  await _storage.updateThreadMapping(slack_channel_id, slack_thread_ts, {
    lastSyncedAt: new Date().toISOString()
  })

  return {
    success: true,
    slackChannelId: slack_channel_id,
    slackThreadTs: slack_thread_ts,
    lastSyncedAt: new Date().toISOString()
  }
}

/**
 * List all thread mappings
 */
export async function listThreadMappings(
  _client: SlackClient,
  _storage: MappingsStorage,
  _args: {} = {}
): Promise<any> {
  const mappings = _storage.getThreadMappings()

  return {
    success: true,
    mappingCount: mappings.length,
    mappings
  }
}
