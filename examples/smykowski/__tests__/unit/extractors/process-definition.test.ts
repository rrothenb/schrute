import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { ProcessDefinitionExtractor } from '~/lib/extractors/process-definition.js'
import type { ClaudeClient } from '@schrute/lib/claude/client.js'

describe('ProcessDefinitionExtractor', () => {
  let mockClaudeClient: jest.Mocked<ClaudeClient>
  let extractor: ProcessDefinitionExtractor

  beforeEach(() => {
    mockClaudeClient = {
      prompt: jest.fn(),
    } as any

    extractor = new ProcessDefinitionExtractor(mockClaudeClient)
  })

  describe('extractFromWikiPage', () => {
    it('should extract a valid process definition from wiki markdown', async () => {
      const wikiContent = `---
process_id: issue-response-tracker
enabled: true
repo: owner/repo
---

# Process: Issue Response Time Tracker

## Trigger
When: a new issue is created
Event: \`issues.opened\`

## Actions
1. Calculate average response time for the last 30 days
2. Add a comment to the issue with the statistics

## Configuration
- lookback_period: 30
- exclude_bots: true
`

      // Mock Claude response
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        trigger: {
          event: 'issues.opened',
        },
        actions: [
          {
            type: 'calculate_metrics',
            description: 'Calculate average response time for the last 30 days',
            parameters: {
              metric_type: 'response_time',
              lookback_days: 30,
            },
          },
          {
            type: 'comment',
            description: 'Add a comment to the issue with the statistics',
            parameters: {},
          },
        ],
        configuration: {
          lookback_period: 30,
          exclude_bots: true,
        },
      }))

      const result = await extractor.extractFromWikiPage(wikiContent, 'Processes/issue-response-tracker')

      expect(result).toBeDefined()
      expect(result?.process_id).toBe('issue-response-tracker')
      expect(result?.enabled).toBe(true)
      expect(result?.repo_id).toBe('owner/repo')
      expect(result?.trigger.event).toBe('issues.opened')
      expect(result?.actions).toHaveLength(2)
      expect(result?.actions[0].type).toBe('calculate_metrics')
      expect(result?.actions[1].type).toBe('comment')
      expect(result?.configuration?.lookback_period).toBe(30)
      expect(result?.source_wiki_page).toBe('Processes/issue-response-tracker')
    })

    it('should throw error if frontmatter is missing', async () => {
      const wikiContent = `# Process Without Frontmatter

This should fail.`

      await expect(
        extractor.extractFromWikiPage(wikiContent, 'test-page')
      ).rejects.toThrow('must have YAML frontmatter')
    })

    it('should throw error if process_id is missing', async () => {
      const wikiContent = `---
enabled: true
repo: owner/repo
---

# Process`

      await expect(
        extractor.extractFromWikiPage(wikiContent, 'test-page')
      ).rejects.toThrow('must include process_id and repo')
    })

    it('should throw error if repo is missing', async () => {
      const wikiContent = `---
process_id: test-process
enabled: true
---

# Process`

      await expect(
        extractor.extractFromWikiPage(wikiContent, 'test-page')
      ).rejects.toThrow('must include process_id and repo')
    })

    it('should default enabled to true if not specified', async () => {
      const wikiContent = `---
process_id: test-process
repo: owner/repo
---

# Process`

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment', description: 'Test' }],
      }))

      const result = await extractor.extractFromWikiPage(wikiContent, 'test-page')

      expect(result?.enabled).toBe(true)
    })

    it('should handle disabled processes', async () => {
      const wikiContent = `---
process_id: disabled-process
enabled: false
repo: owner/repo
---

# Process`

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment', description: 'Test' }],
      }))

      const result = await extractor.extractFromWikiPage(wikiContent, 'test-page')

      expect(result?.enabled).toBe(false)
    })

    it('should handle optional trigger conditions', async () => {
      const wikiContent = `---
process_id: conditional-process
repo: owner/repo
---

# Process`

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        trigger: {
          event: 'issues.opened',
          conditions: 'only if labeled "bug"',
        },
        actions: [{ type: 'comment', description: 'Test' }],
      }))

      const result = await extractor.extractFromWikiPage(wikiContent, 'test-page')

      expect(result?.trigger.conditions).toBe('only if labeled "bug"')
    })

    it('should throw error if Claude returns invalid action type', async () => {
      const wikiContent = `---
process_id: test-process
repo: owner/repo
---

# Process`

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'invalid_type', description: 'Test' }],
      }))

      await expect(
        extractor.extractFromWikiPage(wikiContent, 'test-page')
      ).rejects.toThrow('Invalid action type')
    })

    it('should throw error if Claude returns actions without descriptions', async () => {
      const wikiContent = `---
process_id: test-process
repo: owner/repo
---

# Process`

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment' }],
      }))

      await expect(
        extractor.extractFromWikiPage(wikiContent, 'test-page')
      ).rejects.toThrow('action must have a description')
    })
  })

  describe('validateProcessDefinition', () => {
    it('should validate a correct process definition', () => {
      const process = {
        process_id: 'test-process',
        enabled: true,
        repo_id: 'owner/repo',
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment' as const, description: 'Test action' }],
        source_wiki_page: 'Processes/test',
        last_updated: new Date().toISOString(),
        configuration: {},
      }

      const result = extractor.validateProcessDefinition(process)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should invalidate process without process_id', () => {
      const process = {
        process_id: '',
        enabled: true,
        repo_id: 'owner/repo',
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment' as const, description: 'Test' }],
        source_wiki_page: 'test',
        last_updated: new Date().toISOString(),
      }

      const result = extractor.validateProcessDefinition(process)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('process_id is required')
    })

    it('should invalidate process with invalid repo_id format', () => {
      const process = {
        process_id: 'test',
        enabled: true,
        repo_id: 'invalid-format',
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment' as const, description: 'Test' }],
        source_wiki_page: 'test',
        last_updated: new Date().toISOString(),
      }

      const result = extractor.validateProcessDefinition(process)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('repo_id must be in format owner/repo')
    })

    it('should invalidate process without trigger event', () => {
      const process = {
        process_id: 'test',
        enabled: true,
        repo_id: 'owner/repo',
        trigger: { event: '' },
        actions: [{ type: 'comment' as const, description: 'Test' }],
        source_wiki_page: 'test',
        last_updated: new Date().toISOString(),
      }

      const result = extractor.validateProcessDefinition(process)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('trigger.event is required')
    })

    it('should invalidate process without actions', () => {
      const process = {
        process_id: 'test',
        enabled: true,
        repo_id: 'owner/repo',
        trigger: { event: 'issues.opened' },
        actions: [],
        source_wiki_page: 'test',
        last_updated: new Date().toISOString(),
      }

      const result = extractor.validateProcessDefinition(process)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least one action is required')
    })

    it('should invalidate process without source_wiki_page', () => {
      const process = {
        process_id: 'test',
        enabled: true,
        repo_id: 'owner/repo',
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment' as const, description: 'Test' }],
        source_wiki_page: '',
        last_updated: new Date().toISOString(),
      }

      const result = extractor.validateProcessDefinition(process)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('source_wiki_page is required')
    })
  })

  describe('extractAllFromWiki', () => {
    it('should extract multiple process definitions', async () => {
      const pages = [
        {
          name: 'Processes/process-1',
          content: `---
process_id: process-1
repo: owner/repo
---
# Process 1`,
        },
        {
          name: 'Processes/process-2',
          content: `---
process_id: process-2
repo: owner/repo
---
# Process 2`,
        },
      ]

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment', description: 'Test' }],
      }))

      const results = await extractor.extractAllFromWiki(pages)

      expect(results).toHaveLength(2)
      expect(results[0].process_id).toBe('process-1')
      expect(results[1].process_id).toBe('process-2')
    })

    it('should skip invalid pages', async () => {
      const pages = [
        {
          name: 'valid-process',
          content: `---
process_id: valid
repo: owner/repo
---
# Valid`,
        },
        {
          name: 'invalid-process',
          content: `# No frontmatter`,
        },
      ]

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        trigger: { event: 'issues.opened' },
        actions: [{ type: 'comment', description: 'Test' }],
      }))

      const results = await extractor.extractAllFromWiki(pages)

      expect(results).toHaveLength(1)
      expect(results[0].process_id).toBe('valid')
    })
  })
})
