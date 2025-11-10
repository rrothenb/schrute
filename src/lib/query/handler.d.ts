import { QueryRequest, QueryResponse, Email, SpeechAct, KnowledgeEntry, PersonalityConfig } from '~/lib/types/index.js';
import { PrivacyTracker } from '~/lib/privacy/index.js';
import { MCPClientManager } from '~/lib/mcp/client.js';
export interface QueryContext {
    emails: Email[];
    speechActs: SpeechAct[];
    knowledgeEntries?: KnowledgeEntry[];
    privacyTracker: PrivacyTracker;
    personality?: PersonalityConfig;
    threadId?: string;
    useMemorySystem?: boolean;
    mcpClient?: MCPClientManager;
    useTools?: boolean;
}
export declare class QueryHandler {
    private client;
    /**
     * Handle a query request
     */
    handleQuery(request: QueryRequest, context: QueryContext): Promise<QueryResponse>;
    /**
     * Handle a query request with tool use enabled
     * Automatically discovers and invokes MCP tools when Claude requests them
     */
    private handleQueryWithTools;
    /**
     * Convert MCP tools to Claude tool format
     */
    private convertMCPToolsToClaude;
    private buildSystemPrompt;
    private buildUserPrompt;
    /**
     * Build user prompt using memory system (hybrid: recent messages + summaries)
     */
    private buildUserPromptWithMemory;
    /**
     * Parse confidence level and suggested skill from Claude's response
     * Extracts metadata and returns clean answer + metadata
     */
    private parseConfidenceMetadata;
    private extractSources;
    private findRestrictedParticipants;
}
export declare function createQueryHandler(): QueryHandler;
//# sourceMappingURL=handler.d.ts.map