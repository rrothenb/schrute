#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { KnowledgeStorage } from './storage.js'
import {
  StoreKnowledgeRequestSchema,
  RetrieveKnowledgeRequestSchema,
  SearchKnowledgeRequestSchema,
  ListEntriesRequestSchema,
  DeleteKnowledgeRequestSchema,
} from './types.js'
import { KnowledgeCategory } from '~/lib/types/index.js'

/**
 * Knowledge Store MCP Server
 * Provides tools for storing and retrieving knowledge entries in markdown format
 */
class KnowledgeStoreMCPServer {
  private server: Server
  private storage: KnowledgeStorage

  constructor() {
    this.storage = new KnowledgeStorage()

    this.server = new Server(
      {
        name: 'knowledge-store',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    this.setupHandlers()
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'store_knowledge',
            description:
              'Store a new knowledge entry in the knowledge base. Returns the created entry with its ID.',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: Object.values(KnowledgeCategory),
                  description: 'Category of knowledge',
                },
                title: {
                  type: 'string',
                  description: 'Title of the knowledge entry',
                },
                content: {
                  type: 'string',
                  description: 'Content of the knowledge entry (markdown supported)',
                },
                source_message_ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'IDs of source messages this knowledge came from',
                },
                participants: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                  description: 'Participants who can access this knowledge',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for categorization',
                },
              },
              required: ['category', 'title', 'content'],
            },
          },
          {
            name: 'retrieve_knowledge',
            description: 'Retrieve a specific knowledge entry by its ID.',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID of the knowledge entry to retrieve',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'search_knowledge',
            description:
              'Search knowledge entries by query string, category, or tags.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (searches title, content, and tags)',
                },
                category: {
                  type: 'string',
                  enum: Object.values(KnowledgeCategory),
                  description: 'Filter by category',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by tags',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 10)',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'list_knowledge',
            description: 'List knowledge entries, optionally filtered by category.',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: Object.values(KnowledgeCategory),
                  description: 'Filter by category',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 50)',
                },
              },
            },
          },
          {
            name: 'delete_knowledge',
            description: 'Delete a knowledge entry by its ID.',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID of the knowledge entry to delete',
                },
              },
              required: ['id'],
            },
          },
        ],
      }
    })

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'store_knowledge': {
            const validated = StoreKnowledgeRequestSchema.parse(args)
            const entry = await this.storage.store(validated)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(entry, null, 2),
                },
              ],
            }
          }

          case 'retrieve_knowledge': {
            const validated = RetrieveKnowledgeRequestSchema.parse(args)
            const entry = await this.storage.retrieve(validated.id)

            if (!entry) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      { error: 'Knowledge entry not found' },
                      null,
                      2
                    ),
                  },
                ],
                isError: true,
              }
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(entry, null, 2),
                },
              ],
            }
          }

          case 'search_knowledge': {
            const validated = SearchKnowledgeRequestSchema.parse(args)
            const results = await this.storage.search(validated)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2),
                },
              ],
            }
          }

          case 'list_knowledge': {
            const validated = ListEntriesRequestSchema.parse(args)
            const entries = await this.storage.list(validated)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(entries, null, 2),
                },
              ],
            }
          }

          case 'delete_knowledge': {
            const validated = DeleteKnowledgeRequestSchema.parse(args)
            const success = await this.storage.delete(validated.id)

            if (!success) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      { error: 'Knowledge entry not found or could not be deleted' },
                      null,
                      2
                    ),
                  },
                ],
                isError: true,
              }
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true }, null, 2),
                },
              ],
            }
          }

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2),
                },
              ],
              isError: true,
            }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage }, null, 2),
            },
          ],
          isError: true,
        }
      }
    })
  }

  async start(): Promise<void> {
    // Initialize storage
    await this.storage.initialize()

    // Create stdio transport
    const transport = new StdioServerTransport()

    // Connect server to transport
    await this.server.connect(transport)

    console.error('Knowledge Store MCP Server started')
  }
}

// Start the server
const server = new KnowledgeStoreMCPServer()
server.start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
