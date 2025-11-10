import type { TeamMember, WorkloadBalanceContext, GitHubIssue } from '~/lib/types/index.js'
import { AssignmentLogic } from '~/lib/extractors/assignments.js'

export class WorkloadBalancingWorkflow {
  private assignmentLogic: AssignmentLogic

  constructor() {
    this.assignmentLogic = new AssignmentLogic()
  }

  async execute(teamMembers: TeamMember[], issues: GitHubIssue[]): Promise<WorkloadBalanceContext> {
    const balance = this.assignmentLogic.calculateWorkloadBalance(teamMembers)
    const overloaded = this.assignmentLogic.getOverloadedMembers(teamMembers)

    const imbalanced_members = overloaded.map(member => {
      const actionItems = issues
        .filter(i => i.assignees.some(a => a.login === member.github_username))
        .map(i => ({ description: i.title } as any))

      const reassignments = this.assignmentLogic.suggestReassignments(
        member,
        teamMembers,
        actionItems
      )

      return {
        member,
        workload_ratio: member.current_workload / balance.avgWorkload,
        suggested_reassignments: reassignments.map(r => ({
          issue: issues.find(i => i.title === r.item.description)!,
          suggested_assignee: r.toMember,
        })),
      }
    })

    return {
      team_members: teamMembers,
      avg_workload: balance.avgWorkload,
      imbalanced_members,
    }
  }
}
