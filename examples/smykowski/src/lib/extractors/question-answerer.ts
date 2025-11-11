import type { ClaudeClient } from '@schrute/lib/claude/client.js'
import type { GitHubIssue } from '~/lib/types/index.js'
import { ExtractionError } from '~/lib/types/index.js'

export interface QuestionAnalysis {
  is_question: boolean
  confidence: number
  question_type: 'how-to' | 'why' | 'what' | 'troubleshooting' | 'clarification' | 'other'
  extracted_question: string
}

export interface AnswerResult {
  answer: string
  confidence: number
  sources_used: string[]
  needs_human_review: boolean
}

/**
 * QuestionAnswerer detects questions in issues and generates helpful answers
 */
export class QuestionAnswerer {
  constructor(private claudeClient: ClaudeClient) {}

  /**
   * Analyze if an issue contains a question
   */
  async analyzeQuestion(issue: GitHubIssue): Promise<QuestionAnalysis> {
    try {
      const prompt = `Analyze this GitHub issue to determine if it's asking a question that could be answered.

Issue #${issue.number}: ${issue.title}

Body:
${issue.body || '(no description provided)'}

Determine:
1. Is this issue asking a question that could be answered? (not just reporting a bug or requesting a feature)
2. What type of question is it?
3. What is the core question being asked?

Return JSON in this format:
{
  "is_question": true,
  "confidence": 0.9,
  "question_type": "how-to",
  "extracted_question": "The core question being asked"
}

Valid question_types: "how-to", "why", "what", "troubleshooting", "clarification", "other"

JSON:`

      const response = await this.claudeClient.prompt(prompt, {
        systemPrompt: 'You are an expert at analyzing user questions. Output only valid JSON.',
        maxTokens: 400,
      })

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response')
      }

      const analysis = JSON.parse(jsonMatch[0]) as QuestionAnalysis

      if (typeof analysis.is_question !== 'boolean') {
        throw new Error('Invalid analysis: is_question must be boolean')
      }

      return analysis
    } catch (error: any) {
      throw new ExtractionError(
        `Failed to analyze question in issue #${issue.number}: ${error.message}`,
        { issueNumber: issue.number, originalError: error.message }
      )
    }
  }

  /**
   * Generate an answer based on available documentation
   */
  async generateAnswer(
    issue: GitHubIssue,
    question: string,
    availableDocs: { source: string; content: string }[]
  ): Promise<AnswerResult> {
    try {
      // Build context from documentation
      let docsContext = ''
      for (const doc of availableDocs) {
        docsContext += `\n## ${doc.source}\n${doc.content.slice(0, 2000)}\n`
      }

      const prompt = `You are Tom Smykowski, a helpful project coordinator. A user has asked a question in a GitHub issue.

Question from issue #${issue.number}: ${question}

Full issue:
${issue.title}
${issue.body || ''}

Available documentation:
${docsContext || '(No documentation available)'}

Generate a helpful, friendly answer to the user's question. Your answer should:
1. Directly address their question
2. Reference relevant documentation if available
3. Be concise but complete (2-4 paragraphs)
4. Use a friendly, helpful tone
5. If you don't have enough information, say so clearly

Also indicate:
- Your confidence in the answer (0-1)
- Whether a human should review this before posting
- Which documentation sources you used

Return JSON in this format:
{
  "answer": "Your helpful answer here...",
  "confidence": 0.85,
  "sources_used": ["README", "Wiki: Setup"],
  "needs_human_review": false
}

JSON:`

      const response = await this.claudeClient.prompt(prompt, {
        systemPrompt: `You are Tom Smykowski - friendly, helpful, and good with people.
Your job is to help users understand the project without overwhelming them with technical details.
Be honest about limitations and uncertainties.`,
        maxTokens: 1000,
      })

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response')
      }

      const result = JSON.parse(jsonMatch[0]) as AnswerResult

      // Validate result
      if (!result.answer || result.answer.trim().length === 0) {
        throw new Error('Generated answer is empty')
      }

      return result
    } catch (error: any) {
      throw new ExtractionError(
        `Failed to generate answer for issue #${issue.number}: ${error.message}`,
        { issueNumber: issue.number, originalError: error.message }
      )
    }
  }

  /**
   * Determine if answer is good enough to post automatically
   */
  shouldAutoPost(answer: AnswerResult, confidenceThreshold: number = 0.7): boolean {
    return (
      answer.confidence >= confidenceThreshold &&
      !answer.needs_human_review &&
      answer.answer.length > 50 // Ensure substantive answer
    )
  }
}
