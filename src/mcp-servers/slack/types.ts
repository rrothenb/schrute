/**
 * Slack MCP Server Types
 */

export interface SlackConfig {
  botToken: string
  appToken?: string
  signingSecret?: string
  mappingsPath?: string
}

export interface SlackMessage {
  channel: string
  text: string
  thread_ts?: string
  user?: string
  ts?: string
  blocks?: any[]
}

export interface SlackChannel {
  id: string
  name: string
  is_private: boolean
  is_archived: boolean
}

export interface SlackUser {
  id: string
  name: string
  real_name: string
  email?: string
  is_bot: boolean
}

export interface SlackThread {
  channel: string
  thread_ts: string
  messages: SlackMessage[]
}

export interface ChannelMapping {
  slackChannelId: string
  slackChannelName: string
  githubRepo: string
  notifyOnIssues: boolean
  notifyOnPRs: boolean
}

export interface UserMapping {
  slackUserId: string
  slackUsername: string
  githubUsername: string
  email: string
  notificationPreferences: {
    directMessages: boolean
    mentions: boolean
    assignments: boolean
  }
}

export interface ThreadMapping {
  slackChannelId: string
  slackThreadTs: string
  githubRepo: string
  githubIssueNumber?: number
  githubPRNumber?: number
  createdAt: string
  lastSyncedAt: string
}

export interface SlackMappings {
  channels: ChannelMapping[]
  users: UserMapping[]
  threads: ThreadMapping[]
}

export interface SendMessageParams {
  channel: string
  text: string
  thread_ts?: string
  blocks?: any[]
}

export interface ReadChannelParams {
  channel: string
  limit?: number
  oldest?: string
  latest?: string
}

export interface GetThreadParams {
  channel: string
  thread_ts: string
}

export interface CreateChannelParams {
  name: string
  is_private?: boolean
}

export interface AddReactionParams {
  channel: string
  timestamp: string
  name: string
}

export interface LinkThreadParams {
  slackChannelId: string
  slackThreadTs: string
  githubRepo: string
  githubIssueNumber?: number
  githubPRNumber?: number
}

export interface FormatMessageParams {
  text: string
  fromSlack?: boolean
}
