import { z } from 'zod'
import { KnowledgeCategory, EmailAddressSchema } from '~/lib/types/index.js'

// ============================================================================
// Knowledge Store Request Types
// ============================================================================

export const StoreKnowledgeRequestSchema = z.object({
  category: z.nativeEnum(KnowledgeCategory),
  title: z.string(),
  content: z.string(),
  source_message_ids: z.array(z.string()).optional().default([]),
  participants: z.array(EmailAddressSchema).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
})

export type StoreKnowledgeRequest = z.infer<typeof StoreKnowledgeRequestSchema>

export const RetrieveKnowledgeRequestSchema = z.object({
  id: z.string(),
})

export type RetrieveKnowledgeRequest = z.infer<
  typeof RetrieveKnowledgeRequestSchema
>

export const SearchKnowledgeRequestSchema = z.object({
  query: z.string(),
  category: z.nativeEnum(KnowledgeCategory).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().optional().default(10),
})

export type SearchKnowledgeRequest = z.infer<typeof SearchKnowledgeRequestSchema>

export const ListEntriesRequestSchema = z.object({
  category: z.nativeEnum(KnowledgeCategory).optional(),
  limit: z.number().optional().default(50),
})

export type ListEntriesRequest = z.infer<typeof ListEntriesRequestSchema>

export const DeleteKnowledgeRequestSchema = z.object({
  id: z.string(),
})

export type DeleteKnowledgeRequest = z.infer<typeof DeleteKnowledgeRequestSchema>

// ============================================================================
// Knowledge File Format (for markdown frontmatter)
// ============================================================================

export interface KnowledgeFileMetadata {
  id: string
  category: KnowledgeCategory
  title: string
  source_message_ids: string[]
  participants: Array<{ email: string; name?: string }>
  created_at: string
  updated_at: string
  tags: string[]
}

export interface KnowledgeFile {
  metadata: KnowledgeFileMetadata
  content: string
}
