import Anthropic from '@anthropic-ai/sdk';
const DEFAULT_MODEL = 'claude-3-5-haiku-20241022';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 1.0;
export class ClaudeClient {
    constructor(apiKey) {
        this.client = new Anthropic({
            apiKey: apiKey || process.env.CLAUDE_API_KEY,
        });
    }
    /**
     * Send a single prompt to Claude and get a response
     */
    async prompt(prompt, options = {}) {
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
        });
        const firstBlock = response.content[0];
        if (firstBlock.type === 'text') {
            return firstBlock.text;
        }
        throw new Error('Unexpected response format from Claude API');
    }
    /**
     * Send a conversation to Claude and get a response
     */
    async chat(messages, options = {}) {
        const response = await this.client.messages.create({
            model: options.model || DEFAULT_MODEL,
            max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
            temperature: options.temperature || DEFAULT_TEMPERATURE,
            system: options.systemPrompt,
            messages: messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
        });
        const firstBlock = response.content[0];
        if (firstBlock.type === 'text') {
            return firstBlock.text;
        }
        throw new Error('Unexpected response format from Claude API');
    }
    /**
     * Send a structured prompt with JSON response expected
     */
    async promptJson(prompt, options = {}) {
        const fullPrompt = `${prompt}\n\nPlease respond with valid JSON only, no other text.`;
        const response = await this.prompt(fullPrompt, options);
        // Try to extract JSON from the response (in case it's wrapped in markdown)
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : response;
        try {
            return JSON.parse(jsonStr);
        }
        catch (error) {
            throw new Error(`Failed to parse JSON response: ${error}`);
        }
    }
    /**
     * Send a message with tools and handle tool use responses
     * Returns text response and any tool use requests
     */
    async promptWithTools(prompt, options) {
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
        });
        // Extract text and tool uses from response
        let text;
        const tool_uses = [];
        for (const block of response.content) {
            if (block.type === 'text') {
                text = block.text;
            }
            else if (block.type === 'tool_use') {
                tool_uses.push({
                    id: block.id,
                    name: block.name,
                    input: block.input,
                });
            }
        }
        return {
            text,
            tool_uses,
            stop_reason: response.stop_reason,
        };
    }
    /**
     * Continue a conversation with tool results
     * Useful for multi-turn tool use
     */
    async continueWithToolResults(conversationHistory, toolResults, options) {
        // Build tool result message
        const toolResultContent = toolResults.map((result) => ({
            type: 'tool_result',
            tool_use_id: result.tool_use_id,
            content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
            is_error: result.is_error,
        }));
        const messages = [
            ...conversationHistory,
            {
                role: 'user',
                content: toolResultContent,
            },
        ];
        const response = await this.client.messages.create({
            model: options.model || DEFAULT_MODEL,
            max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
            temperature: options.temperature || DEFAULT_TEMPERATURE,
            system: options.systemPrompt,
            tools: options.tools,
            messages,
        });
        // Extract text and tool uses from response
        let text;
        const tool_uses = [];
        for (const block of response.content) {
            if (block.type === 'text') {
                text = block.text;
            }
            else if (block.type === 'tool_use') {
                tool_uses.push({
                    id: block.id,
                    name: block.name,
                    input: block.input,
                });
            }
        }
        return {
            text,
            tool_uses,
            stop_reason: response.stop_reason,
        };
    }
}
// Singleton instance
let clientInstance = null;
export function getClaudeClient() {
    if (!clientInstance) {
        clientInstance = new ClaudeClient();
    }
    return clientInstance;
}
export function setClaudeClient(client) {
    clientInstance = client;
}
//# sourceMappingURL=client.js.map