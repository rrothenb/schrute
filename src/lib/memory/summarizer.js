import { getClaudeClient } from '~/lib/claude';
/**
 * Generate a summary of email messages using Claude
 */
export async function summarizeEmails(emails, threadId) {
    if (emails.length === 0) {
        throw new Error('Cannot summarize empty email list');
    }
    const client = getClaudeClient();
    // Build context for summarization
    const emailTexts = emails
        .map((email, idx) => {
        return `
EMAIL ${idx + 1} (${email.timestamp})
From: ${email.from.name || email.from.email}
To: ${email.to.map((t) => t.name || t.email).join(', ')}
Subject: ${email.subject}

${email.body}
---`;
    })
        .join('\n\n');
    const prompt = `Summarize the following email thread concisely. Extract:
1. A brief summary (2-3 sentences)
2. Key points as bullet points (3-7 points)

Focus on decisions made, commitments, questions asked, and important information shared.

${emailTexts}

Return ONLY a JSON object with this structure:
{
  "summary": "Brief 2-3 sentence summary",
  "key_points": ["Point 1", "Point 2", ...]
}`;
    const result = await client.promptJson(prompt);
    // Extract participants from all emails
    const participantMap = new Map();
    for (const email of emails) {
        participantMap.set(email.from.email, email.from);
        email.to.forEach((addr) => participantMap.set(addr.email, addr));
        email.cc?.forEach((addr) => participantMap.set(addr.email, addr));
    }
    return {
        thread_id: threadId,
        summary: result.summary,
        key_points: result.key_points,
        participants: Array.from(participantMap.values()),
        message_ids: emails.map((e) => e.message_id),
        created_at: new Date().toISOString(),
    };
}
/**
 * Generate summaries for multiple email groups
 */
export async function summarizeEmailBatches(emailGroups, threadId) {
    const summaries = [];
    for (const group of emailGroups) {
        if (group.length > 0) {
            const summary = await summarizeEmails(group, threadId);
            summaries.push(summary);
        }
    }
    return summaries;
}
//# sourceMappingURL=summarizer.js.map