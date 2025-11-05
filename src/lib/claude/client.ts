import Anthropic from '@anthropic-ai/sdk'
import type {
  MessageParam,
  Tool,
} from '@anthropic-ai/sdk/resources/messages.js'

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  tools?: Tool[]
}

export interface ClaudeTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface ToolUseRequest {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolUseResult {
  tool_use_id: string
  content: string | object
  is_error?: boolean
}

export interface ChatWithToolsResponse {
  text?: string
  tool_uses: ToolUseRequest[]
  stop_reason: string | null
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

  /**
   * Send a message with tools and handle tool use responses
   * Returns text response and any tool use requests
   */
  async promptWithTools(
    prompt: string,
    options: ClaudeOptions & { tools: Tool[] }
  ): Promise<ChatWithToolsResponse> {
    const response = await this.client.messages.create({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: options.temperature || DEFAULT_TEMPERATURE,
      system: options.systemPrompt,
      tools: options.tools,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract text and tool uses from response
    let text: string | undefined
    const tool_uses: ToolUseRequest[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        text = block.text
      } else if (block.type === 'tool_use') {
        tool_uses.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        })
      }
    }

    return {
      text,
      tool_uses,
      stop_reason: response.stop_reason,
    }
  }

  /**
   * Continue a conversation with tool results
   * Useful for multi-turn tool use
   */
  async continueWithToolResults(
    conversationHistory: MessageParam[],
    toolResults: ToolUseResult[],
    options: ClaudeOptions & { tools: Tool[] }
  ): Promise<ChatWithToolsResponse> {
    // Build tool result message
    const toolResultContent = toolResults.map((result) => ({
      type: 'tool_result' as const,
      tool_use_id: result.tool_use_id,
      content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
      is_error: result.is_error,
    }))

    const messages: MessageParam[] = [
      ...conversationHistory,
      {
        role: 'user',
        content: toolResultContent,
      },
    ]

    const response = await this.client.messages.create({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: options.temperature || DEFAULT_TEMPERATURE,
      system: options.systemPrompt,
      tools: options.tools,
      messages,
    })

    // Extract text and tool uses from response
    let text: string | undefined
    const tool_uses: ToolUseRequest[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        text = block.text
      } else if (block.type === 'tool_use') {
        tool_uses.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        })
      }
    }

    return {
      text,
      tool_uses,
      stop_reason: response.stop_reason,
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
