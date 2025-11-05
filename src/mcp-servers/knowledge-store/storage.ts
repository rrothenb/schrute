import { readFile, writeFile, readdir, mkdir, unlink } from 'fs/promises'
import { join, resolve } from 'path'
import { randomUUID } from 'crypto'
import yaml from 'yaml'
import {
  KnowledgeFile,
  KnowledgeFileMetadata,
  StoreKnowledgeRequest,
  SearchKnowledgeRequest,
  ListEntriesRequest,
} from './types.js'
import { KnowledgeEntry, KnowledgeCategory } from '~/lib/types/index.js'

/**
 * Knowledge Storage Manager
 * Manages markdown files with YAML frontmatter in the knowledge/ directory
 */
export class KnowledgeStorage {
  private knowledgeDir: string

  constructor(knowledgeDir: string = 'knowledge') {
    this.knowledgeDir = resolve(knowledgeDir)
  }

  /**
   * Initialize storage (create directory if needed)
   */
  async initialize(): Promise<void> {
    try {
      await mkdir(this.knowledgeDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Store a new knowledge entry
   */
  async store(request: StoreKnowledgeRequest): Promise<KnowledgeEntry> {
    const id = randomUUID()
    const now = new Date().toISOString()

    const metadata: KnowledgeFileMetadata = {
      id,
      category: request.category,
      title: request.title,
      source_message_ids: request.source_message_ids || [],
      participants: request.participants || [],
      created_at: now,
      updated_at: now,
      tags: request.tags || [],
    }

    await this.writeKnowledgeFile(id, metadata, request.content)

    return this.metadataToEntry(metadata, request.content)
  }

  /**
   * Retrieve a knowledge entry by ID
   */
  async retrieve(id: string): Promise<KnowledgeEntry | null> {
    try {
      const file = await this.readKnowledgeFile(id)
      return this.metadataToEntry(file.metadata, file.content)
    } catch (error) {
      return null
    }
  }

  /**
   * Update an existing knowledge entry
   */
  async update(
    id: string,
    updates: Partial<StoreKnowledgeRequest>
  ): Promise<KnowledgeEntry | null> {
    const existing = await this.readKnowledgeFile(id)
    if (!existing) {
      return null
    }

    const metadata: KnowledgeFileMetadata = {
      ...existing.metadata,
      title: updates.title ?? existing.metadata.title,
      category: updates.category ?? existing.metadata.category,
      source_message_ids:
        updates.source_message_ids ?? existing.metadata.source_message_ids,
      participants: updates.participants ?? existing.metadata.participants,
      tags: updates.tags ?? existing.metadata.tags,
      updated_at: new Date().toISOString(),
    }

    const content = updates.content ?? existing.content

    await this.writeKnowledgeFile(id, metadata, content)

    return this.metadataToEntry(metadata, content)
  }

  /**
   * Delete a knowledge entry
   */
  async delete(id: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(id)
      await unlink(filePath)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Search knowledge entries
   */
  async search(request: SearchKnowledgeRequest): Promise<KnowledgeEntry[]> {
    const allEntries = await this.listAll(request.category)
    const query = request.query.toLowerCase()

    // Simple text search in title, content, and tags
    const results = allEntries.filter((entry) => {
      const titleMatch = entry.title.toLowerCase().includes(query)
      const contentMatch = entry.content.toLowerCase().includes(query)
      const tagMatch = entry.tags.some((tag) => tag.toLowerCase().includes(query))

      const categoryMatch = request.category
        ? entry.category === request.category
        : true

      const requestTagMatch = request.tags
        ? request.tags.some((tag) => entry.tags.includes(tag))
        : true

      return (titleMatch || contentMatch || tagMatch) && categoryMatch && requestTagMatch
    })

    // Sort by updated_at (most recent first)
    results.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    return results.slice(0, request.limit || 10)
  }

  /**
   * List entries (optionally filtered by category)
   */
  async list(request: ListEntriesRequest): Promise<KnowledgeEntry[]> {
    const entries = await this.listAll(request.category)

    // Sort by updated_at (most recent first)
    entries.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    return entries.slice(0, request.limit || 50)
  }

  /**
   * List all entries (optionally filtered by category)
   */
  private async listAll(
    category?: KnowledgeCategory
  ): Promise<KnowledgeEntry[]> {
    try {
      const files = await readdir(this.knowledgeDir)
      const mdFiles = files.filter((f) => f.endsWith('.md'))

      const entries: KnowledgeEntry[] = []

      for (const file of mdFiles) {
        const id = file.replace('.md', '')
        try {
          const knowledgeFile = await this.readKnowledgeFile(id)
          const entry = this.metadataToEntry(
            knowledgeFile.metadata,
            knowledgeFile.content
          )

          if (!category || entry.category === category) {
            entries.push(entry)
          }
        } catch (error) {
          // Skip invalid files
          console.error(`Failed to read knowledge file ${file}:`, error)
        }
      }

      return entries
    } catch (error) {
      return []
    }
  }

  /**
   * Read a knowledge file with frontmatter
   */
  private async readKnowledgeFile(id: string): Promise<KnowledgeFile> {
    const filePath = this.getFilePath(id)
    const fileContent = await readFile(filePath, 'utf-8')

    // Parse frontmatter (YAML between --- delimiters)
    const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

    if (!match) {
      throw new Error(`Invalid knowledge file format: ${id}`)
    }

    const frontmatter = yaml.parse(match[1])
    const content = match[2].trim()

    return {
      metadata: frontmatter as KnowledgeFileMetadata,
      content,
    }
  }

  /**
   * Write a knowledge file with frontmatter
   */
  private async writeKnowledgeFile(
    id: string,
    metadata: KnowledgeFileMetadata,
    content: string
  ): Promise<void> {
    const filePath = this.getFilePath(id)

    const frontmatter = yaml.stringify(metadata)
    const fileContent = `---\n${frontmatter}---\n${content}\n`

    await writeFile(filePath, fileContent, 'utf-8')
  }

  /**
   * Get the file path for a knowledge entry
   */
  private getFilePath(id: string): string {
    return join(this.knowledgeDir, `${id}.md`)
  }

  /**
   * Convert metadata + content to KnowledgeEntry
   */
  private metadataToEntry(
    metadata: KnowledgeFileMetadata,
    content: string
  ): KnowledgeEntry {
    return {
      id: metadata.id,
      category: metadata.category,
      title: metadata.title,
      content,
      source_message_ids: metadata.source_message_ids,
      participants: metadata.participants,
      created_at: metadata.created_at,
      updated_at: metadata.updated_at,
      tags: metadata.tags,
    }
  }
}
