import { v4 as uuidv4 } from 'uuid';
import { DateParser } from './dates.js';
/**
 * CommitmentExtractor uses Claude API to extract commitments from emails
 *
 * A commitment is a promise or agreement to do something by a specific time.
 * It's more binding than a general action item.
 */
export class CommitmentExtractor {
    constructor(claudeClient) {
        this.claudeClient = claudeClient;
        this.dateParser = new DateParser(claudeClient);
    }
    /**
     * Extract commitments from an email
     */
    async extract(email) {
        const prompt = `Extract commitments from the following email. A commitment is a specific promise or agreement to do something, often with a deadline.

Email:
From: ${email.from.name} <${email.from.email}>
To: ${email.to.map(t => `${t.name} <${t.email}>`).join(', ')}
Subject: ${email.subject}
Date: ${email.timestamp}

Body:
${email.body}

Extract ALL commitments. Look for phrases like:
- "I will..."
- "I commit to..."
- "I'll have this done by..."
- "I promise to..."
- "I agreed to..."
- "I can deliver by..."

Return ONLY a JSON array:
[
  {
    "commitment_text": "I will review the API design document",
    "person_name": "Bob Smith",
    "person_email": "bob@team.com",
    "deadline_text": "by end of day Wednesday"
  }
]

Rules:
- Only extract explicit commitments (promises to do something)
- The commitment must have a clear actor (who is committing)
- Include deadline if mentioned
- Do not extract questions or suggestions, only commitments

JSON:`;
        try {
            const response = await this.claudeClient.generateResponse({
                system: 'You are an expert at extracting commitments from emails. Output only valid JSON.',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1500,
            });
            const jsonMatch = response.content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return [];
            }
            const extractedCommitments = JSON.parse(jsonMatch[0]);
            const commitments = [];
            for (const item of extractedCommitments) {
                let deadline;
                if (item.deadline_text) {
                    const parsed = await this.dateParser.parseDate(item.deadline_text, email.timestamp);
                    if (parsed) {
                        deadline = parsed.iso;
                    }
                }
                const githubUsername = this.inferGitHubUsername(item.person_email);
                commitments.push({
                    id: uuidv4(),
                    commitment_text: item.commitment_text,
                    person_email: item.person_email,
                    person_name: item.person_name,
                    person_github: githubUsername,
                    deadline,
                    source_message_id: email.message_id,
                    thread_id: email.thread_id,
                    extracted_at: new Date().toISOString(),
                    status: 'active',
                    reminder_count: 0,
                });
            }
            return commitments;
        }
        catch (error) {
            console.error('Commitment extraction error:', error.message);
            return [];
        }
    }
    /**
     * Extract commitments from multiple emails
     */
    async extractFromThread(emails) {
        const allCommitments = [];
        for (const email of emails) {
            const commitments = await this.extract(email);
            allCommitments.push(...commitments);
        }
        return allCommitments;
    }
    /**
     * Get active commitments (not completed or cancelled)
     */
    getActive(commitments) {
        return commitments.filter(c => c.status === 'active' || c.status === 'reminded');
    }
    /**
     * Get overdue commitments
     */
    getOverdue(commitments) {
        const now = new Date();
        return commitments.filter(c => {
            if (!c.deadline || c.status === 'completed' || c.status === 'cancelled') {
                return false;
            }
            const deadline = new Date(c.deadline);
            return now > deadline;
        });
    }
    /**
     * Get upcoming commitments (due within N days)
     */
    getUpcoming(commitments, daysAhead) {
        const now = new Date();
        const threshold = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
        return commitments.filter(c => {
            if (!c.deadline || c.status === 'completed' || c.status === 'cancelled') {
                return false;
            }
            const deadline = new Date(c.deadline);
            return deadline > now && deadline <= threshold;
        });
    }
    /**
     * Get commitments by person
     */
    getByPerson(commitments, email) {
        return commitments.filter(c => c.person_email === email);
    }
    /**
     * Calculate days until deadline
     */
    getDaysUntilDeadline(commitment) {
        if (!commitment.deadline)
            return null;
        const now = new Date();
        const deadline = new Date(commitment.deadline);
        const diff = deadline.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    /**
     * Infer GitHub username from email
     */
    inferGitHubUsername(email) {
        if (!email)
            return undefined;
        return email.split('@')[0];
    }
}
//# sourceMappingURL=commitments.js.map