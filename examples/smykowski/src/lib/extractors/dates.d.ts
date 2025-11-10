import type { ClaudeClient } from '@schrute/lib/claude/client.js';
/**
 * DateParser uses Claude API to parse natural language dates
 *
 * Examples:
 * - "by Friday" -> ISO timestamp for next Friday
 * - "end of day Wednesday" -> ISO timestamp for Wednesday 17:00
 * - "next week" -> ISO timestamp for 7 days from now
 * - "by month end" -> ISO timestamp for last day of current month
 */
export declare class DateParser {
    private claudeClient;
    constructor(claudeClient: ClaudeClient);
    /**
     * Parse natural language date to ISO timestamp
     */
    parseDate(dateText: string, referenceDate?: string): Promise<{
        iso: string;
        confidence: number;
    } | null>;
    /**
     * Parse multiple date expressions
     */
    parseDates(dateTexts: string[], referenceDate?: string): Promise<Map<string, {
        iso: string;
        confidence: number;
    }>>;
    /**
     * Extract date expressions from text
     */
    extractDateExpressions(text: string): string[];
    /**
     * Validate ISO 8601 timestamp
     */
    private isValidISO;
    /**
     * Calculate time until deadline
     */
    getTimeUntil(deadline: string): {
        days: number;
        hours: number;
        isPast: boolean;
    };
    /**
     * Format deadline as human-readable relative time
     */
    formatRelative(deadline: string): string;
}
//# sourceMappingURL=dates.d.ts.map