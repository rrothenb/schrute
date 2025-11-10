import { AssignmentLogic } from '~/lib/extractors/assignments.js';
export class WorkloadBalancingWorkflow {
    constructor() {
        this.assignmentLogic = new AssignmentLogic();
    }
    async execute(teamMembers, issues) {
        const balance = this.assignmentLogic.calculateWorkloadBalance(teamMembers);
        const overloaded = this.assignmentLogic.getOverloadedMembers(teamMembers);
        const imbalanced_members = overloaded.map(member => {
            const actionItems = issues
                .filter(i => i.assignees.some(a => a.login === member.github_username))
                .map(i => ({ description: i.title }));
            const reassignments = this.assignmentLogic.suggestReassignments(member, teamMembers, actionItems);
            return {
                member,
                workload_ratio: member.current_workload / balance.avgWorkload,
                suggested_reassignments: reassignments.map(r => ({
                    issue: issues.find(i => i.title === r.item.description),
                    suggested_assignee: r.toMember,
                })),
            };
        });
        return {
            team_members: teamMembers,
            avg_workload: balance.avgWorkload,
            imbalanced_members,
        };
    }
}
//# sourceMappingURL=workload-balancing.js.map