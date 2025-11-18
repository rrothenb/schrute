import type { ScheduledEvent } from 'aws-lambda'
import { GitHubService } from '~/lib/github/index.js'
import { getSecret } from '../utils/secrets.js'

/**
 * PR Review Reminder Lambda Handler
 * Scheduled to run daily (weekdays at 9am UTC)
 *
 * Responsibilities:
 * 1. Find all open PRs that haven't been reviewed recently
 * 2. Identify stale PRs (no activity in N days)
 * 3. Create reminder comments for team
 * 4. Escalate critical PRs to team lead
 */
export async function handler(event: ScheduledEvent) {
  console.log('PR Review Reminder triggered:', event.time)

  try {
    const githubToken = await getSecret(process.env.GITHUB_TOKEN_SECRET!)
    const github = new GitHubService(githubToken, process.env.GITHUB_REPOSITORY!, '')

    // Get all open PRs
    const openPRs = await github.pullRequests.list({ state: 'open' })

    console.log(`Found ${openPRs.length} open PRs`)

    // Identify stale PRs (no activity in 3+ days)
    const stalePRs = openPRs.filter((pr) => {
      const lastUpdated = new Date(pr.updated_at)
      const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceUpdate >= 3
    })

    console.log(`Found ${stalePRs.length} stale PRs`)

    // Create reminder comments for stale PRs
    for (const pr of stalePRs) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(pr.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Check if PR needs reviewers
      if (!pr.requested_reviewers || pr.requested_reviewers.length === 0) {
        await github.issues.addComment(
          pr.number,
          `🔔 This PR has been waiting for ${daysSinceUpdate} days without reviewers. Could someone volunteer to review?`
        )

        console.log(`Posted reminder comment on PR #${pr.number}`)
      } else {
        // Remind existing reviewers
        const reviewers = pr.requested_reviewers.map((r) => `@${r.login}`).join(', ')

        await github.issues.addComment(
          pr.number,
          `🔔 Reminder: This PR has been waiting for review for ${daysSinceUpdate} days. ${reviewers}, please review when you have a chance.`
        )

        console.log(`Posted reminder to reviewers on PR #${pr.number}`)
      }
    }

    // Identify critical stale PRs (7+ days, has "priority" or "urgent" label)
    const criticalStalePRs = stalePRs.filter((pr) => {
      const daysSinceUpdate = (Date.now() - new Date(pr.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      const hasPriorityLabel = pr.labels?.some(
        (label) => label.name === 'priority' || label.name === 'urgent'
      )
      return daysSinceUpdate >= 7 && hasPriorityLabel
    })

    if (criticalStalePRs.length > 0) {
      // Create escalation issue for team lead
      const prList = criticalStalePRs
        .map((pr) => `- #${pr.number}: ${pr.title} (${Math.floor((Date.now() - new Date(pr.updated_at).getTime()) / (1000 * 60 * 60 * 24))} days old)`)
        .join('\n')

      const teamLeadEmail = process.env.TEAM_LEAD_EMAIL || ''
      const teamLeadUsername = teamLeadEmail.split('@')[0]

      await github.issues.create({
        title: `⚠️ Critical PR Review Escalation - ${criticalStalePRs.length} stale priority PRs`,
        body: `The following priority PRs have been waiting for review for 7+ days:\n\n${prList}\n\n@${teamLeadUsername} - Please help prioritize these reviews.`,
        labels: ['escalation', 'review-needed'],
      })

      console.log(`Created escalation issue for ${criticalStalePRs.length} critical PRs`)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'PR review reminders sent',
        stale_prs: stalePRs.length,
        critical_prs: criticalStalePRs.length,
      }),
    }
  } catch (error) {
    console.log(`Error in PR review reminder: ${error}`)
    throw error
  }
}
