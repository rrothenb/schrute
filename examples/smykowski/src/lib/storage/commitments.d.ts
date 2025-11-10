import type { Commitment } from '~/lib/types/index.js';
export declare class CommitmentsStorage {
    private docClient;
    private tableName;
    constructor(tableName: string, region?: string);
    store(commitment: Commitment): Promise<void>;
    get(id: string): Promise<Commitment | null>;
    getByPerson(email: string): Promise<Commitment[]>;
    updateStatus(id: string, status: Commitment['status']): Promise<void>;
}
//# sourceMappingURL=commitments.d.ts.map