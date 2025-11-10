import { Email, SpeechAct } from '~/lib/types/index.js';
export declare class SpeechActDetector {
    private client;
    /**
     * Detect all speech acts in an email
     */
    detectSpeechActs(email: Email): Promise<SpeechAct[]>;
    /**
     * Detect speech acts for multiple emails
     */
    detectSpeechActsBatch(emails: Email[]): Promise<SpeechAct[]>;
    private formatEmailAddress;
    private mapSpeechActType;
}
export declare function createSpeechActDetector(): SpeechActDetector;
//# sourceMappingURL=detector.d.ts.map