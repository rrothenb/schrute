import { describe, it, expect } from '@jest/globals'
import { SkillInvoker } from '../invoker.js'
import { StoredSkill } from '../types.js'

/**
 * Live API Tests for Dynamic Skills Invoker
 *
 * These tests make actual calls to the Anthropic Claude API.
 * They are skipped if CLAUDE_API_KEY is not set.
 *
 * To run these tests:
 *   export CLAUDE_API_KEY=sk-ant-...
 *   npm test -- invoker.live.test.ts
 *
 * Estimated API costs per test run: ~$0.05-0.10
 */

const hasApiKey = !!process.env.CLAUDE_API_KEY
const describeIfApiKey = hasApiKey ? describe : describe.skip

describeIfApiKey('Dynamic Skills Invoker - Live API Tests', () => {
  it('should invoke a simple skill with one placeholder', async () => {
    const invoker = new SkillInvoker()

    const skill: StoredSkill = {
      id: 'test-skill-001',
      name: 'greeting-generator',
      description: 'Generates a friendly greeting',
      prompt_template: 'Generate a friendly greeting for {{name}}.',
      input_placeholders: [
        {
          name: 'name',
          description: 'The name to greet',
          required: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await invoker.invoke(skill, { name: 'Alice' })

    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()
    expect(result.result!.length).toBeGreaterThan(0)
    expect(result.result!.toLowerCase()).toContain('alice')
    expect(result.error).toBeUndefined()
  }, 30000)

  it('should invoke a skill with multiple placeholders', async () => {
    const invoker = new SkillInvoker()

    const skill: StoredSkill = {
      id: 'test-skill-002',
      name: 'email-composer',
      description: 'Composes a professional email',
      prompt_template:
        'Compose a professional email to {{recipient}} about {{topic}}. Keep it brief.',
      input_placeholders: [
        {
          name: 'recipient',
          description: 'Email recipient name',
          required: true,
        },
        {
          name: 'topic',
          description: 'Email topic',
          required: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await invoker.invoke(skill, {
      recipient: 'Bob',
      topic: 'project status update',
    })

    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()
    expect(result.result!.length).toBeGreaterThan(20)
    // Should mention the recipient and topic
    const lowerResult = result.result!.toLowerCase()
    expect(lowerResult.includes('bob') || lowerResult.includes('recipient')).toBe(true)
    expect(lowerResult.includes('project') || lowerResult.includes('status')).toBe(true)
  }, 30000)

  it('should handle missing required arguments', async () => {
    const invoker = new SkillInvoker()

    const skill: StoredSkill = {
      id: 'test-skill-003',
      name: 'summarizer',
      description: 'Summarizes text',
      prompt_template: 'Summarize: {{text}}',
      input_placeholders: [
        {
          name: 'text',
          description: 'Text to summarize',
          required: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await invoker.invoke(skill, {}) // Missing 'text'

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error).toContain('Missing required arguments')
    expect(result.error).toContain('text')
  })

  it('should handle optional arguments', async () => {
    const invoker = new SkillInvoker()

    const skill: StoredSkill = {
      id: 'test-skill-004',
      name: 'formatter',
      description: 'Formats text with optional style',
      prompt_template: 'Format this text {{style}}: {{content}}',
      input_placeholders: [
        {
          name: 'content',
          description: 'Content to format',
          required: true,
        },
        {
          name: 'style',
          description: 'Formatting style',
          required: false,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Invoke with only required argument
    const result = await invoker.invoke(skill, {
      content: 'Hello world',
    })

    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()
    expect(result.result!.length).toBeGreaterThan(0)
  }, 30000)

  it('should handle complex prompts with detailed instructions', async () => {
    const invoker = new SkillInvoker()

    const skill: StoredSkill = {
      id: 'test-skill-005',
      name: 'code-reviewer',
      description: 'Reviews code and provides feedback',
      prompt_template: `Review the following {{language}} code and provide feedback on:
1. Code quality
2. Potential bugs
3. Performance issues

Code:
{{code}}

Keep the review concise (3-5 points).`,
      input_placeholders: [
        {
          name: 'language',
          description: 'Programming language',
          required: true,
        },
        {
          name: 'code',
          description: 'Code to review',
          required: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await invoker.invoke(skill, {
      language: 'JavaScript',
      code: 'function add(a, b) { return a + b }',
    })

    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()
    expect(result.result!.length).toBeGreaterThan(50)
    // Should contain some review-related keywords
    const lowerResult = result.result!.toLowerCase()
    expect(
      lowerResult.includes('code') ||
        lowerResult.includes('function') ||
        lowerResult.includes('simple')
    ).toBe(true)
  }, 30000)

  it('should handle skills that generate structured output', async () => {
    const invoker = new SkillInvoker()

    const skill: StoredSkill = {
      id: 'test-skill-006',
      name: 'task-breaker',
      description: 'Breaks down a task into steps',
      prompt_template:
        'Break down this task into 3-5 actionable steps: {{task}}. Format as a numbered list.',
      input_placeholders: [
        {
          name: 'task',
          description: 'Task to break down',
          required: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await invoker.invoke(skill, {
      task: 'Deploy a web application to production',
    })

    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()
    expect(result.result!.length).toBeGreaterThan(50)
    // Should contain numbered steps or list markers
    const resultText = result.result!
    expect(
      resultText.includes('1') ||
        resultText.includes('2') ||
        resultText.includes('•') ||
        resultText.includes('-')
    ).toBe(true)
  }, 30000)

  it('should handle skills with special characters in placeholders', async () => {
    const invoker = new SkillInvoker()

    const skill: StoredSkill = {
      id: 'test-skill-007',
      name: 'json-explainer',
      description: 'Explains JSON structure',
      prompt_template: 'Explain this JSON structure briefly: {{json_data}}',
      input_placeholders: [
        {
          name: 'json_data',
          description: 'JSON data to explain',
          required: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await invoker.invoke(skill, {
      json_data: '{"name": "Alice", "age": 30, "role": "Engineer"}',
    })

    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()
    expect(result.result!.length).toBeGreaterThan(10)
  }, 30000)

  it('should handle skills with long input content', async () => {
    const invoker = new SkillInvoker()

    const skill: StoredSkill = {
      id: 'test-skill-008',
      name: 'text-summarizer',
      description: 'Summarizes long text',
      prompt_template:
        'Provide a one-sentence summary of this text: {{text}}',
      input_placeholders: [
        {
          name: 'text',
          description: 'Text to summarize',
          required: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const longText = `
      The Industrial Revolution was a period of major industrialization and innovation
      that took place during the late 1700s and early 1800s. It began in Great Britain
      and quickly spread throughout the world. The Industrial Revolution saw the
      mechanization of agriculture and textile manufacturing and a revolution in power,
      including steam ships and railroads, that affected social, cultural and economic
      conditions. This period had a profound effect on society, changing the way people
      lived and worked. It led to the rise of factories, urbanization, and new social
      classes. The revolution also brought about significant technological advancements
      that laid the foundation for modern industrial society.
    `

    const result = await invoker.invoke(skill, { text: longText })

    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()
    // Summary should be shorter than original
    expect(result.result!.length).toBeLessThan(longText.length)
    expect(result.result!.length).toBeGreaterThan(20)
  }, 30000)

  it('should handle edge case with empty optional placeholder', async () => {
    const invoker = new SkillInvoker()

    const skill: StoredSkill = {
      id: 'test-skill-009',
      name: 'question-answerer',
      description: 'Answers questions',
      prompt_template: 'Answer this question {{context}}: {{question}}',
      input_placeholders: [
        {
          name: 'question',
          description: 'The question to answer',
          required: true,
        },
        {
          name: 'context',
          description: 'Additional context',
          required: false,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await invoker.invoke(skill, {
      question: 'What is TypeScript?',
      context: '', // Empty optional field
    })

    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()
    expect(result.result!.toLowerCase()).toContain('typescript')
  }, 30000)

  it('should handle concurrent skill invocations', async () => {
    const invoker = new SkillInvoker()

    const skill: StoredSkill = {
      id: 'test-skill-010',
      name: 'sentence-generator',
      description: 'Generates a sentence',
      prompt_template: 'Write a sentence about {{topic}}.',
      input_placeholders: [
        {
          name: 'topic',
          description: 'Topic for the sentence',
          required: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Invoke multiple times concurrently
    const results = await Promise.all([
      invoker.invoke(skill, { topic: 'clouds' }),
      invoker.invoke(skill, { topic: 'ocean' }),
      invoker.invoke(skill, { topic: 'mountains' }),
    ])

    // All should succeed
    results.forEach((result) => {
      expect(result.success).toBe(true)
      expect(result.result).toBeDefined()
      expect(result.result!.length).toBeGreaterThan(0)
    })

    // Results should be different (different topics)
    expect(results[0].result).not.toBe(results[1].result)
    expect(results[1].result).not.toBe(results[2].result)
  }, 60000)
})

if (!hasApiKey) {
  console.log('⚠️  Skipping Dynamic Skills Invoker live API tests - CLAUDE_API_KEY not set')
}
