/**
 * Tests for Slack MCP Server
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { MappingsStorage } from '../../src/mcp-servers/slack/storage/mappings.js'
import { markdownToSlack, slackToMarkdown } from '../../src/mcp-servers/slack/tools/formatting.js'
import type { ChannelMapping, UserMapping, ThreadMapping } from '../../src/mcp-servers/slack/types.js'
import { existsSync, unlinkSync } from 'fs'

describe('Slack MCP Server', () => {
  describe('MappingsStorage', () => {
    const testMappingsPath = './test-slack-mappings.json'
    let storage: MappingsStorage

    beforeEach(async () => {
      // Clean up test file if it exists
      if (existsSync(testMappingsPath)) {
        unlinkSync(testMappingsPath)
      }
      storage = new MappingsStorage(testMappingsPath)
      await storage.load()
    })

    afterEach(() => {
      // Clean up test file
      if (existsSync(testMappingsPath)) {
        unlinkSync(testMappingsPath)
      }
    })

    describe('Channel Mappings', () => {
      it('should add and retrieve channel mapping', async () => {
        const mapping: ChannelMapping = {
          slackChannelId: 'C123',
          slackChannelName: 'general',
          githubRepo: 'owner/repo',
          notifyOnIssues: true,
          notifyOnPRs: true
        }

        await storage.addChannelMapping(mapping)
        const retrieved = storage.getChannelMapping('C123')

        expect(retrieved).toEqual(mapping)
      })

      it('should find channel by GitHub repo', async () => {
        const mapping: ChannelMapping = {
          slackChannelId: 'C123',
          slackChannelName: 'general',
          githubRepo: 'owner/repo',
          notifyOnIssues: true,
          notifyOnPRs: false
        }

        await storage.addChannelMapping(mapping)
        const retrieved = storage.getChannelByRepo('owner/repo')

        expect(retrieved).toEqual(mapping)
      })

      it('should remove channel mapping', async () => {
        const mapping: ChannelMapping = {
          slackChannelId: 'C123',
          slackChannelName: 'general',
          githubRepo: 'owner/repo',
          notifyOnIssues: true,
          notifyOnPRs: true
        }

        await storage.addChannelMapping(mapping)
        await storage.removeChannelMapping('C123')
        const retrieved = storage.getChannelMapping('C123')

        expect(retrieved).toBeUndefined()
      })

      it('should list all channel mappings', async () => {
        const mapping1: ChannelMapping = {
          slackChannelId: 'C123',
          slackChannelName: 'general',
          githubRepo: 'owner/repo1',
          notifyOnIssues: true,
          notifyOnPRs: true
        }

        const mapping2: ChannelMapping = {
          slackChannelId: 'C456',
          slackChannelName: 'dev',
          githubRepo: 'owner/repo2',
          notifyOnIssues: false,
          notifyOnPRs: true
        }

        await storage.addChannelMapping(mapping1)
        await storage.addChannelMapping(mapping2)
        const mappings = storage.getChannelMappings()

        expect(mappings).toHaveLength(2)
        expect(mappings).toContainEqual(mapping1)
        expect(mappings).toContainEqual(mapping2)
      })
    })

    describe('User Mappings', () => {
      it('should add and retrieve user mapping', async () => {
        const mapping: UserMapping = {
          slackUserId: 'U123',
          slackUsername: 'alice',
          githubUsername: 'alice-gh',
          email: 'alice@example.com',
          notificationPreferences: {
            directMessages: true,
            mentions: true,
            assignments: false
          }
        }

        await storage.addUserMapping(mapping)
        const retrieved = storage.getUserMapping('U123')

        expect(retrieved).toEqual(mapping)
      })

      it('should find user by GitHub username', async () => {
        const mapping: UserMapping = {
          slackUserId: 'U123',
          slackUsername: 'alice',
          githubUsername: 'alice-gh',
          email: 'alice@example.com',
          notificationPreferences: {
            directMessages: true,
            mentions: true,
            assignments: true
          }
        }

        await storage.addUserMapping(mapping)
        const retrieved = storage.getUserByGitHub('alice-gh')

        expect(retrieved).toEqual(mapping)
      })

      it('should find user by email', async () => {
        const mapping: UserMapping = {
          slackUserId: 'U123',
          slackUsername: 'alice',
          githubUsername: 'alice-gh',
          email: 'alice@example.com',
          notificationPreferences: {
            directMessages: true,
            mentions: true,
            assignments: true
          }
        }

        await storage.addUserMapping(mapping)
        const retrieved = storage.getUserByEmail('alice@example.com')

        expect(retrieved).toEqual(mapping)
      })
    })

    describe('Thread Mappings', () => {
      it('should add and retrieve thread mapping', async () => {
        const mapping: ThreadMapping = {
          slackChannelId: 'C123',
          slackThreadTs: '1234567890.123456',
          githubRepo: 'owner/repo',
          githubIssueNumber: 42,
          createdAt: '2025-11-24T10:00:00Z',
          lastSyncedAt: '2025-11-24T10:00:00Z'
        }

        await storage.addThreadMapping(mapping)
        const retrieved = storage.getThreadMapping('C123', '1234567890.123456')

        expect(retrieved).toEqual(mapping)
      })

      it('should find thread by GitHub issue', async () => {
        const mapping: ThreadMapping = {
          slackChannelId: 'C123',
          slackThreadTs: '1234567890.123456',
          githubRepo: 'owner/repo',
          githubIssueNumber: 42,
          createdAt: '2025-11-24T10:00:00Z',
          lastSyncedAt: '2025-11-24T10:00:00Z'
        }

        await storage.addThreadMapping(mapping)
        const retrieved = storage.getThreadByIssue('owner/repo', 42)

        expect(retrieved).toEqual(mapping)
      })

      it('should update thread mapping', async () => {
        const mapping: ThreadMapping = {
          slackChannelId: 'C123',
          slackThreadTs: '1234567890.123456',
          githubRepo: 'owner/repo',
          githubIssueNumber: 42,
          createdAt: '2025-11-24T10:00:00Z',
          lastSyncedAt: '2025-11-24T10:00:00Z'
        }

        await storage.addThreadMapping(mapping)
        await storage.updateThreadMapping('C123', '1234567890.123456', {
          githubPRNumber: 10
        })

        const retrieved = storage.getThreadMapping('C123', '1234567890.123456')
        expect(retrieved?.githubPRNumber).toBe(10)
        expect(retrieved?.lastSyncedAt).not.toBe('2025-11-24T10:00:00Z')
      })
    })
  })

  describe('Message Formatting', () => {
    describe('markdownToSlack', () => {
      it('should convert markdown links to Slack format', () => {
        const markdown = '[Click here](https://example.com)'
        const slack = markdownToSlack(markdown)
        expect(slack).toBe('<https://example.com|Click here>')
      })

      it('should convert bold text', () => {
        const markdown = '**bold text**'
        const slack = markdownToSlack(markdown)
        expect(slack).toBe('*bold text*')
      })

      it('should convert strikethrough', () => {
        const markdown = '~~strikethrough~~'
        const slack = markdownToSlack(markdown)
        expect(slack).toBe('~strikethrough~')
      })

      it('should handle mixed formatting', () => {
        const markdown = '**Bold** with [link](https://example.com) and ~~strike~~'
        const slack = markdownToSlack(markdown)
        expect(slack).toBe('*Bold* with <https://example.com|link> and ~strike~')
      })
    })

    describe('slackToMarkdown', () => {
      it('should convert Slack links to markdown', () => {
        const slack = '<https://example.com|Click here>'
        const markdown = slackToMarkdown(slack)
        expect(markdown).toBe('[Click here](https://example.com)')
      })

      it('should convert plain URLs', () => {
        const slack = '<https://example.com>'
        const markdown = slackToMarkdown(slack)
        expect(markdown).toBe('[https://example.com](https://example.com)')
      })

      it('should convert bold text', () => {
        const slack = '*bold text*'
        const markdown = slackToMarkdown(slack)
        expect(markdown).toBe('**bold text**')
      })

      it('should convert user mentions', () => {
        const slack = 'Hey <@U123456>'
        const markdown = slackToMarkdown(slack)
        expect(markdown).toBe('Hey @U123456')
      })

      it('should convert channel mentions', () => {
        const slack = 'Check <#C123456|general>'
        const markdown = slackToMarkdown(slack)
        expect(markdown).toBe('Check #general')
      })

      it('should handle mixed formatting', () => {
        const slack = '*Bold* with <https://example.com|link> and ~strike~'
        const markdown = slackToMarkdown(slack)
        expect(markdown).toBe('**Bold** with [link](https://example.com) and ~~strike~~')
      })
    })

    describe('Bidirectional conversion', () => {
      it('should maintain content through round-trip conversion', () => {
        const original = '**Bold** text with [link](https://example.com)'
        const slack = markdownToSlack(original)
        const backToMarkdown = slackToMarkdown(slack)

        // After round-trip, formatting should be preserved
        expect(backToMarkdown).toContain('Bold')
        expect(backToMarkdown).toContain('link')
        expect(backToMarkdown).toContain('https://example.com')
      })
    })
  })
})
