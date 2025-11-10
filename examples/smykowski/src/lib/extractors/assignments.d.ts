import type { ActionItem, TeamMember } from '~/lib/types/index.js';
/**
 * AssignmentLogic determines appropriate assignees for tasks
 *
 * Uses ML-based expertise tracking and workload balancing
 */
export declare class AssignmentLogic {
    /**
     * Suggest assignee for an action item based on expertise and workload
     */
    suggestAssignee(item: ActionItem, teamMembers: TeamMember[]): {
        suggested: TeamMember | null;
        confidence: number;
        reason: string;
    };
    /**
     * Suggest reassignments for better workload balance
     */
    suggestReassignments(overloadedMember: TeamMember, teamMembers: TeamMember[], issues: ActionItem[]): Array<{
        item: ActionItem;
        fromMember: TeamMember;
        toMember: TeamMember;
        reason: string;
    }>;
    /**
     * Score how well a team member matches an action item
     */
    private scoreAssignment;
    /**
     * Calculate team workload balance
     */
    calculateWorkloadBalance(teamMembers: TeamMember[]): {
        avgWorkload: number;
        maxWorkload: number;
        minWorkload: number;
        imbalanceRatio: number;
        isBalanced: boolean;
    };
    /**
     * Identify overloaded team members
     */
    getOverloadedMembers(teamMembers: TeamMember[], threshold?: number): TeamMember[];
}
//# sourceMappingURL=assignments.d.ts.map