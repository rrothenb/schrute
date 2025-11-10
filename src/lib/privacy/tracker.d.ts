import { Email, EmailAddress, SpeechAct, ParticipantContext, PrivacyFilterResult, KnowledgeEntry } from '~/lib/types/index.js';
export declare class PrivacyTracker {
    private participantContexts;
    /**
     * Track emails and build participant access mappings
     */
    trackEmails(emails: Email[]): void;
    /**
     * Track a single email
     */
    trackEmail(email: Email): void;
    /**
     * Track speech acts
     */
    trackSpeechActs(acts: SpeechAct[]): void;
    /**
     * Track a single speech act
     */
    trackSpeechAct(act: SpeechAct): void;
    /**
     * Check if a participant has access to a message
     */
    hasAccessToMessage(participantEmail: string, messageId: string): boolean;
    /**
     * Check if a participant has access to a speech act
     */
    hasAccessToSpeechAct(participantEmail: string, speechActId: string): boolean;
    /**
     * Check if ALL participants in a list have access to a message
     */
    allHaveAccessToMessage(participants: EmailAddress[], messageId: string): boolean;
    /**
     * Check if ALL participants in a list have access to a speech act
     */
    allHaveAccessToSpeechAct(participants: EmailAddress[], speechActId: string): boolean;
    /**
     * Filter emails to only those accessible by ALL current participants
     */
    filterEmails(emails: Email[], currentParticipants: EmailAddress[]): Email[];
    /**
     * Filter speech acts to only those accessible by ALL current participants
     */
    filterSpeechActs(acts: SpeechAct[], currentParticipants: EmailAddress[]): SpeechAct[];
    /**
     * Filter knowledge entries to only those accessible by ALL current participants
     */
    filterKnowledgeEntries(entries: KnowledgeEntry[], currentParticipants: EmailAddress[]): KnowledgeEntry[];
    /**
     * Check if information can be shared with current participants
     * and provide detailed result
     */
    checkAccess(sourceMessageIds: string[], currentParticipants: EmailAddress[]): PrivacyFilterResult;
    /**
     * Get participant context
     */
    getParticipantContext(email: string): ParticipantContext | undefined;
    /**
     * Get all tracked participants
     */
    getAllParticipants(): EmailAddress[];
    /**
     * Clear all tracking data
     */
    clear(): void;
}
export declare function createPrivacyTracker(): PrivacyTracker;
//# sourceMappingURL=tracker.d.ts.map