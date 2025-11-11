import yaml from 'yaml'
import type { ClaudeClient } from '@schrute/lib/claude/client.js'
import type {
  ProcessDefinition,
  ProcessAction,
} from '~/lib/types/index.js'
import { ExtractionError } from '~/lib/types/index.js'

/**
 * ProcessDefinitionExtractor parses wiki pages into structured process definitions
 *
 * Wiki pages should follow this format:
 * ---
 * process_id: unique-process-id
 * enabled: true
 * repo: owner/repo-name
 * ---
 *
 * # Process: Process Name
 *
 * ## Trigger
 * When: new issue is created
 * Event: `issues.opened`
 *
 * ## Actions
 * 1. Calculate metrics
 * 2. Add a comment with the statistics
 *
 * ## Configuration
 * - key: value
 */
export class ProcessDefinitionExtractor {
  constructor(private claudeClient: ClaudeClient) {}

  /**
   * Extract a process definition from a wiki page
   */
  async extractFromWikiPage(
    content: string,
    pageName: string
  ): Promise<ProcessDefinition | null> {
    try {
      // Parse YAML frontmatter
      const frontmatter = this.parseFrontmatter(content)

      if (!frontmatter) {
        throw new ExtractionError('Wiki page must have YAML frontmatter with process metadata')
      }

      if (!frontmatter.process_id || !frontmatter.repo) {
        throw new ExtractionError('Frontmatter must include process_id and repo fields')
      }

      // Extract the body (everything after frontmatter)
      const body = this.extractBody(content)

      // Use Claude to parse the process definition
      const parsed = await this.parseProcessWithClaude(body, frontmatter)

      // Construct the full process definition
      const processDefinition: ProcessDefinition = {
        process_id: frontmatter.process_id,
        enabled: frontmatter.enabled !== false, // Default to true
        repo_id: frontmatter.repo,
        trigger: parsed.trigger,
        actions: parsed.actions,
        configuration: parsed.configuration || {},
        source_wiki_page: pageName,
        last_updated: new Date().toISOString(),
      }

      return processDefinition
    } catch (error: any) {
      if (error instanceof ExtractionError) {
        throw error
      }
      throw new ExtractionError(
        `Failed to extract process definition from "${pageName}": ${error.message}`,
        { pageName, originalError: error.message }
      )
    }
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): any {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
    const match = content.match(frontmatterRegex)

    if (!match) {
      return null
    }

    try {
      return yaml.parse(match[1])
    } catch (error: any) {
      throw new ExtractionError(`Invalid YAML frontmatter: ${error.message}`)
    }
  }

  /**
   * Extract body content (everything after frontmatter)
   */
  private extractBody(content: string): string {
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/
    return content.replace(frontmatterRegex, '').trim()
  }

  /**
   * Use Claude to parse the natural language process definition
   */
  private async parseProcessWithClaude(
    body: string,
    frontmatter: any
  ): Promise<{
    trigger: { event: string; conditions?: string }
    actions: ProcessAction[]
    configuration?: Record<string, any>
  }> {
    const prompt = `You are parsing a GitHub automation process definition written in natural language.

Process Definition:
${body}

Extract the following information and return ONLY valid JSON:

1. **Trigger**: What GitHub event triggers this process?
   - Common events: "issues.opened", "issues.commented", "pull_request.opened", "pull_request.review_requested", etc.
   - Look for phrases like "When a new issue is created" or "When someone comments on a PR"

2. **Actions**: What actions should be performed? For each action, identify:
   - type: one of [comment, label, assign, create_issue, update_wiki, calculate_metrics]
   - description: natural language description of the action
   - parameters: any specific parameters mentioned

3. **Configuration**: Any configuration values (lookback periods, thresholds, etc.)

Return JSON in this exact format:
{
  "trigger": {
    "event": "issues.opened",
    "conditions": "optional filter description"
  },
  "actions": [
    {
      "type": "calculate_metrics",
      "description": "Calculate average response time",
      "parameters": {
        "metric_type": "response_time",
        "lookback_days": 30
      }
    },
    {
      "type": "comment",
      "description": "Add comment with response time stats",
      "parameters": {}
    }
  ],
  "configuration": {
    "lookback_period": 30,
    "exclude_bots": true
  }
}

Process Definition to parse:
${body}

JSON:`

    try {
      const response = await this.claudeClient.prompt(prompt, {
        systemPrompt: 'You are an expert at parsing automation workflows. Output only valid JSON.',
        maxTokens: 2000,
      })

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Validate structure
      if (!parsed.trigger || !parsed.trigger.event) {
        throw new Error('Missing required field: trigger.event')
      }

      if (!parsed.actions || !Array.isArray(parsed.actions)) {
        throw new Error('Missing or invalid field: actions (must be array)')
      }

      // Validate action types
      const validActionTypes = ['comment', 'label', 'assign', 'create_issue', 'update_wiki', 'calculate_metrics']
      for (const action of parsed.actions) {
        if (!validActionTypes.includes(action.type)) {
          throw new Error(`Invalid action type: ${action.type}`)
        }
        if (!action.description) {
          throw new Error('Each action must have a description')
        }
      }

      return parsed
    } catch (error: any) {
      throw new ExtractionError(
        `Failed to parse process definition with Claude: ${error.message}`
      )
    }
  }

  /**
   * Validate a process definition
   */
  validateProcessDefinition(process: ProcessDefinition): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!process.process_id || process.process_id.trim() === '') {
      errors.push('process_id is required')
    }

    if (!process.repo_id || !process.repo_id.includes('/')) {
      errors.push('repo_id must be in format owner/repo')
    }

    if (!process.trigger || !process.trigger.event) {
      errors.push('trigger.event is required')
    }

    if (!process.actions || process.actions.length === 0) {
      errors.push('At least one action is required')
    }

    if (!process.source_wiki_page) {
      errors.push('source_wiki_page is required')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Extract multiple process definitions from a wiki
   */
  async extractAllFromWiki(
    wikiPages: Array<{ name: string; content: string }>
  ): Promise<ProcessDefinition[]> {
    const processes: ProcessDefinition[] = []

    for (const page of wikiPages) {
      try {
        const process = await this.extractFromWikiPage(page.content, page.name)
        if (process) {
          processes.push(process)
        }
      } catch (error: any) {
        console.error(`Skipping page ${page.name}: ${error.message}`)
      }
    }

    return processes
  }
}
