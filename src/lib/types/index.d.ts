import { z } from 'zod';
export declare const EmailAddressSchema: any;
export type EmailAddress = z.infer<typeof EmailAddressSchema>;
export declare const EmailSchema: any;
export type Email = z.infer<typeof EmailSchema>;
export declare const EmailThreadSchema: any;
export type EmailThread = z.infer<typeof EmailThreadSchema>;
/**
 * Message type for storage layer (DynamoDB)
 * Simpler than Email type for database efficiency
 */
export interface Message {
    message_id: string;
    thread_id: string;
    from_email: string;
    from_name?: string;
    to: string[];
    cc?: string[];
    subject: string;
    timestamp: string;
    in_reply_to?: string;
    s3_key?: string;
    participants: string[];
}
/**
 * Thread metadata for storage layer
 */
export interface Thread {
    thread_id: string;
    subject: string;
    participants: string[];
    created_at: string;
    updated_at: string;
    message_count: number;
    last_message_id?: string;
}
export declare enum SpeechActType {
    REQUEST = "request",
    QUESTION = "question",
    COMMITMENT = "commitment",
    DECISION = "decision",
    STATEMENT = "statement",
    GREETING = "greeting",
    ACKNOWLEDGMENT = "acknowledgment",
    SUGGESTION = "suggestion",
    OBJECTION = "objection",
    AGREEMENT = "agreement"
}
export declare const SpeechActSchema: any;
export type SpeechAct = z.infer<typeof SpeechActSchema>;
export declare const ParticipantContextSchema: any;
export type ParticipantContext = z.infer<typeof ParticipantContextSchema>;
export declare const PrivacyFilterResultSchema: any;
export type PrivacyFilterResult = z.infer<typeof PrivacyFilterResultSchema>;
export declare const PersonalityConfigSchema: any;
export type PersonalityConfig = z.infer<typeof PersonalityConfigSchema>;
export declare enum KnowledgeCategory {
    DECISION = "decision",
    COMMITMENT = "commitment",
    PROJECT_INFO = "project_info",
    PERSON = "person",
    PREFERENCE = "preference",
    OTHER = "other"
}
export declare const KnowledgeEntrySchema: any;
export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;
export declare const SchruteConfigSchema: any;
export type SchruteConfig = z.infer<typeof SchruteConfigSchema>;
export declare const EmailSummarySchema: any;
export type EmailSummary = z.infer<typeof EmailSummarySchema>;
export declare const MemoryContextSchema: any;
export type MemoryContext = z.infer<typeof MemoryContextSchema>;
export declare const QueryRequestSchema: any;
export type QueryRequest = z.infer<typeof QueryRequestSchema>;
export declare const QueryResponseSchema: any;
export type QueryResponse = z.infer<typeof QueryResponseSchema>;
export declare const ActivationDecisionSchema: any;
export type ActivationDecision = z.infer<typeof ActivationDecisionSchema>;
export declare const DynamicSkillSchema: any;
export type DynamicSkill = z.infer<typeof DynamicSkillSchema>;
//# sourceMappingURL=index.d.ts.map