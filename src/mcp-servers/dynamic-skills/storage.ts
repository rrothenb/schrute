import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve } from 'path'
import { randomUUID } from 'crypto'
import {
  StoredSkill,
  CreateSkillRequest,
  UpdateSkillRequest,
} from './types.js'

/**
 * Skills Storage Manager
 * Manages JSON file storage for dynamic skills
 */
export class SkillsStorage {
  private skillsFile: string
  private skills: Map<string, StoredSkill> = new Map()
  private initialized = false

  constructor(skillsDir: string = 'skills') {
    const dir = resolve(skillsDir)
    this.skillsFile = resolve(dir, 'skills.json')
  }

  /**
   * Initialize storage (load skills from file)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Ensure directory exists
      const dir = this.skillsFile.substring(0, this.skillsFile.lastIndexOf('/'))
      await mkdir(dir, { recursive: true })

      // Try to load existing skills
      try {
        const data = await readFile(this.skillsFile, 'utf-8')
        const skills = JSON.parse(data) as StoredSkill[]

        for (const skill of skills) {
          this.skills.set(skill.id, skill)
        }
      } catch (error) {
        // File doesn't exist yet, start with empty skills
        await this.save()
      }

      this.initialized = true
    } catch (error) {
      throw new Error(`Failed to initialize skills storage: ${error}`)
    }
  }

  /**
   * Create a new skill
   */
  async create(request: CreateSkillRequest): Promise<StoredSkill> {
    await this.ensureInitialized()

    const id = randomUUID()
    const now = new Date().toISOString()

    const skill: StoredSkill = {
      id,
      name: request.name,
      description: request.description,
      prompt_template: request.prompt_template,
      input_placeholders: request.input_placeholders,
      created_at: now,
      updated_at: now,
    }

    this.skills.set(id, skill)
    await this.save()

    return skill
  }

  /**
   * Get a skill by ID
   */
  async get(id: string): Promise<StoredSkill | null> {
    await this.ensureInitialized()
    return this.skills.get(id) || null
  }

  /**
   * Get a skill by name
   */
  async getByName(name: string): Promise<StoredSkill | null> {
    await this.ensureInitialized()

    for (const skill of this.skills.values()) {
      if (skill.name === name) {
        return skill
      }
    }

    return null
  }

  /**
   * List all skills
   */
  async list(): Promise<StoredSkill[]> {
    await this.ensureInitialized()
    return Array.from(this.skills.values())
  }

  /**
   * Update a skill
   */
  async update(request: UpdateSkillRequest): Promise<StoredSkill | null> {
    await this.ensureInitialized()

    const existing = this.skills.get(request.id)
    if (!existing) {
      return null
    }

    const updated: StoredSkill = {
      ...existing,
      name: request.name ?? existing.name,
      description: request.description ?? existing.description,
      prompt_template: request.prompt_template ?? existing.prompt_template,
      input_placeholders:
        request.input_placeholders ?? existing.input_placeholders,
      updated_at: new Date().toISOString(),
    }

    this.skills.set(request.id, updated)
    await this.save()

    return updated
  }

  /**
   * Delete a skill
   */
  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized()

    if (!this.skills.has(id)) {
      return false
    }

    this.skills.delete(id)
    await this.save()

    return true
  }

  /**
   * Save skills to file
   */
  private async save(): Promise<void> {
    const skills = Array.from(this.skills.values())
    await writeFile(this.skillsFile, JSON.stringify(skills, null, 2), 'utf-8')
  }

  /**
   * Ensure storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }
}
