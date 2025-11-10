import { SpeechAct, SpeechActType, EmailAddress } from '~/lib/types/index.js';
export interface SpeechActQuery {
    type?: SpeechActType;
    threadId?: string;
    participantEmail?: string;
    afterTimestamp?: string;
    beforeTimestamp?: string;
    minConfidence?: number;
}
export declare class SpeechActStore {
    private acts;
    /**
     * Add a speech act to the store
     */
    add(act: SpeechAct): void;
    /**
     * Add multiple speech acts
     */
    addMany(acts: SpeechAct[]): void;
    /**
     * Get a speech act by ID
     */
    get(id: string): SpeechAct | undefined;
    /**
     * Query speech acts
     */
    query(query?: SpeechActQuery): SpeechAct[];
    /**
     * Get all speech acts
     */
    getAll(): SpeechAct[];
    /**
     * Get speech acts by type
     */
    getByType(type: SpeechActType): SpeechAct[];
    /**
     * Get speech acts for a thread
     */
    getByThread(threadId: string): SpeechAct[];
    /**
     * Get speech acts visible to a participant
     */
    getVisibleTo(participant: EmailAddress): SpeechAct[];
    /**
     * Clear all speech acts
     */
    clear(): void;
    /**
     * Get count of speech acts
     */
    count(): number;
    /**
     * Serialize to JSON
     */
    toJSON(): SpeechAct[];
    /**
     * Load from JSON
     */
    fromJSON(acts: SpeechAct[]): void;
}
export declare function createSpeechActStore(): SpeechActStore;
//# sourceMappingURL=store.d.ts.map