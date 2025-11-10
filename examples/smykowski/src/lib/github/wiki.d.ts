import type { GitHubClient } from './client.js';
import type { WikiPageParams } from '~/lib/types/index.js';
/**
 * WikiManager handles GitHub Wiki operations
 *
 * Note: GitHub Wiki is actually a separate Git repository.
 * We interact with it through the repository's wiki pages stored in a special branch.
 */
export declare class WikiManager {
    private client;
    constructor(client: GitHubClient);
    /**
     * Get a wiki page
     */
    getPage(pageName: string): Promise<{
        content: string;
        sha: string;
    } | null>;
    /**
     * Create or update a wiki page
     */
    createOrUpdatePage(params: WikiPageParams): Promise<void>;
    /**
     * Update a section of a wiki page (preserving other content)
     */
    updateSection(pageName: string, sectionTitle: string, newContent: string): Promise<void>;
    /**
     * Append content to a wiki page
     */
    appendToPage(pageName: string, content: string): Promise<void>;
    /**
     * Check if a wiki page exists
     */
    pageExists(pageName: string): Promise<boolean>;
    /**
     * Get all wiki pages (note: this requires listing wiki repo contents)
     */
    listPages(): Promise<string[]>;
    /**
     * Replace content of a specific section in markdown
     */
    private replaceSectionContent;
    /**
     * Sanitize page name for file system
     */
    private sanitizePageName;
    /**
     * Escape regex special characters
     */
    private escapeRegex;
    /**
     * Generate a table of contents from markdown headers
     */
    generateTOC(content: string): string;
}
//# sourceMappingURL=wiki.d.ts.map