import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Resource Scheduling MCP Server
 *
 * Manages meeting rooms and resources with booking capabilities.
 * This is a realistic prototype to test agent tool use.
 */

interface Resource {
  id: string
  name: string
  type: 'meeting_room' | 'equipment' | 'vehicle'
  capacity?: number
  location?: string
}

interface Booking {
  id: string
  resourceId: string
  bookedBy: string
  startTime: string // ISO 8601
  endTime: string // ISO 8601
  purpose: string
}

// In-memory storage (would be database in production)
const resources: Resource[] = [
  {
    id: 'room-001',
    name: 'Conference Room A',
    type: 'meeting_room',
    capacity: 10,
    location: 'Floor 2, East Wing',
  },
  {
    id: 'room-002',
    name: 'Conference Room B',
    type: 'meeting_room',
    capacity: 6,
    location: 'Floor 2, West Wing',
  },
  {
    id: 'room-003',
    name: 'Huddle Room 1',
    type: 'meeting_room',
    capacity: 4,
    location: 'Floor 3',
  },
  {
    id: 'proj-001',
    name: 'Projector (HD)',
    type: 'equipment',
    location: 'Equipment Room',
  },
  {
    id: 'proj-002',
    name: 'Projector (4K)',
    type: 'equipment',
    location: 'Equipment Room',
  },
  {
    id: 'car-001',
    name: 'Company Van',
    type: 'vehicle',
    capacity: 8,
    location: 'Parking Level B1',
  },
]

let bookings: Booking[] = [
  // Some sample bookings
  {
    id: 'booking-001',
    resourceId: 'room-001',
    bookedBy: 'alice@company.com',
    startTime: '2025-01-20T14:00:00Z',
    endTime: '2025-01-20T15:00:00Z',
    purpose: 'Project Alpha Review',
  },
  {
    id: 'booking-002',
    resourceId: 'room-002',
    bookedBy: 'bob@company.com',
    startTime: '2025-01-20T10:00:00Z',
    endTime: '2025-01-20T11:30:00Z',
    purpose: 'Team Standup',
  },
]

/**
 * Check if a time slot overlaps with an existing booking
 */
function hasConflict(
  resourceId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): boolean {
  const start = new Date(startTime)
  const end = new Date(endTime)

  return bookings.some((booking) => {
    if (booking.resourceId !== resourceId) return false
    if (excludeBookingId && booking.id === excludeBookingId) return false

    const bookingStart = new Date(booking.startTime)
    const bookingEnd = new Date(booking.endTime)

    // Check for overlap
    return start < bookingEnd && end > bookingStart
  })
}

/**
 * Generate a unique booking ID
 */
