import type { Commitment, DeadlineTrackingContext, GitHubIssue } from '~/lib/types/index.js';
import type { GitHubService } from '~/lib/github/index.js';
/**
 * DeadlineTrackingWorkflow monitors commitments and sends reminders
 *
 * Workflow:
 * 1. Check all active commitments
 * 2. Identify upcoming deadlines (within reminder threshold)
 * 3. Identify overdue commitments
 * 4. Send appropriate reminders
 * 5. Escalate overdue items
 */
export declare class DeadlineTrackingWorkflow {
    private github;
    private reminderDaysThreshold;
    constructor(github: GitHubService, reminderDaysThreshold?: number);
    /**
     * Execute deadline tracking workflow
     */
    execute(commitments: Commitment[]): Promise<DeadlineTrackingContext>;
    /**
     * Send reminders for upcoming deadlines
     */
    sendUpcomingReminders(upcoming: Array<{
        commitment: Commitment;
        days_until_deadline: number;
        issue?: GitHubIssue;
    }>): Promise<void>;
    /**
     * Send overdue escalations
     */
    sendOverdueEscalations(overdue: Array<{
        commitment: Commitment;
        days_overdue: number;
        issue?: GitHubIssue;
    }>, teamLeadEmail: string): Promise<void>;
    /**
     * Build reminder message
     */
    private buildReminderMessage;
    /**
     * Build overdue message
     */
    private buildOverdueMessage;
    /**
     * Check if commitment needs reminder
     */
    needsReminder(commitment: Commitment): boolean;
    /**
     * Calculate deadline statistics
     */
    calculateStats(commitments: Commitment[]): {
        total: number;
        active: number;
        completed: number;
        overdue: number;
        upcoming: number;
        on_track: number;
    };
}
//# sourceMappingURL=deadline-tracking.d.ts.map