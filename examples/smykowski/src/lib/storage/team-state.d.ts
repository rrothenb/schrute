import type { TeamMember } from '~/lib/types/index.js';
export declare class TeamStateStorage {
    private docClient;
    private tableName;
    constructor(tableName: string, region?: string);
    store(member: TeamMember): Promise<void>;
    get(email: string): Promise<TeamMember | null>;
    getAll(): Promise<TeamMember[]>;
    updateWorkload(email: string, workload: number, assignedIssues: number[]): Promise<void>;
}
//# sourceMappingURL=team-state.d.ts.map