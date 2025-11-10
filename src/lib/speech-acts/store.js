export class SpeechActStore {
    constructor() {
        this.acts = new Map();
    }
    /**
     * Add a speech act to the store
     */
    add(act) {
        this.acts.set(act.id, act);
    }
    /**
     * Add multiple speech acts
     */
    addMany(acts) {
        for (const act of acts) {
            this.add(act);
        }
    }
    /**
     * Get a speech act by ID
     */
    get(id) {
        return this.acts.get(id);
    }
    /**
     * Query speech acts
     */
    query(query = {}) {
        let results = Array.from(this.acts.values());
        if (query.type) {
            results = results.filter((act) => act.type === query.type);
        }
        if (query.threadId) {
            results = results.filter((act) => act.thread_id === query.threadId);
        }
        if (query.participantEmail) {
            results = results.filter((act) => act.participants.some((p) => p.email === query.participantEmail));
        }
        if (query.afterTimestamp) {
            const after = new Date(query.afterTimestamp);
            results = results.filter((act) => new Date(act.timestamp) >= after);
        }
        if (query.beforeTimestamp) {
            const before = new Date(query.beforeTimestamp);
            results = results.filter((act) => new Date(act.timestamp) <= before);
        }
        if (query.minConfidence !== undefined) {
            const minConf = query.minConfidence;
            results = results.filter((act) => act.confidence >= minConf);
        }
        // Sort by timestamp (newest first)
        return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    /**
     * Get all speech acts
     */
    getAll() {
        return Array.from(this.acts.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    /**
     * Get speech acts by type
     */
    getByType(type) {
        return this.query({ type });
    }
    /**
     * Get speech acts for a thread
     */
    getByThread(threadId) {
        return this.query({ threadId });
    }
    /**
     * Get speech acts visible to a participant
     */
    getVisibleTo(participant) {
        return Array.from(this.acts.values()).filter((act) => act.participants.some((p) => p.email === participant.email));
    }
    /**
     * Clear all speech acts
     */
    clear() {
        this.acts.clear();
    }
    /**
     * Get count of speech acts
     */
    count() {
        return this.acts.size;
    }
    /**
     * Serialize to JSON
     */
    toJSON() {
        return this.getAll();
    }
    /**
     * Load from JSON
     */
    fromJSON(acts) {
        this.clear();
        this.addMany(acts);
    }
}
export function createSpeechActStore() {
    return new SpeechActStore();
}
//# sourceMappingURL=store.js.map