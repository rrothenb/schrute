import type { TeamMember, WorkloadBalanceContext, GitHubIssue } from '~/lib/types/index.js';
export declare class WorkloadBalancingWorkflow {
    private assignmentLogic;
    constructor();
    execute(teamMembers: TeamMember[], issues: GitHubIssue[]): Promise<WorkloadBalanceContext>;
}
//# sourceMappingURL=workload-balancing.d.ts.map