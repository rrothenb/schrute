import { getClaudeClient } from '~/lib/claude/index.js';
import { getMemoryManager } from '~/lib/memory/index.js';
const BASE_SYSTEM_PROMPT = `You are Schrute, an AI coordination assistant. You help people by answering questions about their email conversations, tracking decisions and commitments, and maintaining shared knowledge.

IMPORTANT PRIVACY RULES:
- You can ONLY reference information that ALL current participants in this conversation have access to
- If you cannot fully answer a question due to privacy constraints, you must:
  1. Provide whatever information you CAN safely share
  2. Explicitly state that you cannot provide more information
  3. Name the specific participant(s) whose presence prevents full disclosure
- NEVER leak confidential information to unauthorized participants

When answering questions:
- Be concise and factual
- Cite specific emails or speech acts when relevant
- If you're not sure about something, say so - don't guess
- Focus on reliability over speculation`;
export class QueryHandler {
    constructor() {
        this.client = getClaudeClient();
    }
    /**
     * Handle a query request
     */
    async handleQuery(request, context) {
        // If tool use is enabled and MCP client is available, use tool-enabled path
        if (context.useTools && context.mcpClient) {
            return this.handleQueryWithTools(request, context);
        }
        // Original non-tool path
        const allParticipants = [request.asker, ...request.context_participants];
        // Filter context based on privacy
        const accessibleEmails = context.privacyTracker.filterEmails(context.emails, allParticipants);
        const accessibleSpeechActs = context.privacyTracker.filterSpeechActs(context.speechActs, allParticipants);
        const accessibleKnowledge = context.knowledgeEntries
            ? context.privacyTracker.filterKnowledgeEntries(context.knowledgeEntries, allParticipants)
            : [];
        // Build the prompt (with or without memory system)
        const systemPrompt = this.buildSystemPrompt(context.personality);
        let userPrompt;
        if (context.useMemorySystem && context.threadId) {
            // Use memory system to build context
            const memoryManager = getMemoryManager();
            const memoryContext = await memoryManager.buildContext(accessibleEmails, context.threadId, accessibleSpeechActs, accessibleKnowledge);
            userPrompt = this.buildUserPromptWithMemory(request.query, memoryContext, allParticipants);
        }
        else {
            // Legacy approach: use all accessible emails
            userPrompt = this.buildUserPrompt(request.query, accessibleEmails, accessibleSpeechActs, accessibleKnowledge, allParticipants);
        }
        // Get response from Claude
        const rawAnswer = await this.client.prompt(userPrompt, {
            systemPrompt,
            temperature: 0.3, // Lower temperature for factual responses
        });
        // Parse confidence metadata
        const { answer, confidence, suggested_skill_name } = this.parseConfidenceMetadata(rawAnswer);
        // Determine sources and privacy status
        const sources = this.extractSources(accessibleEmails, accessibleSpeechActs, accessibleKnowledge);
        const privacyRestricted = accessibleEmails.length < context.emails.length ||
            accessibleSpeechActs.length < context.speechActs.length;
        let restrictedInfo;
        if (privacyRestricted) {
            const restrictedParticipants = this.findRestrictedParticipants(context, allParticipants);
            if (restrictedParticipants.length > 0) {
                const names = restrictedParticipants.map((p) => p.name || p.email).join(', ');
                restrictedInfo = `Some information has been withheld due to the presence of: ${names}`;
            }
        }
        return {
            answer,
            sources,
            privacy_restricted: privacyRestricted,
            restricted_info: restrictedInfo,
            confidence,
            suggested_skill_name,
        };
    }
    /**
     * Handle a query request with tool use enabled
     * Automatically discovers and invokes MCP tools when Claude requests them
     */
    async handleQueryWithTools(request, context) {
        if (!context.mcpClient) {
            throw new Error('MCP client is required for tool use');
        }
        const allParticipants = [request.asker, ...request.context_participants];
        // Filter context based on privacy
        const accessibleEmails = context.privacyTracker.filterEmails(context.emails, allParticipants);
        const accessibleSpeechActs = context.privacyTracker.filterSpeechActs(context.speechActs, allParticipants);
        const accessibleKnowledge = context.knowledgeEntries
            ? context.privacyTracker.filterKnowledgeEntries(context.knowledgeEntries, allParticipants)
            : [];
        // Build the prompt
        const systemPrompt = this.buildSystemPrompt(context.personality);
        let userPrompt;
        if (context.useMemorySystem && context.threadId) {
            const memoryManager = getMemoryManager();
            const memoryContext = await memoryManager.buildContext(accessibleEmails, context.threadId, accessibleSpeechActs, accessibleKnowledge);
            userPrompt = this.buildUserPromptWithMemory(request.query, memoryContext, allParticipants);
        }
        else {
            userPrompt = this.buildUserPrompt(request.query, accessibleEmails, accessibleSpeechActs, accessibleKnowledge, allParticipants);
        }
        // Discover available MCP tools
        const tools = this.convertMCPToolsToClaude(context.mcpClient.getAllTools());
        // Track tool uses for sources
        const toolsUsed = [];
        // Use tools with Claude (with iteration limit)
        const maxIterations = 5;
        let currentAnswer;
        let iteration = 0;
        while (iteration < maxIterations) {
            const response = await this.client.promptWithTools(userPrompt, {
                systemPrompt,
                temperature: 0.3,
                tools,
            });
            currentAnswer = response.text;
            // If no tool uses, we're done
            if (response.tool_uses.length === 0) {
                break;
            }
            // Execute tool uses
            const toolResults = [];
            for (const toolUse of response.tool_uses) {
                // Track which tools were used
                toolsUsed.push(toolUse.name);
                // Invoke the MCP tool
                const result = await context.mcpClient.invokeToolByName(toolUse.name, toolUse.input);
                toolResults.push({
                    tool_use_id: toolUse.id,
                    content: result.success ? JSON.stringify(result.result) : result.error || 'Tool execution failed',
                    is_error: !result.success,
                });
            }
            // Continue conversation with tool results (for next iteration)
            userPrompt = `Previous context maintained. Tool results provided.`;
            iteration++;
            // If we have tool results, continue the loop
            // The loop will end when Claude doesn't request more tools
        }
        // Final answer (either direct response or after tool uses)
        const rawAnswer = currentAnswer || 'I was unable to generate a response.';
        // Parse confidence metadata
        const { answer, confidence, suggested_skill_name } = this.parseConfidenceMetadata(rawAnswer);
        // Determine sources
        const sources = this.extractSources(accessibleEmails, accessibleSpeechActs, accessibleKnowledge);
        sources.push(...toolsUsed.map((toolName) => `tool:${toolName}`));
        const privacyRestricted = accessibleEmails.length < context.emails.length ||
            accessibleSpeechActs.length < context.speechActs.length;
        let restrictedInfo;
        if (privacyRestricted) {
            const restrictedParticipants = this.findRestrictedParticipants(context, allParticipants);
            if (restrictedParticipants.length > 0) {
                const names = restrictedParticipants.map((p) => p.name || p.email).join(', ');
                restrictedInfo = `Some information has been withheld due to the presence of: ${names}`;
            }
        }
        return {
            answer,
            sources,
            privacy_restricted: privacyRestricted,
            restricted_info: restrictedInfo,
            confidence,
            suggested_skill_name,
        };
    }
    /**
     * Convert MCP tools to Claude tool format
     */
    convertMCPToolsToClaude(mcpTools) {
        return mcpTools.map((tool) => ({
            name: tool.name,
            description: `[${tool.serverName}] ${tool.description || 'No description'}`,
            input_schema: tool.inputSchema,
        }));
    }
    buildSystemPrompt(personality) {
        let prompt = BASE_SYSTEM_PROMPT;
        if (personality) {
            prompt += `\n\nPERSONALITY:\n`;
            prompt += `- Name: ${personality.name}\n`;
            prompt += `- Tone: ${personality.tone}\n`;
            prompt += `- Speaking Style: ${personality.speaking_style}\n`;
            if (personality.constraints && personality.constraints.length > 0) {
                prompt += `- Constraints: ${personality.constraints.join('; ')}\n`;
            }
            if (personality.system_prompt_additions) {
                prompt += `\n${personality.system_prompt_additions}\n`;
            }
            if (personality.example_phrases && personality.example_phrases.length > 0) {
                prompt += `\nExample phrases you might use: ${personality.example_phrases.join('; ')}\n`;
            }
        }
        return prompt;
    }
    buildUserPrompt(query, emails, speechActs, knowledge, participants) {
        let prompt = `Current conversation participants: ${participants.map((p) => p.name || p.email).join(', ')}\n\n`;
        // Add email context
        if (emails.length > 0) {
            prompt += `RELEVANT EMAIL MESSAGES:\n`;
            for (const email of emails.slice(-10)) { // Last 10 emails
                prompt += `\n[${email.timestamp}] From: ${email.from.name || email.from.email}\n`;
                prompt += `To: ${email.to.map((a) => a.name || a.email).join(', ')}\n`;
                prompt += `Subject: ${email.subject}\n`;
                prompt += `${email.body}\n`;
                prompt += `---\n`;
            }
        }
        // Add speech act context
        if (speechActs.length > 0) {
            const requests = speechActs.filter((a) => a.type === 'request');
            const questions = speechActs.filter((a) => a.type === 'question');
            const commitments = speechActs.filter((a) => a.type === 'commitment');
            const decisions = speechActs.filter((a) => a.type === 'decision');
            if (decisions.length > 0) {
                prompt += `\nKEY DECISIONS:\n`;
                decisions.forEach((d) => {
                    prompt += `- ${d.content} (${d.actor.name || d.actor.email}, ${d.timestamp})\n`;
                });
            }
            if (commitments.length > 0) {
                prompt += `\nCOMMITMENTS:\n`;
                commitments.forEach((c) => {
                    prompt += `- ${c.content} (${c.actor.name || c.actor.email}, ${c.timestamp})\n`;
                });
            }
            if (requests.length > 0) {
                prompt += `\nOPEN REQUESTS:\n`;
                requests.forEach((r) => {
                    prompt += `- ${r.content} (${r.actor.name || r.actor.email}, ${r.timestamp})\n`;
                });
            }
            if (questions.length > 0) {
                prompt += `\nQUESTIONS:\n`;
                questions.forEach((q) => {
                    prompt += `- ${q.content} (${q.actor.name || q.actor.email}, ${q.timestamp})\n`;
                });
            }
        }
        // Add knowledge context
        if (knowledge.length > 0) {
            prompt += `\nSTORED KNOWLEDGE:\n`;
            for (const entry of knowledge) {
                prompt += `\n[${entry.category}] ${entry.title}\n`;
                prompt += `${entry.content}\n`;
                prompt += `---\n`;
            }
        }
        prompt += `\nQUERY: ${query}\n\n`;
        prompt += `Please answer the query based on the information provided above. Remember to respect privacy constraints.

IMPORTANT: After your answer, include a confidence assessment on a new line:
CONFIDENCE: [HIGH|MEDIUM|LOW|UNABLE]

If your confidence is UNABLE (meaning you cannot answer the query with the available information and tools):
SUGGESTED_SKILL: [a descriptive name for a skill that could help answer this query]

For example:
- If asked to generate a report you don't know how to create: "CONFIDENCE: UNABLE" followed by "SUGGESTED_SKILL: generate-weekly-status-report"
- If asked about information not in the context: "CONFIDENCE: UNABLE" followed by "SUGGESTED_SKILL: search-external-data"
`;
        return prompt;
    }
    /**
     * Build user prompt using memory system (hybrid: recent messages + summaries)
     */
    buildUserPromptWithMemory(query, memoryContext, participants) {
        let prompt = `Current conversation participants: ${participants.map((p) => p.name || p.email).join(', ')}\n\n`;
        // Use the memory manager's formatter
        const memoryManager = getMemoryManager();
        prompt += memoryManager.formatContext(memoryContext);
        prompt += `\n\nQUERY: ${query}\n\n`;
        prompt += `Please answer the query based on the information provided above. Remember to respect privacy constraints.

IMPORTANT: After your answer, include a confidence assessment on a new line:
CONFIDENCE: [HIGH|MEDIUM|LOW|UNABLE]

If your confidence is UNABLE (meaning you cannot answer the query with the available information and tools):
SUGGESTED_SKILL: [a descriptive name for a skill that could help answer this query]

For example:
- If asked to generate a report you don't know how to create: "CONFIDENCE: UNABLE" followed by "SUGGESTED_SKILL: generate-weekly-status-report"
- If asked about information not in the context: "CONFIDENCE: UNABLE" followed by "SUGGESTED_SKILL: search-external-data"
`;
        return prompt;
    }
    /**
     * Parse confidence level and suggested skill from Claude's response
     * Extracts metadata and returns clean answer + metadata
     */
    parseConfidenceMetadata(rawAnswer) {
        // Look for CONFIDENCE: pattern
        const confidenceMatch = rawAnswer.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW|UNABLE)/i);
        const suggestedSkillMatch = rawAnswer.match(/SUGGESTED_SKILL:\s*([^\n]+)/i);
        let confidence;
        if (confidenceMatch) {
            confidence = confidenceMatch[1].toLowerCase();
        }
        let suggested_skill_name;
        if (suggestedSkillMatch) {
            suggested_skill_name = suggestedSkillMatch[1].trim();
        }
        // Remove metadata lines from answer
        let answer = rawAnswer
            .replace(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW|UNABLE)/gi, '')
            .replace(/SUGGESTED_SKILL:\s*[^\n]+/gi, '')
            .trim();
        return { answer, confidence, suggested_skill_name };
    }
    extractSources(emails, speechActs, knowledge) {
        const sources = [];
        sources.push(...emails.map((e) => e.message_id));
        sources.push(...speechActs.map((a) => a.id));
        sources.push(...knowledge.map((k) => k.id));
        return sources;
    }
    findRestrictedParticipants(context, currentParticipants) {
        const restricted = [];
        for (const participant of currentParticipants) {
            // Check if this participant has access to all emails
            const hasAccessToAll = context.emails.every((email) => context.privacyTracker.hasAccessToMessage(participant.email, email.message_id));
            if (!hasAccessToAll) {
                restricted.push(participant);
            }
        }
        return restricted;
    }
}
export function createQueryHandler() {
    return new QueryHandler();
}
//# sourceMappingURL=handler.js.map