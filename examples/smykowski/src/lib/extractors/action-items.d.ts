import type { Email } from '@schrute/lib/types/index.js';
import type { ClaudeClient } from '@schrute/lib/claude/client.js';
import type { ActionItem } from '~/lib/types/index.js';
/**
 * ActionItemExtractor uses Claude API to extract action items from emails
 */
export declare class ActionItemExtractor {
    private claudeClient;
    private dateParser;
    constructor(claudeClient: ClaudeClient);
    /**
     * Extract action items from an email
     */
    extract(email: Email): Promise<ActionItem[]>;
    /**
     * Extract action items from multiple emails
     */
    extractFromThread(emails: Email[]): Promise<ActionItem[]>;
    /**
     * Check if two action items are similar (potential duplicates)
     */
    private areSimilar;
    /**
     * Deduplicate action items
     */
    private deduplicateItems;
    /**
     * Simple Levenshtein distance for fuzzy matching
     */
    private levenshteinDistance;
    /**
     * Infer GitHub username from email (simplified)
     * In production, this would query team state from DynamoDB
     */
    private inferGitHubUsername;
    /**
     * Filter action items by assignee
     */
    filterByAssignee(items: ActionItem[], email: string): ActionItem[];
    /**
     * Filter action items by deadline proximity
     */
    filterByDeadline(items: ActionItem[], maxDaysAway: number): ActionItem[];
}
//# sourceMappingURL=action-items.d.ts.map