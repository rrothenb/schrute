import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
  MCPServerConfig,
  MCPConnection,
  MCPTool,
  MCPToolInvocation,
  MCPToolResult,
} from './types.js'

/**
 * MCP Client Manager
 * Manages connections to multiple MCP servers, tool discovery, and invocation
 */
export class MCPClientManager {
  private connections: Map<string, MCPConnection> = new Map()
  private clients: Map<string, Client> = new Map()

  constructor() {
    // Initialize empty
  }

  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig): Promise<void> {
    const serverId = this.generateServerId(config.name)

    if (this.connections.has(serverId)) {
      throw new Error(`Server ${config.name} is already connected`)
    }

    try {
      // Create transport using stdio
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env,
      })

      // Create client
      const client = new Client(
        {
          name: 'schrute-client',
          version: '0.1.0',
        },
        {
          capabilities: {},
        }
      )

      // Connect
      await client.connect(transport)

      // Store client
      this.clients.set(serverId, client)

      // Discover tools
      const tools = await this.discoverTools(serverId, client)

      // Store connection
      const connection: MCPConnection = {
        serverId,
        serverName: config.name,
        connected: true,
        tools,
      }

      this.connections.set(serverId, connection)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      // Store failed connection
      const connection: MCPConnection = {
        serverId,
        serverName: config.name,
        connected: false,
        tools: [],
        error: errorMessage,
      }

      this.connections.set(serverId, connection)
      throw error
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverId: string): Promise<void> {
    const client = this.clients.get(serverId)
    if (client) {
      await client.close()
      this.clients.delete(serverId)
    }

    this.connections.delete(serverId)
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map((serverId) =>
      this.disconnect(serverId)
    )
    await Promise.all(promises)
  }

  /**
   * Discover tools from a connected server
   */
  private async discoverTools(
    serverId: string,
    client: Client
  ): Promise<MCPTool[]> {
    try {
      const response = await client.listTools()

      return response.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as MCPTool['inputSchema'],
      }))
    } catch (error) {
      console.error(`Failed to discover tools for ${serverId}:`, error)
      return []
    }
  }

  /**
   * Refresh tools for a specific server
   */
  async refreshTools(serverId: string): Promise<MCPTool[]> {
    const client = this.clients.get(serverId)
    const connection = this.connections.get(serverId)

    if (!client || !connection) {
      throw new Error(`Server ${serverId} is not connected`)
    }

    const tools = await this.discoverTools(serverId, client)

    // Update connection
    connection.tools = tools
    this.connections.set(serverId, connection)

    return tools
  }

  /**
   * Get all connected servers
   */
  getConnections(): MCPConnection[] {
    return Array.from(this.connections.values())
  }

  /**
   * Get a specific connection
   */
  getConnection(serverId: string): MCPConnection | undefined {
    return this.connections.get(serverId)
  }

  /**
   * Get all available tools across all connected servers
   */
  getAllTools(): Array<MCPTool & { serverId: string; serverName: string }> {
    const tools: Array<MCPTool & { serverId: string; serverName: string }> = []

    for (const connection of this.connections.values()) {
      if (connection.connected) {
        for (const tool of connection.tools) {
          tools.push({
            ...tool,
            serverId: connection.serverId,
            serverName: connection.serverName,
          })
        }
      }
    }

    return tools
  }

  /**
   * Find a tool by name (searches all servers)
   */
  findTool(
    toolName: string
  ): (MCPTool & { serverId: string; serverName: string }) | undefined {
    const allTools = this.getAllTools()
    return allTools.find((tool) => tool.name === toolName)
  }

  /**
   * Invoke a tool on a specific server
   */
  async invokeTool(invocation: MCPToolInvocation): Promise<MCPToolResult> {
    const { serverId, toolName, arguments: args } = invocation

    const client = this.clients.get(serverId)
    const connection = this.connections.get(serverId)

    if (!client || !connection || !connection.connected) {
      return {
        success: false,
        error: `Server ${serverId} is not connected`,
      }
    }

    // Check if tool exists
    const tool = connection.tools.find((t) => t.name === toolName)
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not found on server ${serverId}`,
      }
    }

    try {
      const response = await client.callTool({
        name: toolName,
        arguments: args,
      })

      return {
        success: true,
        result: response,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Invoke a tool by name (automatically finds the server)
   */
  async invokeToolByName(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    const tool = this.findTool(toolName)

    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not found on any connected server`,
      }
    }

    return this.invokeTool({
      serverId: tool.serverId,
      toolName,
      arguments: args,
    })
  }

  /**
   * Generate a unique server ID from a name
   */
  private generateServerId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-')
  }
}

// Singleton instance
let mcpClientManagerInstance: MCPClientManager | null = null

/**
 * Get the singleton MCP Client Manager instance
 */
export function getMCPClientManager(): MCPClientManager {
  if (!mcpClientManagerInstance) {
    mcpClientManagerInstance = new MCPClientManager()
  }
  return mcpClientManagerInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetMCPClientManager(): void {
  if (mcpClientManagerInstance) {
    mcpClientManagerInstance.disconnectAll().catch(console.error)
    mcpClientManagerInstance = null
  }
}
