import { z } from 'zod'

// ============================================================================
// Skill Storage Types
// ============================================================================

export const SkillPlaceholderSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean().default(true),
})

export type SkillPlaceholder = z.infer<typeof SkillPlaceholderSchema>

export const StoredSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  prompt_template: z.string(),
  input_placeholders: z.array(SkillPlaceholderSchema),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type StoredSkill = z.infer<typeof StoredSkillSchema>

// ============================================================================
// Skill Request Types
// ============================================================================

export const CreateSkillRequestSchema = z.object({
  name: z.string(),
  description: z.string(),
  prompt_template: z.string(),
  input_placeholders: z.array(SkillPlaceholderSchema),
})

export type CreateSkillRequest = z.infer<typeof CreateSkillRequestSchema>

export const UpdateSkillRequestSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  prompt_template: z.string().optional(),
  input_placeholders: z.array(SkillPlaceholderSchema).optional(),
})

export type UpdateSkillRequest = z.infer<typeof UpdateSkillRequestSchema>

export const DeleteSkillRequestSchema = z.object({
  id: z.string(),
})

export type DeleteSkillRequest = z.infer<typeof DeleteSkillRequestSchema>

export const InvokeSkillRequestSchema = z.object({
  skill_id: z.string(),
  arguments: z.record(z.string()),
})

export type InvokeSkillRequest = z.infer<typeof InvokeSkillRequestSchema>

// ============================================================================
// Skill Invocation Result
// ============================================================================

export const SkillInvocationResultSchema = z.object({
  success: z.boolean(),
  result: z.string().optional(),
  error: z.string().optional(),
})

export type SkillInvocationResult = z.infer<typeof SkillInvocationResultSchema>
