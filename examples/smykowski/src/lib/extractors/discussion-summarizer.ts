import type { ClaudeClient } from '@schrute/lib/claude/client.js'
import { ExtractionError } from '~/lib/types/index.js'

export interface DiscussionSummary {
  title: string
  summary: string
  key_points: string[]
  decisions: string[]
  action_items: string[]
  participants: string[]
  wiki_page_suggestion: {
    title: string
    content: string
    category: 'process' | 'decision' | 'reference' | 'faq'
  }
}

/**
 * DiscussionSummarizer extracts insights from GitHub Discussions and formats them for wiki pages
 */
export class DiscussionSummarizer {
  constructor(private claudeClient: ClaudeClient) {}

  /**
   * Analyze a discussion and generate a summary suitable for wiki documentation
   */
  async summarize(discussion: {
    title: string
    body: string
    comments: Array<{ author: string; body: string; created_at: string }>
  }): Promise<DiscussionSummary> {
    try {
      // Build the full discussion thread
      let fullThread = `# ${discussion.title}\n\n${discussion.body}\n\n---\n\n`
      fullThread += '## Comments\n\n'

      for (const comment of discussion.comments) {
        fullThread += `**${comment.author}** (${new Date(comment.created_at).toLocaleDateString()}):\n`
        fullThread += `${comment.body}\n\n---\n\n`
      }

      const prompt = `Analyze this GitHub Discussion and extract key information for documentation.

Discussion Thread:
${fullThread.slice(0, 8000)} ${fullThread.length > 8000 ? '...(truncated)' : ''}

Extract the following:
1. A concise summary (2-3 sentences)
2. Key points discussed
3. Any decisions made
4. Action items identified
5. List of participants
6. Suggest a wiki page with appropriate content

Determine the best category for this content:
- "process": Team workflows, procedures, guidelines
- "decision": Major decisions and their rationale
- "reference": Technical reference, API docs, examples
- "faq": Frequently asked questions and answers

Return JSON in this format:
{
  "title": "Discussion title",
  "summary": "Concise summary of the discussion",
  "key_points": ["Point 1", "Point 2"],
  "decisions": ["Decision 1", "Decision 2"],
  "action_items": ["Action 1", "Action 2"],
  "participants": ["user1", "user2"],
  "wiki_page_suggestion": {
    "title": "Suggested Wiki Page Title",
    "content": "Full markdown content for the wiki page...",
    "category": "process"
  }
}

The wiki page content should be well-formatted markdown, include all relevant information,
and be organized for easy reference. Include headings, lists, and links where appropriate.

JSON:`

      const response = await this.claudeClient.prompt(prompt, {
        systemPrompt: `You are an expert technical writer creating documentation from discussions.
Your goal is to distill conversations into clear, actionable documentation.
Be comprehensive but concise. Use proper markdown formatting.`,
        maxTokens: 2000,
      })

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response')
      }

      const summary = JSON.parse(jsonMatch[0]) as DiscussionSummary

      // Validate summary
      if (!summary.title || !summary.summary) {
        throw new Error('Summary must include title and summary fields')
      }

      if (!summary.wiki_page_suggestion || !summary.wiki_page_suggestion.content) {
        throw new Error('Must include wiki page suggestion with content')
      }

      const validCategories = ['process', 'decision', 'reference', 'faq']
      if (!validCategories.includes(summary.wiki_page_suggestion.category)) {
        throw new Error(`Invalid category: ${summary.wiki_page_suggestion.category}`)
      }

      return summary
    } catch (error: any) {
      throw new ExtractionError(
        `Failed to summarize discussion: ${error.message}`,
        { originalError: error.message }
      )
    }
  }

  /**
   * Determine if a discussion has enough content to warrant a wiki page
   */
  shouldCreateWikiPage(
    discussion: { comments: any[] },
    minComments: number = 3
  ): boolean {
    return discussion.comments.length >= minComments
  }

  /**
   * Generate a concise title for a wiki page based on discussion content
   */
  async generateWikiTitle(discussionTitle: string, summary: string): Promise<string> {
    try {
      const prompt = `Generate a concise, descriptive wiki page title based on this discussion.

Discussion Title: ${discussionTitle}
Summary: ${summary}

The wiki title should be:
- Clear and descriptive
- 3-8 words
- Title Case
- Suitable for documentation

Return only the title, nothing else.

Wiki Title:`

      const response = await this.claudeClient.prompt(prompt, {
        systemPrompt: 'You are a documentation expert. Output only the requested title.',
        maxTokens: 50,
      })

      return response.trim()
    } catch (error: any) {
      // Fallback to discussion title if generation fails
      return discussionTitle
    }
  }
}
