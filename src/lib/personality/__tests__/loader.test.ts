import { describe, it, expect, beforeAll } from '@jest/globals'
import { createPersonalityLoader } from '../loader.js'
import { resolve } from 'path'

describe('Personality Loader', () => {
  let loader: ReturnType<typeof createPersonalityLoader>

  beforeAll(async () => {
    loader = createPersonalityLoader()
    // Load personalities from the actual personalities directory
    const personalitiesDir = resolve(process.cwd(), 'personalities')
    try {
      await loader.loadFromDirectory(personalitiesDir)
    } catch (error) {
      // If directory doesn't exist or is empty, that's ok for these tests
      console.log('Note: Personalities directory not found or empty')
    }
  })

  describe('default personality', () => {
    it('should have a default personality', () => {
      const defaultPersonality = loader.getDefault()
      expect(defaultPersonality).toBeDefined()
      expect(defaultPersonality.name).toBe('default')
      expect(defaultPersonality.tone).toBeDefined()
      expect(defaultPersonality.speaking_style).toBeDefined()
    })

    it('should return default when getting default by name', () => {
      const byName = loader.get('default')
      const defaultPersonality = loader.getDefault()
      expect(byName).toEqual(defaultPersonality)
    })
  })

  describe('available personalities', () => {
    it('should list available personalities', () => {
      const available = loader.getAvailablePersonalities()
      expect(available).toContain('default')
      expect(available.length).toBeGreaterThan(0)
    })

    it('should return undefined for non-existent personality', () => {
      const loaded = loader.get('definitely-does-not-exist')
      expect(loaded).toBeUndefined()
    })
  })

  describe('personality properties', () => {
    it('should have required fields', () => {
      const personality = loader.getDefault()

      expect(personality.name).toBeDefined()
      expect(personality.tone).toBeDefined()
      expect(personality.speaking_style).toBeDefined()
      expect(Array.isArray(personality.constraints)).toBe(true)
      expect(Array.isArray(personality.example_phrases)).toBe(true)
    })

    it('should have constraints and example_phrases as arrays', () => {
      const personality = loader.getDefault()

      // These should be arrays, even if empty
      expect(Array.isArray(personality.constraints)).toBe(true)
      expect(Array.isArray(personality.example_phrases)).toBe(true)
    })
  })
})
