import { z } from 'zod'

// ============================================================================
// MCP Server Configuration
// ============================================================================

export const MCPServerConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  args: z.array(z.string()).optional().default([]),
  env: z.record(z.string()).optional(),
})

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>

// ============================================================================
// MCP Tool Types
// ============================================================================

export const MCPToolParameterSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  properties: z.record(z.unknown()).optional(),
})

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(MCPToolParameterSchema).optional(),
    required: z.array(z.string()).optional(),
  }),
})

export type MCPTool = z.infer<typeof MCPToolSchema>

// ============================================================================
// MCP Connection Types
// ============================================================================

export interface MCPConnection {
  serverId: string
  serverName: string
  connected: boolean
  tools: MCPTool[]
  error?: string
}

// ============================================================================
// MCP Tool Invocation Types
// ============================================================================

export const MCPToolInvocationSchema = z.object({
  serverId: z.string(),
  toolName: z.string(),
  arguments: z.record(z.unknown()),
})

export type MCPToolInvocation = z.infer<typeof MCPToolInvocationSchema>

export const MCPToolResultSchema = z.object({
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
})

export type MCPToolResult = z.infer<typeof MCPToolResultSchema>
