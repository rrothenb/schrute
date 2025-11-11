import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { QuestionAnswerer } from '~/lib/extractors/question-answerer.js'
import type { ClaudeClient } from '@schrute/lib/claude/client.js'
import type { GitHubIssue } from '~/lib/types/index.js'

describe('QuestionAnswerer', () => {
  let mockClaudeClient: jest.Mocked<ClaudeClient>
  let answerer: QuestionAnswerer

  const mockQuestionIssue: GitHubIssue = {
    id: 1,
    number: 456,
    title: 'How do I configure authentication?',
    body: 'I am trying to set up OAuth authentication but cannot find the configuration docs',
    state: 'open',
    user: { login: 'newuser', id: 2 },
    assignees: [],
    labels: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    html_url: 'https://github.com/test/repo/issues/456',
  }

  const mockBugIssue: GitHubIssue = {
    ...mockQuestionIssue,
    number: 457,
    title: 'Login button does not work',
    body: 'When I click the login button, nothing happens',
  }

  beforeEach(() => {
    mockClaudeClient = {
      prompt: jest.fn(),
    } as any

    answerer = new QuestionAnswerer(mockClaudeClient)
  })

  describe('analyzeQuestion', () => {
    it('should detect a how-to question', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        is_question: true,
        confidence: 0.95,
        question_type: 'how-to',
        extracted_question: 'How do I configure OAuth authentication?',
      }))

      const analysis = await answerer.analyzeQuestion(mockQuestionIssue)

      expect(analysis.is_question).toBe(true)
      expect(analysis.confidence).toBeGreaterThan(0.9)
      expect(analysis.question_type).toBe('how-to')
      expect(analysis.extracted_question).toContain('OAuth')
    })

    it('should detect a troubleshooting question', async () => {
      const troubleshootIssue = {
        ...mockQuestionIssue,
        title: 'Why is my API request failing?',
        body: 'I keep getting 401 errors when calling the API',
      }

      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        is_question: true,
        confidence: 0.88,
        question_type: 'troubleshooting',
        extracted_question: 'Why am I getting 401 errors from the API?',
      }))

      const analysis = await answerer.analyzeQuestion(troubleshootIssue)

      expect(analysis.is_question).toBe(true)
      expect(analysis.question_type).toBe('troubleshooting')
    })

    it('should correctly identify non-questions', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        is_question: false,
        confidence: 0.92,
        question_type: 'other',
        extracted_question: '',
      }))

      const analysis = await answerer.analyzeQuestion(mockBugIssue)

      expect(analysis.is_question).toBe(false)
    })

    it('should handle API errors', async () => {
      mockClaudeClient.prompt.mockRejectedValue(new Error('API error'))

      await expect(answerer.analyzeQuestion(mockQuestionIssue)).rejects.toThrow()
    })

    it('should validate boolean is_question field', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        is_question: 'yes', // Invalid: should be boolean
        confidence: 0.9,
        question_type: 'how-to',
        extracted_question: 'Test',
      }))

      await expect(answerer.analyzeQuestion(mockQuestionIssue)).rejects.toThrow()
    })
  })

  describe('generateAnswer', () => {
    const availableDocs = [
      {
        source: 'README',
        content: 'To configure OAuth, set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in your .env file',
      },
      {
        source: 'Wiki: Authentication',
        content: 'The OAuth flow requires setting up credentials with your OAuth provider',
      },
    ]

    it('should generate a helpful answer with documentation', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        answer: 'To configure OAuth authentication, you need to:\n1. Set up your OAuth provider credentials\n2. Add OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET to your .env file\n\nFor more details, see the Authentication wiki page.',
        confidence: 0.85,
        sources_used: ['README', 'Wiki: Authentication'],
        needs_human_review: false,
      }))

      const result = await answerer.generateAnswer(
        mockQuestionIssue,
        'How do I configure OAuth authentication?',
        availableDocs
      )

      expect(result.answer).toContain('OAuth')
      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.sources_used).toContain('README')
      expect(result.needs_human_review).toBe(false)
    })

    it('should indicate when human review is needed', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        answer: 'Based on the documentation, OAuth configuration involves setting environment variables, but the specific setup may vary depending on your provider.',
        confidence: 0.65,
        sources_used: ['README'],
        needs_human_review: true,
      }))

      const result = await answerer.generateAnswer(
        mockQuestionIssue,
        'How do I configure OAuth?',
        availableDocs
      )

      expect(result.needs_human_review).toBe(true)
      expect(result.confidence).toBeLessThan(0.7)
    })

    it('should work with no documentation available', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        answer: 'I could not find specific documentation about OAuth configuration. I recommend checking the official documentation or asking the maintainers for guidance.',
        confidence: 0.5,
        sources_used: [],
        needs_human_review: true,
      }))

      const result = await answerer.generateAnswer(
        mockQuestionIssue,
        'How do I configure OAuth?',
        []
      )

      expect(result.confidence).toBeLessThan(0.7)
      expect(result.sources_used).toHaveLength(0)
    })

    it('should reject empty answers', async () => {
      mockClaudeClient.prompt.mockResolvedValue(JSON.stringify({
        answer: '',
        confidence: 0.8,
        sources_used: [],
        needs_human_review: false,
      }))

      await expect(
        answerer.generateAnswer(mockQuestionIssue, 'Test question', availableDocs)
      ).rejects.toThrow('Generated answer is empty')
    })
  })

  describe('shouldAutoPost', () => {
    it('should return true for high-confidence answers', () => {
      const answer = {
        answer: 'Detailed helpful answer with multiple paragraphs about authentication',
        confidence: 0.85,
        sources_used: ['README'],
        needs_human_review: false,
      }

      expect(answerer.shouldAutoPost(answer)).toBe(true)
    })

    it('should return false for low-confidence answers', () => {
      const answer = {
        answer: 'Some answer content here that is long enough to pass the length check',
        confidence: 0.65,
        sources_used: [],
        needs_human_review: false,
      }

      expect(answerer.shouldAutoPost(answer, 0.7)).toBe(false)
    })

    it('should return false when human review is needed', () => {
      const answer = {
        answer: 'Some answer content here that is long enough to pass the length check',
        confidence: 0.85,
        sources_used: ['README'],
        needs_human_review: true,
      }

      expect(answerer.shouldAutoPost(answer)).toBe(false)
    })

    it('should return false for very short answers', () => {
      const answer = {
        answer: 'Yes',
        confidence: 0.9,
        sources_used: ['README'],
        needs_human_review: false,
      }

      expect(answerer.shouldAutoPost(answer)).toBe(false)
    })

    it('should respect custom confidence threshold', () => {
      const answer = {
        answer: 'Detailed helpful answer with multiple paragraphs about authentication',
        confidence: 0.75,
        sources_used: ['README'],
        needs_human_review: false,
      }

      expect(answerer.shouldAutoPost(answer, 0.7)).toBe(true)
      expect(answerer.shouldAutoPost(answer, 0.8)).toBe(false)
    })
  })
})