function generateBookingId(): string {
  return `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create server
const server = new Server(
  {
    name: 'resource-scheduler',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'check_availability',
        description: 'Check if a resource is available during a specific time period. Returns availability status and conflicts if any.',
        inputSchema: {
          type: 'object',
          properties: {
            resource_id: {
              type: 'string',
              description: 'The ID of the resource to check (e.g., room-001, proj-001)',
            },
            start_time: {
              type: 'string',
              description: 'Start time in ISO 8601 format (e.g., 2025-01-20T14:00:00Z)',
            },
            end_time: {
              type: 'string',
              description: 'End time in ISO 8601 format (e.g., 2025-01-20T16:00:00Z)',
            },
          },
          required: ['resource_id', 'start_time', 'end_time'],
        },
      },
      {
        name: 'book_resource',
        description: 'Book a resource for a specific time period. Requires the resource to be available.',
        inputSchema: {
          type: 'object',
          properties: {
            resource_id: {
              type: 'string',
              description: 'The ID of the resource to book',
            },
            booked_by: {
              type: 'string',
              description: 'Email address of the person booking',
            },
            start_time: {
              type: 'string',
              description: 'Start time in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'End time in ISO 8601 format',
            },
            purpose: {
              type: 'string',
              description: 'Purpose of the booking',
            },
          },
          required: ['resource_id', 'booked_by', 'start_time', 'end_time', 'purpose'],
        },
      },
      {
        name: 'list_resources',
        description: 'List all available resources, optionally filtered by type. Returns resource details including capacity and location.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['meeting_room', 'equipment', 'vehicle'],
              description: 'Filter by resource type (optional)',
            },
            min_capacity: {
              type: 'number',
              description: 'Minimum capacity required (for meeting rooms)',
            },
          },
        },
      },
      {
        name: 'get_bookings',
        description: 'Get all bookings for a resource within a time period. Useful for seeing what is already booked.',
        inputSchema: {
          type: 'object',
          properties: {
            resource_id: {
              type: 'string',
              description: 'The ID of the resource',
            },
            start_date: {
              type: 'string',
              description: 'Start date in ISO 8601 format (optional, defaults to today)',
            },
            end_date: {
              type: 'string',
              description: 'End date in ISO 8601 format (optional, defaults to 7 days from start)',
            },
          },
          required: ['resource_id'],
        },
      },
      {
        name: 'cancel_booking',
        description: 'Cancel an existing booking. Requires the booking ID.',
        inputSchema: {
          type: 'object',
          properties: {
            booking_id: {
              type: 'string',
              description: 'The ID of the booking to cancel',
            },
          },
          required: ['booking_id'],
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'check_availability': {
        const { resource_id, start_time, end_time } = args as {
          resource_id: string
          start_time: string
          end_time: string
        }

        // Find resource
        const resource = resources.find((r) => r.id === resource_id)
        if (!resource) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Resource ${resource_id} not found`,
                }),
              },
            ],
          }
        }

        // Check for conflicts
        const conflict = hasConflict(resource_id, start_time, end_time)
        const conflictingBookings = bookings.filter((b) => {
          if (b.resourceId !== resource_id) return false
          const start = new Date(start_time)
          const end = new Date(end_time)
          const bookingStart = new Date(b.startTime)
          const bookingEnd = new Date(b.endTime)
          return start < bookingEnd && end > bookingStart
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                available: !conflict,
                resource: resource,
                conflicts: conflictingBookings.map((b) => ({
                  booking_id: b.id,
                  booked_by: b.bookedBy,
                  start_time: b.startTime,
                  end_time: b.endTime,
                  purpose: b.purpose,
                })),
              }),
            },
          ],
        }
      }

      case 'book_resource': {
        const { resource_id, booked_by, start_time, end_time, purpose } = args as {
          resource_id: string
          booked_by: string
          start_time: string
          end_time: string
          purpose: string
        }

        // Find resource
        const resource = resources.find((r) => r.id === resource_id)
        if (!resource) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: `Resource ${resource_id} not found`,
                }),
              },
            ],
          }
        }

        // Check for conflicts
        if (hasConflict(resource_id, start_time, end_time)) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Resource is not available during this time',
                }),
              },
            ],
          }
        }

        // Create booking
        const booking: Booking = {
          id: generateBookingId(),
          resourceId: resource_id,
          bookedBy: booked_by,
          startTime: start_time,
          endTime: end_time,
          purpose,
        }

        bookings.push(booking)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                booking: booking,
                resource: resource,
              }),
            },
          ],
        }
      }

      case 'list_resources': {
        const { type, min_capacity } = (args as {
          type?: string
          min_capacity?: number
        }) || {}

        let filtered = resources

        if (type) {
          filtered = filtered.filter((r) => r.type === type)
        }

        if (min_capacity !== undefined) {
          filtered = filtered.filter((r) => (r.capacity || 0) >= min_capacity)
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                resources: filtered,
                count: filtered.length,
              }),
            },
          ],
        }
      }

      case 'get_bookings': {
        const { resource_id, start_date, end_date } = args as {
          resource_id: string
          start_date?: string
          end_date?: string
        }

        // Default date range
        const start = new Date(start_date || Date.now())
        const end = new Date(
          end_date || new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
        )

        const resourceBookings = bookings.filter((b) => {
          if (b.resourceId !== resource_id) return false
          const bookingStart = new Date(b.startTime)
          return bookingStart >= start && bookingStart <= end
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                resource_id,
                bookings: resourceBookings,
                count: resourceBookings.length,
              }),
            },
          ],
        }
      }

      case 'cancel_booking': {
        const { booking_id } = args as { booking_id: string }

        const bookingIndex = bookings.findIndex((b) => b.id === booking_id)
        if (bookingIndex === -1) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: `Booking ${booking_id} not found`,
                }),
              },
            ],
          }
        }

        const booking = bookings[bookingIndex]
        bookings.splice(bookingIndex, 1)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                cancelled_booking: booking,
              }),
            },
          ],
        }
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Unknown tool: ${name}`,
              }),
            },
          ],
        }
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
    }
  }
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Resource Scheduling MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
