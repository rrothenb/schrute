import { GitHubService } from '~/lib/github/index.js';
import { CommitmentsStorage } from '~/lib/storage/index.js';
import { DeadlineTrackingWorkflow } from '~/lib/workflows/index.js';
import { getSecret } from '../utils/secrets.js';
export async function handler(event) {
    const githubToken = await getSecret(process.env.GITHUB_TOKEN_SECRET);
    const github = new GitHubService(githubToken, process.env.GITHUB_REPOSITORY, '');
    const commitmentsStorage = new CommitmentsStorage(process.env.COMMITMENTS_TABLE);
    const workflow = new DeadlineTrackingWorkflow(github);
    // Get all active commitments (would query DynamoDB in production)
    const commitments = [];
    const context = await workflow.execute(commitments);
    // Send reminders
    await workflow.sendUpcomingReminders(context.upcoming_deadlines);
    await workflow.sendOverdueEscalations(context.overdue, process.env.TEAM_LEAD_EMAIL);
    console.log(`Processed ${context.upcoming_deadlines.length} upcoming and ${context.overdue.length} overdue commitments`);
    return { statusCode: 200, body: 'Processed' };
}
//# sourceMappingURL=handler.js.map