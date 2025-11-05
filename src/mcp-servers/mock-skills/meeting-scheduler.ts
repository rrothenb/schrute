#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Meeting Scheduler Mock MCP Server
 * Demonstrates a mock service that formats responses without actual scheduling
 */
class MeetingSchedulerMockServer {
  private server: Server

  constructor() {
    this.server = new Server(
      {
        name: 'meeting-scheduler-mock',
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
            name: 'schedule_meeting',
            description:
              'Schedule a meeting with participants (mock - returns formatted response)',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Meeting title',
                },
                participants: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of participant email addresses',
                },
                duration_minutes: {
                  type: 'number',
                  description: 'Meeting duration in minutes',
                },
                date: {
                  type: 'string',
                  description: 'Preferred date (YYYY-MM-DD format)',
                },
                time: {
                  type: 'string',
                  description: 'Preferred time (HH:MM format)',
                },
              },
              required: ['title', 'participants', 'duration_minutes'],
            },
          },
          {
            name: 'find_available_slots',
            description:
              'Find available meeting slots for participants (mock - returns sample slots)',
            inputSchema: {
              type: 'object',
              properties: {
                participants: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of participant email addresses',
                },
                duration_minutes: {
                  type: 'number',
                  description: 'Desired meeting duration in minutes',
                },
                date_range_start: {
                  type: 'string',
                  description: 'Start of date range (YYYY-MM-DD)',
                },
                date_range_end: {
                  type: 'string',
                  description: 'End of date range (YYYY-MM-DD)',
                },
              },
              required: ['participants', 'duration_minutes'],
            },
          },
        ],
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'schedule_meeting': {
            const result = this.scheduleMeeting(args as Record<string, unknown>)
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            }
          }

          case 'find_available_slots': {
            const result = this.findAvailableSlots(args as Record<string, unknown>)
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

  private scheduleMeeting(args: Record<string, unknown>): string {
    const title = args.title as string
    const participants = args.participants as string[]
    const duration = args.duration_minutes as number
    const date = args.date as string | undefined
    const time = args.time as string | undefined

    const meetingDate = date || '2025-11-10'
    const meetingTime = time || '14:00'

    return `✓ Meeting scheduled successfully (MOCK)

Title: ${title}
Date: ${meetingDate}
Time: ${meetingTime}
Duration: ${duration} minutes
Participants: ${participants.join(', ')}

Calendar invites would be sent to all participants.
Meeting ID: mock-${Date.now()}`
  }

  private findAvailableSlots(args: Record<string, unknown>): string {
    const participants = args.participants as string[]
    const duration = args.duration_minutes as number
    const startDate = (args.date_range_start as string) || '2025-11-10'
    const endDate = (args.date_range_end as string) || '2025-11-14'

    return `Available meeting slots for ${participants.length} participants (MOCK):

Duration: ${duration} minutes
Date Range: ${startDate} to ${endDate}

Suggested Slots:
1. ${startDate} at 10:00 AM
2. ${startDate} at 2:00 PM
3. ${startDate} at 4:00 PM
4. ${endDate} at 9:00 AM
5. ${endDate} at 1:00 PM

Note: This is a mock response. In a real implementation, this would
check actual calendar availability across all participants.`
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Meeting Scheduler Mock Server started')
  }
}

const server = new MeetingSchedulerMockServer()
server.start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
