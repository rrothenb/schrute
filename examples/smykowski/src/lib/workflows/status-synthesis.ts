import type { GitHubIssue, StatusSynthesisContext } from '~/lib/types/index.js'
import type { GitHubService } from '~/lib/github/index.js'

export class StatusSynthesisWorkflow {
  constructor(private github: GitHubService) {}

  async execute(projectName: string): Promise<StatusSynthesisContext> {
    const issues = await this.github.issues.list({ state: 'all' })
    const openIssues = issues.filter(i => i.state === 'open')
    const closedIssues = issues.filter(i => i.state === 'closed')

    return {
      project_name: projectName,
      total_issues: issues.length,
      open_issues: openIssues.length,
      closed_issues: closedIssues.length,
      completion_percentage: issues.length > 0 ? (closedIssues.length / issues.length) * 100 : 0,
      in_progress: openIssues.filter(i => i.assignees.length > 0),
      blocked: [],
      at_risk: [],
      next_actions: [],
    }
  }

  generateReport(context: StatusSynthesisContext): string {
    let report = `# Project Status: ${context.project_name}\n\n`
    report += `**Completion:** ${context.completion_percentage.toFixed(1)}% (${context.closed_issues}/${context.total_issues} issues)\n\n`
    report += `**In Progress:** ${context.in_progress.length} issues\n`
    report += `**Blocked:** ${context.blocked.length} issues\n`
    report += `**At Risk:** ${context.at_risk.length} issues\n\n`
    return report
  }
}
