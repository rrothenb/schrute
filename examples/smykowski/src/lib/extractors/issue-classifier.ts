import type { ClaudeClient } from '@schrute/lib/claude/client.js'
import type { GitHubIssue } from '~/lib/types/index.js'
import { ExtractionError } from '~/lib/types/index.js'

export interface IssueClassification {
  primary_category: 'bug' | 'feature-request' | 'documentation' | 'question' | 'enhancement' | 'discussion'
  confidence: number
  suggested_labels: string[]
  reasoning: string
}

/**
 * IssueClassifier uses LLM to classify issues and suggest appropriate labels
 */
export class IssueClassifier {
  constructor(private claudeClient: ClaudeClient) {}

  /**
   * Classify an issue and suggest labels
   */
  async classify(issue: GitHubIssue): Promise<IssueClassification> {
    try {
      const prompt = `Analyze this GitHub issue and classify it into the most appropriate category.

Issue #${issue.number}: ${issue.title}

Body:
${issue.body || '(no description provided)'}

Classify this issue into ONE of these categories:
- bug: Reports of broken functionality
- feature-request: Requests for new functionality
- documentation: Issues about docs, examples, or clarifications
- question: User questions about how to use the project
- enhancement: Improvements to existing features
- discussion: General discussion or RFC

Also suggest 1-3 specific labels that would be appropriate (e.g., "needs-triage", "good-first-issue", "help-wanted", "performance", "api", "ui", etc.)

Return your response in this JSON format:
{
  "primary_category": "bug",
  "confidence": 0.95,
  "suggested_labels": ["needs-triage", "performance"],
  "reasoning": "Brief explanation of why you chose this classification"
}

JSON:`

      const response = await this.claudeClient.prompt(prompt, {
        systemPrompt: 'You are an expert at classifying GitHub issues. Output only valid JSON.',
        maxTokens: 500,
      })

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response')
      }

      const classification = JSON.parse(jsonMatch[0]) as IssueClassification

      // Validate classification
      const validCategories = ['bug', 'feature-request', 'documentation', 'question', 'enhancement', 'discussion']
      if (!validCategories.includes(classification.primary_category)) {
        throw new Error(`Invalid category: ${classification.primary_category}`)
      }

      if (classification.confidence < 0 || classification.confidence > 1) {
        throw new Error(`Invalid confidence: ${classification.confidence}`)
      }

      return classification
    } catch (error: any) {
      throw new ExtractionError(
        `Failed to classify issue #${issue.number}: ${error.message}`,
        { issueNumber: issue.number, originalError: error.message }
      )
    }
  }

  /**
   * Determine if confidence is high enough to auto-label
   */
  isHighConfidence(classification: IssueClassification, threshold: number = 0.8): boolean {
    return classification.confidence >= threshold
  }
}
