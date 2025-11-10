import type { Email } from '@schrute/lib/types/index.js';
import type { ActionItem, GitHubIssue } from '~/lib/types/index.js';
import type { GitHubService } from '~/lib/github/index.js';
import type { ActionItemExtractor } from '~/lib/extractors/index.js';
import type { SchruteBridge } from '~/lib/integrations/index.js';
/**
 * MeetingFollowupWorkflow automates the process of converting meeting notes
 * into actionable GitHub issues
 *
 * Workflow:
 * 1. Receive meeting notes via email
 * 2. Extract action items and decisions
 * 3. Create GitHub issues for each action
 * 4. Assign to appropriate team members
 * 5. Set deadlines
 * 6. Create Discussion post with summary
 * 7. Send confirmation email
 * 8. Schedule follow-up reminders
 */
export declare class MeetingFollowupWorkflow {
    private github;
    private extractor;
    private schrute;
    constructor(github: GitHubService, extractor: ActionItemExtractor, schrute: SchruteBridge);
    /**
     * Execute the meeting followup workflow
     */
    execute(email: Email): Promise<{
        actionItems: ActionItem[];
        createdIssues: GitHubIssue[];
        discussionNumber: number | null;
        confirmationSent: boolean;
        errors: string[];
    }>;
    /**
     * Create a GitHub issue from an action item
     */
    private createIssueFromActionItem;
    /**
     * Create a Discussion post summarizing the meeting
     */
    private createDiscussionPost;
    /**
     * Send confirmation email to meeting attendees
     */
    private sendConfirmationEmail;
    /**
     * Calculate days until deadline
     */
    private getDaysUntilDeadline;
}
//# sourceMappingURL=meeting-followup.d.ts.map