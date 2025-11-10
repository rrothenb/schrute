import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages.js';
export interface ClaudeMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface ClaudeOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    tools?: Tool[];
}
export interface ClaudeTool {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}
export interface ToolUseRequest {
    id: string;
    name: string;
    input: Record<string, unknown>;
}
export interface ToolUseResult {
    tool_use_id: string;
    content: string | object;
    is_error?: boolean;
}
export interface ChatWithToolsResponse {
    text?: string;
    tool_uses: ToolUseRequest[];
    stop_reason: string | null;
}
export declare class ClaudeClient {
    private client;
    constructor(apiKey?: string);
    /**
     * Send a single prompt to Claude and get a response
     */
    prompt(prompt: string, options?: ClaudeOptions): Promise<string>;
    /**
     * Send a conversation to Claude and get a response
     */
    chat(messages: ClaudeMessage[], options?: ClaudeOptions): Promise<string>;
    /**
     * Send a structured prompt with JSON response expected
     */
    promptJson<T>(prompt: string, options?: ClaudeOptions): Promise<T>;
    /**
     * Send a message with tools and handle tool use responses
     * Returns text response and any tool use requests
     */
    promptWithTools(prompt: string, options: ClaudeOptions & {
        tools: Tool[];
    }): Promise<ChatWithToolsResponse>;
    /**
     * Continue a conversation with tool results
     * Useful for multi-turn tool use
     */
    continueWithToolResults(conversationHistory: MessageParam[], toolResults: ToolUseResult[], options: ClaudeOptions & {
        tools: Tool[];
    }): Promise<ChatWithToolsResponse>;
}
export declare function getClaudeClient(): ClaudeClient;
export declare function setClaudeClient(client: ClaudeClient): void;
//# sourceMappingURL=client.d.ts.map