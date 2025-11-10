import type { Email, EmailSummary } from '~/lib/types';
/**
 * Generate a summary of email messages using Claude
 */
export declare function summarizeEmails(emails: Email[], threadId: string): Promise<EmailSummary>;
/**
 * Generate summaries for multiple email groups
 */
export declare function summarizeEmailBatches(emailGroups: Email[][], threadId: string): Promise<EmailSummary[]>;
//# sourceMappingURL=summarizer.d.ts.map