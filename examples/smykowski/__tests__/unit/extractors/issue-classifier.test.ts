import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { IssueClassifier } from '~/lib/extractors/issue-classifier.js'
import type { ClaudeClient } from '@schrute/lib/claude/client.js'
import type { GitHubIssue } from '~/lib/types/index.js'

describe('IssueClassifier', () => {
  let mockClaudeClient: jest.Mocked<ClaudeClient>
  let classifier: IssueClassifier

  const mockIssue: GitHubIssue = {
    id: 1,
    number: 123,
    title: 'App crashes when clicking submit button',
    body: 'Steps to reproduce:\n1. Open the app\n2. Fill in the form\n3. Click submit\n4. App crashes',
    state: 'open',
    user: {
      login: 'testuser',
      id: 1,
    },
    assignees: [],
    labels: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    html_url: 'https://github.com/test/repo/issues/123',
  }

  beforeEach(() => {
    mockClaudeClient = {
      prompt: jest.fn(),
    } as any

    classifier = new IssueClassifier(mockClaudeClient)
  })

  describe('classify', () => {
    it('should classify a bug report correctly', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        primary_category: 'bug',
        confidence: 0.95,
        suggested_labels: ['needs-triage', 'ui'],
        reasoning: 'Clear bug report with steps to reproduce',
      }))

      const classification = await classifier.classify(mockIssue)

      expect(classification.primary_category).toBe('bug')
      expect(classification.confidence).toBe(0.95)
      expect(classification.suggested_labels).toContain('needs-triage')
      expect(classification.reasoning).toBeTruthy()
    })

    it('should classify a feature request', async () => {
      const featureIssue = {
        ...mockIssue,
        title: 'Add dark mode support',
        body: 'It would be great to have a dark mode option',
      }

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        primary_category: 'feature-request',
        confidence: 0.88,
        suggested_labels: ['enhancement', 'ui'],
        reasoning: 'User requesting new functionality',
      }))

      const classification = await classifier.classify(featureIssue)

      expect(classification.primary_category).toBe('feature-request')
      expect(classification.confidence).toBeGreaterThan(0.8)
    })

    it('should classify a question', async () => {
      const questionIssue = {
        ...mockIssue,
        title: 'How do I configure authentication?',
        body: 'I am trying to set up OAuth but cannot find the docs',
      }

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        primary_category: 'question',
        confidence: 0.92,
        suggested_labels: ['question', 'documentation'],
        reasoning: 'User asking how to use a feature',
      }))

      const classification = await classifier.classify(questionIssue)

      expect(classification.primary_category).toBe('question')
      expect(classification.suggested_labels).toContain('question')
    })

    it('should handle low confidence classifications', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        primary_category: 'enhancement',
        confidence: 0.65,
        suggested_labels: ['needs-triage'],
        reasoning: 'Unclear if enhancement or feature request',
      }))

      const classification = await classifier.classify(mockIssue)

      expect(classification.confidence).toBe(0.65)
      expect(classifier.isHighConfidence(classification)).toBe(false)
    })

    it('should throw error for invalid category', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        primary_category: 'invalid-category',
        confidence: 0.9,
        suggested_labels: [],
        reasoning: 'Test',
      }))

      await expect(classifier.classify(mockIssue)).rejects.toThrow()
    })

    it('should throw error for invalid confidence', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        primary_category: 'bug',
        confidence: 1.5, // Invalid: > 1.0
        suggested_labels: [],
        reasoning: 'Test',
      }))

      await expect(classifier.classify(mockIssue)).rejects.toThrow()
    })

    it('should handle API errors gracefully', async () => {
      mockClaudeClient.prompt.mockRejectedValue(new Error('API error'))

      await expect(classifier.classify(mockIssue)).rejects.toThrow('Failed to classify')
    })

    it('should handle malformed JSON responses', async () => {
      mockClaudeClient.prompt.mockResolvedValue('Not valid JSON')

      await expect(classifier.classify(mockIssue)).rejects.toThrow()
    })
  })

  describe('isHighConfidence', () => {
    it('should return true for confidence above threshold', () => {
      const classification = {
        primary_category: 'bug' as const,
        confidence: 0.85,
        suggested_labels: [],
        reasoning: 'Test',
      }

      expect(classifier.isHighConfidence(classification, 0.8)).toBe(true)
    })

    it('should return false for confidence below threshold', () => {
      const classification = {
        primary_category: 'bug' as const,
        confidence: 0.75,
        suggested_labels: [],
        reasoning: 'Test',
      }

      expect(classifier.isHighConfidence(classification, 0.8)).toBe(false)
    })

    it('should use default threshold of 0.8', () => {
      const classification = {
        primary_category: 'bug' as const,
        confidence: 0.85,
        suggested_labels: [],
        reasoning: 'Test',
      }

      expect(classifier.isHighConfidence(classification)).toBe(true)
    })
  })
})
