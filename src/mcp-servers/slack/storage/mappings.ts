/**
 * Storage for Slack mappings (channels, users, threads)
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname } from 'path'
import type {
  SlackMappings,
  ChannelMapping,
  UserMapping,
  ThreadMapping
} from '../types.js'

export class MappingsStorage {
  private mappingsPath: string
  private mappings: SlackMappings

  constructor(mappingsPath: string = './slack-mappings.json') {
    this.mappingsPath = mappingsPath
    this.mappings = {
      channels: [],
      users: [],
      threads: []
    }
  }

  async load(): Promise<void> {
    try {
      if (existsSync(this.mappingsPath)) {
        const data = await readFile(this.mappingsPath, 'utf-8')
        this.mappings = JSON.parse(data)
      } else {
        // Initialize with empty mappings
        await this.save()
      }
    } catch (error) {
      console.error('Failed to load mappings:', error)
      throw error
    }
  }

  async save(): Promise<void> {
    try {
      const dir = dirname(this.mappingsPath)
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }
      await writeFile(this.mappingsPath, JSON.stringify(this.mappings, null, 2))
    } catch (error) {
      console.error('Failed to save mappings:', error)
      throw error
    }
  }

  // Channel Mappings
  getChannelMappings(): ChannelMapping[] {
    return this.mappings.channels
  }

  getChannelMapping(slackChannelId: string): ChannelMapping | undefined {
    return this.mappings.channels.find(m => m.slackChannelId === slackChannelId)
  }

  getChannelByRepo(githubRepo: string): ChannelMapping | undefined {
    return this.mappings.channels.find(m => m.githubRepo === githubRepo)
  }

  async addChannelMapping(mapping: ChannelMapping): Promise<void> {
    // Remove existing mapping for this channel if any
    this.mappings.channels = this.mappings.channels.filter(
      m => m.slackChannelId !== mapping.slackChannelId
    )
    this.mappings.channels.push(mapping)
    await this.save()
  }

  async removeChannelMapping(slackChannelId: string): Promise<void> {
    this.mappings.channels = this.mappings.channels.filter(
      m => m.slackChannelId !== slackChannelId
    )
    await this.save()
  }

  // User Mappings
  getUserMappings(): UserMapping[] {
    return this.mappings.users
  }

  getUserMapping(slackUserId: string): UserMapping | undefined {
    return this.mappings.users.find(m => m.slackUserId === slackUserId)
  }

  getUserByGitHub(githubUsername: string): UserMapping | undefined {
    return this.mappings.users.find(m => m.githubUsername === githubUsername)
  }

  getUserByEmail(email: string): UserMapping | undefined {
    return this.mappings.users.find(m => m.email === email)
  }

  async addUserMapping(mapping: UserMapping): Promise<void> {
    // Remove existing mapping for this user if any
    this.mappings.users = this.mappings.users.filter(
      m => m.slackUserId !== mapping.slackUserId
    )
    this.mappings.users.push(mapping)
    await this.save()
  }

  async removeUserMapping(slackUserId: string): Promise<void> {
    this.mappings.users = this.mappings.users.filter(
      m => m.slackUserId !== slackUserId
    )
    await this.save()
  }

  // Thread Mappings
  getThreadMappings(): ThreadMapping[] {
    return this.mappings.threads
  }

  getThreadMapping(slackChannelId: string, slackThreadTs: string): ThreadMapping | undefined {
    return this.mappings.threads.find(
      m => m.slackChannelId === slackChannelId && m.slackThreadTs === slackThreadTs
    )
  }

  getThreadByIssue(githubRepo: string, issueNumber: number): ThreadMapping | undefined {
    return this.mappings.threads.find(
      m => m.githubRepo === githubRepo && m.githubIssueNumber === issueNumber
    )
  }

  getThreadByPR(githubRepo: string, prNumber: number): ThreadMapping | undefined {
    return this.mappings.threads.find(
      m => m.githubRepo === githubRepo && m.githubPRNumber === prNumber
    )
  }

  async addThreadMapping(mapping: ThreadMapping): Promise<void> {
    // Remove existing mapping for this thread if any
    this.mappings.threads = this.mappings.threads.filter(
      m => !(m.slackChannelId === mapping.slackChannelId && m.slackThreadTs === mapping.slackThreadTs)
    )
    this.mappings.threads.push(mapping)
    await this.save()
  }

  async updateThreadMapping(
    slackChannelId: string,
    slackThreadTs: string,
    updates: Partial<ThreadMapping>
  ): Promise<void> {
    const mapping = this.getThreadMapping(slackChannelId, slackThreadTs)
    if (mapping) {
      Object.assign(mapping, updates)
      mapping.lastSyncedAt = new Date().toISOString()
      await this.save()
    }
  }

  async removeThreadMapping(slackChannelId: string, slackThreadTs: string): Promise<void> {
    this.mappings.threads = this.mappings.threads.filter(
      m => !(m.slackChannelId === slackChannelId && m.slackThreadTs === slackThreadTs)
    )
    await this.save()
  }

  // Bulk operations
  getAllMappings(): SlackMappings {
    return this.mappings
  }

  async clearAllMappings(): Promise<void> {
    this.mappings = {
      channels: [],
      users: [],
      threads: []
    }
    await this.save()
  }
}
