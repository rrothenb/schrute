import { describe, it, expect } from '@jest/globals'
import {
  MCPServerConfigSchema,
  MCPToolSchema,
  MCPToolInvocationSchema,
  MCPToolResultSchema,
} from '../types.js'

describe('MCP Types', () => {
  describe('MCPServerConfigSchema', () => {
    it('should validate valid server config', () => {
      const config = {
        name: 'test-server',
        command: 'node',
        args: ['server.js'],
        env: { KEY: 'value' },
      }

      const result = MCPServerConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should validate config without optional fields', () => {
      const config = {
        name: 'test-server',
        command: 'node',
      }

      const result = MCPServerConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.args).toEqual([])
      }
    })

    it('should reject config without required fields', () => {
      const config = {
        name: 'test-server',
      }

      const result = MCPServerConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })

  describe('MCPToolSchema', () => {
    it('should validate valid tool schema', () => {
      const tool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object' as const,
          properties: {
            param1: {
              type: 'string',
              description: 'First parameter',
            },
          },
          required: ['param1'],
        },
      }

      const result = MCPToolSchema.safeParse(tool)
      expect(result.success).toBe(true)
    })

    it('should validate tool without optional fields', () => {
      const tool = {
        name: 'test_tool',
        inputSchema: {
          type: 'object' as const,
        },
      }

      const result = MCPToolSchema.safeParse(tool)
      expect(result.success).toBe(true)
    })
  })

  describe('MCPToolInvocationSchema', () => {
    it('should validate valid invocation', () => {
      const invocation = {
        serverId: 'server-1',
        toolName: 'test_tool',
        arguments: {
          param1: 'value1',
          param2: 123,
        },
      }

      const result = MCPToolInvocationSchema.safeParse(invocation)
      expect(result.success).toBe(true)
    })

    it('should validate invocation with empty arguments', () => {
      const invocation = {
        serverId: 'server-1',
        toolName: 'test_tool',
        arguments: {},
      }

      const result = MCPToolInvocationSchema.safeParse(invocation)
      expect(result.success).toBe(true)
    })

    it('should reject invocation without required fields', () => {
      const invocation = {
        serverId: 'server-1',
      }

      const result = MCPToolInvocationSchema.safeParse(invocation)
      expect(result.success).toBe(false)
    })
  })

  describe('MCPToolResultSchema', () => {
    it('should validate successful result', () => {
      const result = {
        success: true,
        result: { data: 'some data' },
      }

      const parsed = MCPToolResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })

    it('should validate error result', () => {
      const result = {
        success: false,
        error: 'Something went wrong',
      }

      const parsed = MCPToolResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })

    it('should validate result with only success field', () => {
      const result = {
        success: true,
      }

      const parsed = MCPToolResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })

    it('should reject result without success field', () => {
      const result = {
        result: 'some data',
      }

      const parsed = MCPToolResultSchema.safeParse(result)
      expect(parsed.success).toBe(false)
    })
  })
})
