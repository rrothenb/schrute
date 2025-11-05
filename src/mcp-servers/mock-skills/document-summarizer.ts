#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Document Summarizer Mock MCP Server
 * Demonstrates a mock service that returns canned summaries
 */
class DocumentSummarizerMockServer {
  private server: Server

  constructor() {
    this.server = new Server(
      {
        name: 'document-summarizer-mock',
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'summarize_document',
            description:
              'Summarize a document by URL or content (mock - returns sample summary)',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Document URL or identifier',
                },
                content: {
                  type: 'string',
                  description: 'Document content (if not using URL)',
                },
                summary_length: {
                  type: 'string',
                  enum: ['short', 'medium', 'long'],
                  description: 'Desired summary length',
                },
              },
            },
          },
          {
            name: 'extract_key_points',
            description:
              'Extract key points from a document (mock - returns sample points)',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Document URL or identifier',
                },
                content: {
                  type: 'string',
                  description: 'Document content (if not using URL)',
                },
                max_points: {
                  type: 'number',
                  description: 'Maximum number of key points to extract',
                },
              },
            },
          },
          {
            name: 'generate_abstract',
            description:
              'Generate an abstract for a document (mock - returns sample abstract)',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Document URL or identifier',
                },
                content: {
                  type: 'string',
                  description: 'Document content (if not using URL)',
                },
              },
            },
          },
        ],
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'summarize_document': {
            const result = this.summarizeDocument(args as Record<string, unknown>)
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            }
          }

          case 'extract_key_points': {
            const result = this.extractKeyPoints(args as Record<string, unknown>)
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            }
          }

          case 'generate_abstract': {
            const result = this.generateAbstract(args as Record<string, unknown>)
            return {
              content: [
                {
                  type: 'text',
                  text: result,
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

  private summarizeDocument(args: Record<string, unknown>): string {
    const source = (args.source as string) || 'provided content'
    const length = (args.summary_length as string) || 'medium'

    const summaries = {
      short:
        'Brief overview of the document covering main topics and conclusions.',
      medium:
        'This document discusses several key topics including project goals, ' +
        'implementation strategy, and expected outcomes. The content provides ' +
        'detailed analysis of the problem space and proposes solutions based on ' +
        'current best practices.',
      long:
        'This comprehensive document explores multiple dimensions of the subject matter. ' +
        'It begins with a thorough background analysis, establishing context and ' +
        'identifying key challenges. The middle sections detail proposed approaches, ' +
        'methodologies, and implementation strategies. The document concludes with ' +
        'recommendations, expected outcomes, and future considerations. Throughout, ' +
        'it references relevant research and provides supporting evidence for its claims.',
    }

    return `Document Summary (MOCK)

Source: ${source}
Length: ${length}

Summary:
${summaries[length as keyof typeof summaries]}

Note: This is a mock summary. A real implementation would analyze
the actual document content and generate a tailored summary.`
  }

  private extractKeyPoints(args: Record<string, unknown>): string {
    const source = (args.source as string) || 'provided content'
    const maxPoints = (args.max_points as number) || 5

    const points = [
      'Primary objective is to improve system efficiency and reliability',
      'Proposed solution involves modular architecture with clear separation of concerns',
      'Implementation timeline is estimated at 3-6 months with phased rollout',
      'Expected benefits include 40% performance improvement and reduced maintenance',
      'Risk mitigation strategies have been identified for key dependencies',
      'Stakeholder engagement and training programs are planned',
      'Success metrics include user adoption rate and system uptime',
    ]

    const selectedPoints = points.slice(0, maxPoints)

    return `Key Points Extracted (MOCK)

Source: ${source}
Points requested: ${maxPoints}

${selectedPoints.map((point, idx) => `${idx + 1}. ${point}`).join('\n')}

Note: This is a mock extraction. A real implementation would
analyze the document and identify actual key points.`
  }

  private generateAbstract(args: Record<string, unknown>): string {
    const source = (args.source as string) || 'provided content'

    return `Abstract (MOCK)

Source: ${source}

This document presents a comprehensive analysis of current challenges
and proposes innovative solutions based on industry best practices.
The research methodology combines quantitative data analysis with
qualitative stakeholder interviews to provide a holistic view of the
problem space. Key findings indicate significant opportunities for
improvement through strategic interventions. The recommendations outlined
provide actionable steps for implementation, along with metrics for
measuring success. This work contributes to the existing body of knowledge
and offers practical insights for practitioners in the field.

Note: This is a mock abstract. A real implementation would generate
an abstract based on the actual document content.`
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Document Summarizer Mock Server started')
  }
}

const server = new DocumentSummarizerMockServer()
server.start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
