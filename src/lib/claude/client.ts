import Anthropic from '@anthropic-ai/sdk'

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TEMPERATURE = 1.0

export class ClaudeClient {
  private client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    })
  }

  /**
   * Send a single prompt to Claude and get a response
   */
  async prompt(prompt: string, options: ClaudeOptions = {}): Promise<string> {
    const response = await this.client.messages.create({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: options.temperature || DEFAULT_TEMPERATURE,
      system: options.systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const firstBlock = response.content[0]
    if (firstBlock.type === 'text') {
      return firstBlock.text
    }

    throw new Error('Unexpected response format from Claude API')
  }

  /**
   * Send a conversation to Claude and get a response
   */
  async chat(messages: ClaudeMessage[], options: ClaudeOptions = {}): Promise<string> {
    const response = await this.client.messages.create({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: options.temperature || DEFAULT_TEMPERATURE,
      system: options.systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    const firstBlock = response.content[0]
    if (firstBlock.type === 'text') {
      return firstBlock.text
    }

    throw new Error('Unexpected response format from Claude API')
  }

  /**
   * Send a structured prompt with JSON response expected
   */
  async promptJson<T>(prompt: string, options: ClaudeOptions = {}): Promise<T> {
    const fullPrompt = `${prompt}\n\nPlease respond with valid JSON only, no other text.`
    const response = await this.prompt(fullPrompt, options)

    // Try to extract JSON from the response (in case it's wrapped in markdown)
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : response

    try {
      return JSON.parse(jsonStr) as T
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error}`)
    }
  }
}

// Singleton instance
let clientInstance: ClaudeClient | null = null

export function getClaudeClient(): ClaudeClient {
  if (!clientInstance) {
    clientInstance = new ClaudeClient()
  }
  return clientInstance
}

export function setClaudeClient(client: ClaudeClient): void {
  clientInstance = client
}
