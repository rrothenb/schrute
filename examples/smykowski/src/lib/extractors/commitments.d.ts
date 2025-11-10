import type { Email } from '@schrute/lib/types/index.js';
import type { ClaudeClient } from '@schrute/lib/claude/client.js';
import type { Commitment } from '~/lib/types/index.js';
/**
 * CommitmentExtractor uses Claude API to extract commitments from emails
 *
 * A commitment is a promise or agreement to do something by a specific time.
 * It's more binding than a general action item.
 */
export declare class CommitmentExtractor {
    private claudeClient;
    private dateParser;
    constructor(claudeClient: ClaudeClient);
    /**
     * Extract commitments from an email
     */
    extract(email: Email): Promise<Commitment[]>;
    /**
     * Extract commitments from multiple emails
     */
    extractFromThread(emails: Email[]): Promise<Commitment[]>;
    /**
     * Get active commitments (not completed or cancelled)
     */
    getActive(commitments: Commitment[]): Commitment[];
    /**
     * Get overdue commitments
     */
    getOverdue(commitments: Commitment[]): Commitment[];
    /**
     * Get upcoming commitments (due within N days)
     */
    getUpcoming(commitments: Commitment[], daysAhead: number): Commitment[];
    /**
     * Get commitments by person
     */
    getByPerson(commitments: Commitment[], email: string): Commitment[];
    /**
     * Calculate days until deadline
     */
    getDaysUntilDeadline(commitment: Commitment): number | null;
    /**
     * Infer GitHub username from email
     */
    private inferGitHubUsername;
}
//# sourceMappingURL=commitments.d.ts.map