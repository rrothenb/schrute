import { z } from 'zod';
// ============================================================================
// Email Types
// ============================================================================
export const EmailAddressSchema = z.object({
    email: z.string().email(),
    name: z.string().optional(),
});
export const EmailSchema = z.object({
    message_id: z.string(),
    thread_id: z.string(),
    from: EmailAddressSchema,
    to: z.array(EmailAddressSchema),
    cc: z.array(EmailAddressSchema).optional().default([]),
    subject: z.string(),
    body: z.string(),
    timestamp: z.string().datetime(),
    in_reply_to: z.string().optional(),
});
export const EmailThreadSchema = z.object({
    thread_id: z.string(),
    subject: z.string(),
    messages: z.array(EmailSchema),
    participants: z.array(EmailAddressSchema),
});
// ============================================================================
// Speech Act Types
// ============================================================================
export var SpeechActType;
(function (SpeechActType) {
    SpeechActType["REQUEST"] = "request";
    SpeechActType["QUESTION"] = "question";
    SpeechActType["COMMITMENT"] = "commitment";
    SpeechActType["DECISION"] = "decision";
    SpeechActType["STATEMENT"] = "statement";
    SpeechActType["GREETING"] = "greeting";
    SpeechActType["ACKNOWLEDGMENT"] = "acknowledgment";
    SpeechActType["SUGGESTION"] = "suggestion";
    SpeechActType["OBJECTION"] = "objection";
    SpeechActType["AGREEMENT"] = "agreement";
})(SpeechActType || (SpeechActType = {}));
export const SpeechActSchema = z.object({
    id: z.string(),
    type: z.nativeEnum(SpeechActType),
    content: z.string(),
    actor: EmailAddressSchema,
    participants: z.array(EmailAddressSchema), // Who can see this
    confidence: z.number().min(0).max(1),
    source_message_id: z.string(),
    thread_id: z.string(),
    timestamp: z.string().datetime(),
    metadata: z.record(z.unknown()).optional(),
});
// ============================================================================
// Privacy & Participant Types
// ============================================================================
export const ParticipantContextSchema = z.object({
    participant: EmailAddressSchema,
    accessible_messages: z.array(z.string()), // message_ids
    accessible_speech_acts: z.array(z.string()), // speech_act ids
    first_seen: z.string().datetime(),
});
export const PrivacyFilterResultSchema = z.object({
    allowed: z.boolean(),
    reason: z.string().optional(),
    restricted_participants: z.array(EmailAddressSchema).optional(),
});
// ============================================================================
// Personality Types
// ============================================================================
export const PersonalityConfigSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    tone: z.string(),
    speaking_style: z.string(),
    constraints: z.array(z.string()).optional().default([]),
    example_phrases: z.array(z.string()).optional().default([]),
    system_prompt_additions: z.string().optional(),
});
// ============================================================================
// Knowledge Store Types
// ============================================================================
export var KnowledgeCategory;
(function (KnowledgeCategory) {
    KnowledgeCategory["DECISION"] = "decision";
    KnowledgeCategory["COMMITMENT"] = "commitment";
    KnowledgeCategory["PROJECT_INFO"] = "project_info";
    KnowledgeCategory["PERSON"] = "person";
    KnowledgeCategory["PREFERENCE"] = "preference";
    KnowledgeCategory["OTHER"] = "other";
})(KnowledgeCategory || (KnowledgeCategory = {}));
export const KnowledgeEntrySchema = z.object({
    id: z.string(),
    category: z.nativeEnum(KnowledgeCategory),
    title: z.string(),
    content: z.string(),
    source_message_ids: z.array(z.string()),
    participants: z.array(EmailAddressSchema), // Privacy: who can access this
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    tags: z.array(z.string()).optional().default([]),
});
// ============================================================================
// Configuration Types
// ============================================================================
export const SchruteConfigSchema = z.object({
    name: z.string().default('Schrute'),
    aliases: z.array(z.string()).optional().default([]),
    email: EmailAddressSchema,
    personality: z.string().default('default'),
    areas_of_responsibility: z.array(z.string()).optional().default([]),
    expertise_keywords: z.array(z.string()).optional().default([]),
});
// ============================================================================
// Memory Types
// ============================================================================
export const EmailSummarySchema = z.object({
    thread_id: z.string(),
    summary: z.string(),
    key_points: z.array(z.string()),
    participants: z.array(EmailAddressSchema),
    message_ids: z.array(z.string()),
    created_at: z.string().datetime(),
});
export const MemoryContextSchema = z.object({
    recent_messages: z.array(EmailSchema),
    summaries: z.array(EmailSummarySchema),
    relevant_speech_acts: z.array(SpeechActSchema),
    relevant_knowledge: z.array(KnowledgeEntrySchema),
});
// ============================================================================
// Query Types
// ============================================================================
export const QueryRequestSchema = z.object({
    query: z.string(),
    thread_id: z.string().optional(),
    asker: EmailAddressSchema,
    context_participants: z.array(EmailAddressSchema), // Who else is in this conversation
});
export const QueryResponseSchema = z.object({
    answer: z.string(),
    sources: z.array(z.string()), // message_ids or knowledge_entry ids
    privacy_restricted: z.boolean(),
    restricted_info: z.string().optional(),
    confidence: z.enum(['high', 'medium', 'low', 'unable']).optional(), // How confident in the answer
    suggested_skill_name: z.string().optional(), // Suggested skill name if unable to answer
});
// ============================================================================
// Activation Types
// ============================================================================
export const ActivationDecisionSchema = z.object({
    should_respond: z.boolean(),
    confidence: z.number().min(0).max(1),
    reasons: z.array(z.string()),
});
// ============================================================================
// MCP Types
// ============================================================================
export const DynamicSkillSchema = z.object({
    name: z.string(),
    description: z.string(),
    prompt_template: z.string(),
    input_placeholders: z.array(z.object({
        name: z.string(),
        description: z.string(),
        required: z.boolean().default(true),
    })),
    created_at: z.string().datetime(),
});
//# sourceMappingURL=index.js.map