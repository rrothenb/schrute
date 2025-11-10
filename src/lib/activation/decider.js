import { getClaudeClient } from '~/lib/claude/index.js';
const ACTIVATION_PROMPT = `You are an AI assistant helping Schrute decide whether to respond to an email.

Schrute's configuration:
- Name: {name}
- Aliases: {aliases}
- Email: {email}
- Areas of responsibility: {responsibilities}
- Expertise keywords: {expertise}

You need to determine if Schrute should respond to the following email.

Schrute should respond if ANY of these conditions are met:
1. Schrute is in the "To:" line of the email
2. Schrute is directly mentioned by name (including aliases)
3. A pronoun appears to refer to Schrute based on context
4. A question is asked about something in Schrute's areas of responsibility
5. A request is made for something Schrute is responsible for
6. Schrute's expertise is needed based on keywords
7. A previous task assigned to Schrute is referenced

EMAIL TO ANALYZE:
From: {from}
To: {to}
CC: {cc}
Subject: {subject}
Body:
{body}

{thread_context}

Analyze whether Schrute should respond. Respond with JSON in this format:
{
  "should_respond": true/false,
  "confidence": 0.0-1.0,
  "reasons": ["reason 1", "reason 2", ...]
}

Be conservative - if you're unsure, lean toward responding (better to be available than to miss something important).`;
export class ActivationDecider {
    constructor() {
        this.client = getClaudeClient();
    }
    /**
     * Decide whether Schrute should respond to an email
     */
    async shouldRespond(context) {
        const { email, threadHistory, schruteConfig } = context;
        // Quick check: If Schrute is in To: line, always respond
        const inToLine = email.to.some((recipient) => recipient.email === schruteConfig.email.email);
        if (inToLine) {
            return {
                should_respond: true,
                confidence: 1.0,
                reasons: ['Schrute is in the To: line'],
            };
        }
        // Build thread context if available
        let threadContext = '';
        if (threadHistory && threadHistory.length > 0) {
            threadContext = 'PREVIOUS THREAD MESSAGES:\n';
            for (const msg of threadHistory.slice(-5)) {
                // Last 5 messages
                threadContext += `[${msg.timestamp}] From: ${msg.from.name || msg.from.email}\n`;
                threadContext += `${msg.body.slice(0, 200)}${msg.body.length > 200 ? '...' : ''}\n---\n`;
            }
        }
        // Build the prompt
        const prompt = ACTIVATION_PROMPT.replace('{name}', schruteConfig.name)
            .replace('{aliases}', schruteConfig.aliases && schruteConfig.aliases.length > 0
            ? schruteConfig.aliases.join(', ')
            : 'none')
            .replace('{email}', schruteConfig.email.email)
            .replace('{responsibilities}', schruteConfig.areas_of_responsibility && schruteConfig.areas_of_responsibility.length > 0
            ? schruteConfig.areas_of_responsibility.join(', ')
            : 'none')
            .replace('{expertise}', schruteConfig.expertise_keywords && schruteConfig.expertise_keywords.length > 0
            ? schruteConfig.expertise_keywords.join(', ')
            : 'none')
            .replace('{from}', `${email.from.name || ''} <${email.from.email}>`)
            .replace('{to}', email.to.map((a) => `${a.name || ''} <${a.email}>`).join(', '))
            .replace('{cc}', email.cc && email.cc.length > 0
            ? email.cc.map((a) => `${a.name || ''} <${a.email}>`).join(', ')
            : 'none')
            .replace('{subject}', email.subject)
            .replace('{body}', email.body)
            .replace('{thread_context}', threadContext);
        try {
            const decision = await this.client.promptJson(prompt, {
                temperature: 0.3, // Lower temperature for consistent decisions
            });
            return decision;
        }
        catch (error) {
            console.error('Failed to make activation decision:', error);
            // Default to responding if there's an error (conservative approach)
            return {
                should_respond: true,
                confidence: 0.5,
                reasons: ['Error in activation logic - responding by default'],
            };
        }
    }
    /**
     * Decide for multiple emails
     */
    async shouldRespondBatch(emails, schruteConfig, threads) {
        const decisions = new Map();
        for (const email of emails) {
            const threadHistory = threads?.get(email.thread_id)?.messages.filter((m) => new Date(m.timestamp) < new Date(email.timestamp));
            const decision = await this.shouldRespond({
                email,
                threadHistory,
                schruteConfig,
            });
            decisions.set(email.message_id, decision);
        }
        return decisions;
    }
}
export function createActivationDecider() {
    return new ActivationDecider();
}
//# sourceMappingURL=decider.js.map