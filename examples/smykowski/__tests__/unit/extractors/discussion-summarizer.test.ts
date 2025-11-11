import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { DiscussionSummarizer } from '~/lib/extractors/discussion-summarizer.js'
import type { ClaudeClient } from '@schrute/lib/claude/client.js'

describe('DiscussionSummarizer', () => {
  let mockClaudeClient: jest.Mocked<ClaudeClient>
  let summarizer: DiscussionSummarizer

  const mockDiscussion = {
    title: 'API Architecture: REST vs GraphQL',
    body: 'We need to decide between REST and GraphQL for our v2 API. What does the team think?',
    comments: [
      {
        author: 'alice',
        body: 'I think REST would be simpler for our use case',
        created_at: '2024-01-01T10:00:00Z',
      },
      {
        author: 'bob',
        body: 'I agree. GraphQL is powerful but might be overkill',
        created_at: '2024-01-01T11:00:00Z',
      },
      {
        author: 'carol',
        body: 'REST it is then! Let us go with REST for v2',
        created_at: '2024-01-01T12:00:00Z',
      },
    ],
  }

  beforeEach(() => {
    mockClaudeClient = {
      prompt: jest.fn(),
    } as any

    summarizer = new DiscussionSummarizer(mockClaudeClient)
  })

  describe('summarize', () => {
    it('should generate a comprehensive summary', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        title: 'API Architecture: REST vs GraphQL',
        summary: 'Team discussed and decided to use REST for the v2 API instead of GraphQL due to simplicity and team expertise.',
        key_points: [
          'REST is simpler for current use case',
          'GraphQL might be overkill',
          'Team has more REST experience',
        ],
        decisions: ['Use REST for v2 API'],
        action_items: ['Begin REST API implementation'],
        participants: ['alice', 'bob', 'carol'],
        wiki_page_suggestion: {
          title: 'API Architecture Decision: REST vs GraphQL',
          content: '# API Architecture Decision\n\n## Decision\nUse REST for v2 API\n\n## Rationale\nSimpler implementation, team expertise',
          category: 'decision',
        },
      }))

      const summary = await summarizer.summarize(mockDiscussion)

      expect(summary.title).toBeTruthy()
      expect(summary.summary).toContain('REST')
      expect(summary.decisions).toContain('Use REST for v2 API')
      expect(summary.participants).toHaveLength(3)
      expect(summary.wiki_page_suggestion).toBeDefined()
      expect(summary.wiki_page_suggestion.category).toBe('decision')
    })

    it('should handle process documentation discussions', async () => {
      const processDiscussion = {
        title: 'How should we handle code reviews?',
        body: 'Let us establish a clear process',
        comments: [
          {
            author: 'alice',
            body: 'I suggest we require at least 2 approvals',
            created_at: '2024-01-01T10:00:00Z',
          },
          {
            author: 'bob',
            body: 'And reviews should happen within 24 hours',
            created_at: '2024-01-01T11:00:00Z',
          },
        ],
      }

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        title: 'Code Review Process',
        summary: 'Team established a code review process requiring 2 approvals within 24 hours.',
        key_points: ['Require 2 approvals', '24-hour review SLA'],
        decisions: ['Implement 2-approval code review process'],
        action_items: ['Update CONTRIBUTING.md with new process'],
        participants: ['alice', 'bob'],
        wiki_page_suggestion: {
          title: 'Code Review Process',
          content: '# Code Review Process\n\n## Requirements\n- 2 approvals required\n- 24-hour turnaround',
          category: 'process',
        },
      }))

      const summary = await summarizer.summarize(processDiscussion)

      expect(summary.wiki_page_suggestion.category).toBe('process')
    })

    it('should handle FAQ-style discussions', async () => {
      const faqDiscussion = {
        title: 'How do I set up the development environment?',
        body: 'Multiple people have asked this',
        comments: [
          {
            author: 'maintainer',
            body: 'Here are the steps: 1. Install Node 18, 2. Run npm install, 3. Copy .env.example',
            created_at: '2024-01-01T10:00:00Z',
          },
        ],
      }

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        title: 'Development Environment Setup',
        summary: 'Instructions for setting up the development environment',
        key_points: ['Install Node 18', 'Run npm install', 'Configure .env file'],
        decisions: [],
        action_items: [],
        participants: ['maintainer'],
        wiki_page_suggestion: {
          title: 'Development Environment Setup',
          content: '# Dev Environment Setup\n\n## Steps\n1. Install Node 18\n2. Run npm install\n3. Copy .env.example to .env',
          category: 'faq',
        },
      }))

      const summary = await summarizer.summarize(faqDiscussion)

      expect(summary.wiki_page_suggestion.category).toBe('faq')
    })

    it('should validate required fields', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        // Missing title and summary
        key_points: [],
        decisions: [],
        action_items: [],
        participants: [],
        wiki_page_suggestion: {
          title: 'Test',
          content: 'Content',
          category: 'reference',
        },
      }))

      await expect(summarizer.summarize(mockDiscussion)).rejects.toThrow(
        'Summary must include title and summary fields'
      )
    })

    it('should validate wiki page suggestion', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        title: 'Test',
        summary: 'Summary',
        key_points: [],
        decisions: [],
        action_items: [],
        participants: [],
        wiki_page_suggestion: {
          title: 'Test',
          // Missing content
          category: 'reference',
        },
      }))

      await expect(summarizer.summarize(mockDiscussion)).rejects.toThrow(
        'Must include wiki page suggestion with content'
      )
    })

    it('should validate category', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        title: 'Test',
        summary: 'Summary',
        key_points: [],
        decisions: [],
        action_items: [],
        participants: [],
        wiki_page_suggestion: {
          title: 'Test',
          content: 'Content',
          category: 'invalid-category',
        },
      }))

      await expect(summarizer.summarize(mockDiscussion)).rejects.toThrow('Invalid category')
    })

    it('should handle API errors', async () => {
      mockClaudeClient.prompt.mockRejectedValue(new Error('API error'))

      await expect(summarizer.summarize(mockDiscussion)).rejects.toThrow(
        'Failed to summarize discussion'
      )
    })
  })

  describe('shouldCreateWikiPage', () => {
    it('should return true for discussions with enough comments', () => {
      const discussion = {
        comments: [{ body: '1' }, { body: '2' }, { body: '3' }],
      }

      expect(summarizer.shouldCreateWikiPage(discussion as any, 3)).toBe(true)
    })

    it('should return false for discussions with too few comments', () => {
      const discussion = {
        comments: [{ body: '1' }, { body: '2' }],
      }

      expect(summarizer.shouldCreateWikiPage(discussion as any, 3)).toBe(false)
    })

    it('should use default threshold of 3', () => {
      const discussion = {
        comments: [{ body: '1' }, { body: '2' }, { body: '3' }],
      }

      expect(summarizer.shouldCreateWikiPage(discussion as any)).toBe(true)
    })

    it('should handle discussions with no comments', () => {
      const discussion = {
        comments: [],
      }

      expect(summarizer.shouldCreateWikiPage(discussion as any)).toBe(false)
    })
  })

  describe('generateWikiTitle', () => {
    it('should generate a concise title', async () => {
      mockClaudeClient.prompt.mockResolvedValue('API Architecture Decision')

      const title = await summarizer.generateWikiTitle(
        'Long discussion about API architecture',
        'Team discussed REST vs GraphQL'
      )

      expect(title).toBe('API Architecture Decision')
    })

    it('should fallback to discussion title on error', async () => {
      mockClaudeClient.prompt.mockRejectedValue(new Error('API error'))

      const title = await summarizer.generateWikiTitle(
        'Original Discussion Title',
        'Summary'
      )

      expect(title).toBe('Original Discussion Title')
    })

    it('should trim whitespace from generated title', async () => {
      mockClaudeClient.prompt.mockResolvedValue('  API Decision  \n')

      const title = await summarizer.generateWikiTitle('Discussion', 'Summary')

      expect(title).toBe('API Decision')
    })
  })
})
