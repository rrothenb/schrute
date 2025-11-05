#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { SkillsStorage } from './storage.js'
import { SkillInvoker } from './invoker.js'
import {
  CreateSkillRequestSchema,
  UpdateSkillRequestSchema,
  DeleteSkillRequestSchema,
  InvokeSkillRequestSchema,
  StoredSkill,
} from './types.js'

/**
 * Dynamic Skills MCP Server
 * Provides tools for creating and managing dynamic skills backed by LLM prompts
 */
class DynamicSkillsMCPServer {
  private server: Server
  private storage: SkillsStorage
  private invoker: SkillInvoker

  constructor() {
    this.storage = new SkillsStorage()
    this.invoker = new SkillInvoker()

    this.server = new Server(
      {
        name: 'dynamic-skills',
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
    // List available tools (management tools + dynamic skill tools)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const managementTools = [
        {
          name: 'create_skill',
          description:
            'Create a new dynamic skill with a prompt template and input placeholders.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the skill (will be used as tool name)',
              },
              description: {
                type: 'string',
                description: 'Description of what the skill does',
              },
              prompt_template: {
                type: 'string',
                description:
                  'Prompt template with placeholders in {{placeholder}} format',
              },
              input_placeholders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Name of the placeholder',
                    },
                    description: {
                      type: 'string',
                      description: 'Description of the placeholder',
                    },
                    required: {
                      type: 'boolean',
                      description: 'Whether the placeholder is required',
                    },
                  },
                  required: ['name', 'description'],
                },
                description: 'Input placeholders for the prompt template',
              },
            },
            required: ['name', 'description', 'prompt_template', 'input_placeholders'],
          },
        },
        {
          name: 'list_skills',
          description: 'List all available dynamic skills.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'update_skill',
          description: 'Update an existing dynamic skill.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the skill to update',
              },
              name: {
                type: 'string',
                description: 'New name for the skill',
              },
              description: {
                type: 'string',
                description: 'New description',
              },
              prompt_template: {
                type: 'string',
                description: 'New prompt template',
              },
              input_placeholders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    required: { type: 'boolean' },
                  },
                },
                description: 'New input placeholders',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'delete_skill',
          description: 'Delete a dynamic skill.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the skill to delete',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'invoke_skill',
          description: 'Invoke a dynamic skill by its ID with the provided arguments.',
          inputSchema: {
            type: 'object',
            properties: {
              skill_id: {
                type: 'string',
                description: 'ID of the skill to invoke',
              },
              arguments: {
                type: 'object',
                description:
                  'Arguments to pass to the skill (placeholder name -> value)',
              },
            },
            required: ['skill_id', 'arguments'],
          },
        },
      ]

      // Get dynamic skill tools
      const skills = await this.storage.list()
      const skillTools = skills.map((skill) => this.skillToTool(skill))

      return {
        tools: [...managementTools, ...skillTools],
      }
    })

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        // Handle management tools
        switch (name) {
          case 'create_skill': {
            const validated = CreateSkillRequestSchema.parse(args)
            const skill = await this.storage.create(validated)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(skill, null, 2),
                },
              ],
            }
          }

          case 'list_skills': {
            const skills = await this.storage.list()
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(skills, null, 2),
                },
              ],
            }
          }

          case 'update_skill': {
            const validated = UpdateSkillRequestSchema.parse(args)
            const skill = await this.storage.update(validated)

            if (!skill) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ error: 'Skill not found' }, null, 2),
                  },
                ],
                isError: true,
              }
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(skill, null, 2),
                },
              ],
            }
          }

          case 'delete_skill': {
            const validated = DeleteSkillRequestSchema.parse(args)
            const success = await this.storage.delete(validated.id)

            if (!success) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      { error: 'Skill not found or could not be deleted' },
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

          case 'invoke_skill': {
            const validated = InvokeSkillRequestSchema.parse(args)
            const skill = await this.storage.get(validated.skill_id)

            if (!skill) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ error: 'Skill not found' }, null, 2),
                  },
                ],
                isError: true,
              }
            }

            const result = await this.invoker.invoke(skill, validated.arguments)

            if (!result.success) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ error: result.error }, null, 2),
                  },
                ],
                isError: true,
              }
            }

            return {
              content: [
                {
                  type: 'text',
                  text: result.result || '',
                },
              ],
            }
          }

          default: {
            // Check if it's a dynamic skill tool
            const skill = await this.storage.getByName(name)

            if (skill) {
              const result = await this.invoker.invoke(
                skill,
                args as Record<string, string>
              )

              if (!result.success) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({ error: result.error }, null, 2),
                    },
                  ],
                  isError: true,
                }
              }

              return {
                content: [
                  {
                    type: 'text',
                    text: result.result || '',
                  },
                ],
              }
            }

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

  /**
   * Convert a skill to an MCP tool definition
   */
  private skillToTool(skill: StoredSkill) {
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    for (const placeholder of skill.input_placeholders) {
      properties[placeholder.name] = {
        type: 'string',
        description: placeholder.description,
      }

      if (placeholder.required) {
        required.push(placeholder.name)
      }
    }

    return {
      name: skill.name,
      description: skill.description,
      inputSchema: {
        type: 'object',
        properties,
        required,
      },
    }
  }

  async start(): Promise<void> {
    // Initialize storage
    await this.storage.initialize()

    // Create stdio transport
    const transport = new StdioServerTransport()

    // Connect server to transport
    await this.server.connect(transport)

    console.error('Dynamic Skills MCP Server started')
  }
}

// Start the server
const server = new DynamicSkillsMCPServer()
server.start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
