import type { StatusSynthesisContext } from '~/lib/types/index.js';
import type { GitHubService } from '~/lib/github/index.js';
export declare class StatusSynthesisWorkflow {
    private github;
    constructor(github: GitHubService);
    execute(projectName: string): Promise<StatusSynthesisContext>;
    generateReport(context: StatusSynthesisContext): string;
}
//# sourceMappingURL=status-synthesis.d.ts.map