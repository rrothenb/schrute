/**
 * SchruteBridge provides Smykowski with access to Schrute's core functionality
 *
 * This module bridges Smykowski to Schrute without modifying Schrute's code.
 * It imports and uses Schrute's existing classes and provides a clean interface.
 */
import type { Email, SpeechAct, QueryRequest, QueryResponse, PersonalityConfig } from '@schrute/lib/types/index.js';
import type { SchruteBridgeContext } from '~/lib/types/index.js';
import { SpeechActStore } from '@schrute/lib/speech-acts/store.js';
import { PrivacyTracker } from '@schrute/lib/privacy/tracker.js';
import { ClaudeClient } from '@schrute/lib/claude/client.js';
/**
 * Configuration for Schrute bridge
 */
export interface SchruteBridgeConfig {
    claudeApiKey: string;
    personalitiesPath?: string;
    contextWindowSize?: number;
}
/**
 * SchruteBridge provides a clean interface to Schrute's core functionality
 */
export declare class SchruteBridge {
    private config;
    private detector;
    private speechActStore;
    private privacyTracker;
    private queryHandler;
    private contextAssembler;
    private activationDecider;
    private memorySummarizer;
    private personalityLoader;
    private claudeClient;
    constructor(config: SchruteBridgeConfig);
    /**
     * Detect speech acts in an email
     */
    detectSpeechActs(email: Email): Promise<SpeechAct[]>;
    /**
     * Get speech acts for a thread
     */
    getSpeechActsByThread(threadId: string): SpeechAct[];
    /**
     * Get speech acts by type
     */
    getSpeechActsByType(type: string): SpeechAct[];
    /**
     * Check if Schrute should respond to an email
     */
    shouldRespond(email: Email, config: any): Promise<{
        should_respond: boolean;
        confidence: number;
        reasons: string[];
    }>;
    /**
     * Handle a query using Schrute's query system
     */
    handleQuery(request: QueryRequest): Promise<QueryResponse>;
    /**
     * Assemble context for a thread with privacy filtering
     */
    assembleContext(threadId: string, participants: string[]): Promise<SchruteBridgeContext>;
    /**
     * Load a personality configuration
     */
    loadPersonality(name: string): Promise<PersonalityConfig>;
    /**
     * Generate a response using Claude with personality
     */
    generateResponse(prompt: string, personality: string): Promise<string>;
    /**
     * Summarize email thread for memory
     */
    summarizeThread(emails: Email[]): Promise<string>;
    /**
     * Check if participants can access information
     */
    canAccess(sourceParticipants: string[], requestingParticipants: string[]): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Track message for privacy
     */
    trackMessage(email: Email): void;
    /**
     * Get Claude client for direct API calls
     */
    getClaudeClient(): ClaudeClient;
    /**
     * Get speech act store for direct access
     */
    getSpeechActStore(): SpeechActStore;
    /**
     * Get privacy tracker for direct access
     */
    getPrivacyTracker(): PrivacyTracker;
}
//# sourceMappingURL=schrute-bridge.d.ts.map