import { Email, ActivationDecision, SchruteConfig, EmailThread } from '~/lib/types/index.js';
interface ActivationContext {
    email: Email;
    threadHistory?: Email[];
    schruteConfig: SchruteConfig;
}
export declare class ActivationDecider {
    private client;
    /**
     * Decide whether Schrute should respond to an email
     */
    shouldRespond(context: ActivationContext): Promise<ActivationDecision>;
    /**
     * Decide for multiple emails
     */
    shouldRespondBatch(emails: Email[], schruteConfig: SchruteConfig, threads?: Map<string, EmailThread>): Promise<Map<string, ActivationDecision>>;
}
export declare function createActivationDecider(): ActivationDecider;
export {};
//# sourceMappingURL=decider.d.ts.map