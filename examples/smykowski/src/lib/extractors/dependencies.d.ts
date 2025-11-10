import type { Email } from '@schrute/lib/types/index.js';
import type { GitHubIssue } from '~/lib/types/index.js';
import type { Dependency } from '~/lib/types/index.js';
/**
 * DependencyExtractor detects dependencies between issues
 */
export declare class DependencyExtractor {
    /**
     * Extract dependencies from email text
     */
    extractFromEmail(email: Email): Array<{
        blocker: number;
        blocked: number;
        type: 'blocks' | 'blocked_by' | 'related';
    }>;
    /**
     * Extract dependencies from GitHub issue body
     */
    extractFromIssue(issue: GitHubIssue): Array<{
        blocker: number;
        blocked: number;
        type: 'blocks' | 'blocked_by' | 'related';
    }>;
    /**
     * Generic dependency extraction from text
     */
    private extractDependencies;
    /**
     * Create dependency objects
     */
    createDependencies(extracted: Array<{
        blocker: number;
        blocked: number;
        type: 'blocks' | 'blocked_by' | 'related';
    }>): Dependency[];
    /**
     * Build dependency graph
     */
    buildGraph(dependencies: Dependency[]): Map<number, {
        blocks: number[];
        blockedBy: number[];
    }>;
    /**
     * Detect circular dependencies
     */
    detectCircular(dependencies: Dependency[]): number[][];
    /**
     * Get all issues that are blocked
     */
    getBlockedIssues(dependencies: Dependency[]): number[];
    /**
     * Get all blockers for a specific issue
     */
    getBlockers(issueNumber: number, dependencies: Dependency[]): number[];
    /**
     * Try to extract current issue number from email
     */
    private extractCurrentIssue;
}
//# sourceMappingURL=dependencies.d.ts.map