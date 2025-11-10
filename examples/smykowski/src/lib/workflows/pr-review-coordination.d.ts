import type { GitHubPullRequest, PRReviewContext, TeamMember } from '~/lib/types/index.js';
import type { GitHubService } from '~/lib/github/index.js';
/**
 * PRReviewCoordinationWorkflow manages pull request reviews
 */
export declare class PRReviewCoordinationWorkflow {
    private github;
    private reviewSLAHours;
    constructor(github: GitHubService, reviewSLAHours?: number);
    execute(prs: GitHubPullRequest[], teamMembers: TeamMember[]): Promise<PRReviewContext[]>;
    sendReviewReminders(contexts: PRReviewContext[]): Promise<void>;
    private sendReminder;
    private suggestReviewers;
    private getPRAge;
}
//# sourceMappingURL=pr-review-coordination.d.ts.map