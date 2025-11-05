import Anthropic from '@anthropic-ai/sdk'
import { StoredSkill, SkillInvocationResult } from './types.js'

/**
 * Skill Invoker
 * Handles skill invocation by replacing placeholders and calling Claude API
 */
export class SkillInvoker {
  private client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    })
  }

  /**
   * Invoke a skill with the given arguments
   */
  async invoke(
    skill: StoredSkill,
    args: Record<string, string>
  ): Promise<SkillInvocationResult> {
    try {
      // Validate that all required placeholders are provided
      const missingArgs: string[] = []

      for (const placeholder of skill.input_placeholders) {
        if (placeholder.required && !args[placeholder.name]) {
          missingArgs.push(placeholder.name)
        }
      }

      if (missingArgs.length > 0) {
        return {
          success: false,
          error: `Missing required arguments: ${missingArgs.join(', ')}`,
        }
      }

      // Replace placeholders in the prompt template
      const prompt = this.replacePlaceholders(skill.prompt_template, args)

      // Call Claude API
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      // Extract text from response
      const textContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('\n')

      return {
        success: true,
        result: textContent,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Replace placeholders in the template
   * Placeholders are in the format: {{placeholder_name}}
   */
  private replacePlaceholders(
    template: string,
    args: Record<string, string>
  ): string {
    let result = template

    // Replace all {{placeholder}} with the corresponding value
    for (const [key, value] of Object.entries(args)) {
      const placeholder = `{{${key}}}`
      result = result.replace(new RegExp(placeholder, 'g'), value)
    }

    return result
  }
}
