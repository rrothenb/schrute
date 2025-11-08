# Agent Tool Use - Demonstration Guide

This guide demonstrates Schrute's **automatic tool use** feature, where Claude can discover and invoke MCP tools to answer questions without manual intervention.

## The Challenge

**Before** this feature, when users asked questions requiring external data or actions, Schrute could only answer based on email content. You had to manually invoke MCP tools and interpret results.

**After** this feature, Schrute automatically discovers available MCP tools, decides when to use them, invokes them, and incorporates results into its answers - just by asking a natural language question.

## Quick Demo

### Step 1: Load Test Data
```bash
npm run dev

# In the Schrute CLI:
schrute> load events/thread-resource-scheduling.yaml
```

This loads an email thread where a team is trying to schedule a meeting and book resources. They're asking questions like:
- "What rooms can fit 10 people?"
- "Is Conference Room A available Tuesday 2-4pm?"
- "Can we book the 4K projector?"

### Step 2: Connect the Resource Scheduler
```bash
schrute> mcp connect resource-scheduler node dist/mcp-servers/resource-scheduler/server.js
```

This connects an MCP server that can:
- Check room availability
- List rooms by capacity
- Book resources
- Get bookings
- Cancel bookings

### Step 3: Enable Automatic Tool Use
```bash
schrute> tools on
✓ Automatic tool use enabled
  Queries will automatically discover and use connected MCP tools
  Connected servers: resource-scheduler
  Available tools: 5
```

### Step 4: Ask Questions (The Magic Part!)
```bash
schrute> query What conference rooms can fit 10 people?
```

**Without tool use:** Schrute would say "I don't see information about room capacities in the emails."

**With tool use:** Schrute automatically:
1. Sees the `list_resources` tool is available
2. Realizes it can answer the question using that tool
3. Invokes `list_resources` with `type=meeting_room` and `min_capacity=10`
4. Gets back: `Conference Room A (capacity: 10, Floor 2 East Wing)`
5. Answers: "Conference Room A can accommodate 10 people. It's located on Floor 2 in the East Wing."

```bash
schrute> query Is Conference Room A available Tuesday Jan 20 from 2-4pm?
```

Schrute automatically:
1. Uses `check_availability` tool
2. Passes resource_id, start_time, end_time from the query
3. Gets back availability status and any conflicts
4. Answers based on real data

```bash
schrute> query Can you book Conference Room A for Tuesday 2-4pm for our planning meeting?
```

Schrute automatically:
1. Checks availability first
2. If available, invokes `book_resource`
3. Confirms the booking
4. Provides booking details

## How It Works

### Architecture

```
User Query
    ↓
Query Handler (with useTools=true)
    ↓
1. Discover available MCP tools from connected servers
2. Convert tools to Claude-compatible format
3. Send query + context + tools to Claude
    ↓
Claude decides: "I need to use list_resources to answer this"
    ↓
4. Claude returns tool_use request
5. Execute MCP tool via MCP client
6. Get tool result
7. Send result back to Claude
    ↓
Claude: "Based on the tool results, here's the answer..."
    ↓
Return answer to user
```

### Key Code

**Query Handler** (`src/lib/query/handler.ts`):
- `handleQueryWithTools()`: Orchestrates tool use workflow
- Discovers tools from MCP client
- Converts to Claude tool format
- Handles multi-turn tool use (up to 5 iterations)
- Tracks which tools were used for source attribution

**Claude Client** (`src/lib/claude/client.ts`):
- `promptWithTools()`: Sends message with tools, returns tool use requests
- `continueWithToolResults()`: Continues conversation with tool results

**CLI** (`src/cli/index.ts`):
- `tools on/off`: Toggle automatic tool use
- Passes `mcpClient` and `useTools` flag to query handler

## Realistic MCP Server

The Resource Scheduler (`src/mcp-servers/resource-scheduler/server.ts`) is designed to be realistic:

**Resources:**
- Conference Room A (10 people, Floor 2 East)
- Conference Room B (6 people, Floor 2 West)
- Huddle Room 1 (4 people, Floor 3)
- Projector HD
- Projector 4K
- Company Van (8 people)

**Tools:**
1. `check_availability` - Check if resource available at time
2. `book_resource` - Book a resource
3. `list_resources` - List resources (filter by type, capacity)
4. `get_bookings` - Get bookings for a resource
5. `cancel_booking` - Cancel a booking

**Pre-loaded bookings:**
- Conference Room A: Jan 20, 2-3pm (Alice, Project Alpha Review)
- Conference Room B: Jan 20, 10-11:30am (Bob, Team Standup)

## Testing the Feature

### Test Scenario 1: Discovery
```bash
schrute> tools on
schrute> query What meeting rooms are available in this building?
```

**Expected:** Claude uses `list_resources` with `type=meeting_room` and lists all rooms.

### Test Scenario 2: Capacity Filtering
```bash
schrute> query We need a room for 8 people. What are our options?
```

**Expected:** Claude uses `list_resources` with `min_capacity=8` and suggests appropriate rooms.

### Test Scenario 3: Availability Check
```bash
schrute> query Is Conference Room A free tomorrow at 2pm?
```

**Expected:** Claude uses `check_availability` and reports current bookings/conflicts.

### Test Scenario 4: Booking (Action-Taking!)
**Note:** This demonstrates action-taking, which is high-risk.

```bash
schrute> query Please book Conference Room B for tomorrow 3-5pm for our team meeting
```

**Expected:** Claude checks availability, then books if available, returns confirmation.

**Risk:** Claude might book incorrectly. In production, you'd want:
- Confirmation before action
- Dry-run mode
- Undo capability

### Test Scenario 5: Complex Multi-Step
```bash
schrute> query We have 9 people. Find a free room tomorrow afternoon and book it for 2 hours.
```

**Expected:** Claude:
1. Lists rooms with capacity ≥9
2. Checks availability for each
3. Picks one
4. Books it
5. Confirms

This demonstrates multi-turn tool use (up to 5 iterations supported).

## Toggling Tool Use On/Off

```bash
# Check current status
schrute> tools
Automatic tool use is currently: OFF
Usage: tools [on|off]

# Enable
schrute> tools on
✓ Automatic tool use enabled

# Disable
schrute> tools off
✓ Automatic tool use disabled

# Check what's connected
schrute> mcp list
schrute> mcp tools
```

## Success Criteria

This feature is successful if:

1. ✅ **Discovery works:** Claude sees MCP tools and understands what they do
2. ✅ **Selection works:** Claude picks the right tool for the question
3. ✅ **Invocation works:** Tool parameters are correctly mapped from natural language
4. ✅ **Multi-turn works:** Claude can chain multiple tool calls
5. ⏳ **Reliability:** Works consistently across different question phrasings
6. ⏳ **Cost:** Token usage is reasonable (not excessive tool exploration)
7. ⏳ **Error handling:** Gracefully handles tool failures

## Testing Without API Key

The tool discovery and conversion logic can be tested without an API key:

```bash
schrute> mcp connect resource-scheduler node dist/mcp-servers/resource-scheduler/server.js
schrute> mcp tools
```

This shows the tools are discovered and registered correctly.

To test the full workflow, you need `CLAUDE_API_KEY` set.

## Next Steps

### To Validate This Feature:
1. ✅ Test with the resource scheduling scenario
2. ⏳ Measure accuracy: Does Claude pick the right tools?
3. ⏳ Measure reliability: Does it work consistently?
4. ⏳ Create another domain (e.g., task assignment) to test generalization
5. ⏳ Test error cases (invalid parameters, tool failures)

### For Production:
- Add confirmation before actions
- Add dry-run/preview mode
- Add undo capability
- Add better error messages
- Add cost controls (max tool calls per query)
- Add security (validate tool permissions)

## Comparison: Manual vs. Automatic Tool Use

### Manual (Before):
```bash
schrute> mcp tools
# Read list of tools manually

schrute> mcp invoke check_availability {"resource_id":"room-001","start_time":"2025-01-20T14:00:00Z","end_time":"2025-01-20T16:00:00Z"}
# Parse JSON result manually

schrute> query Based on the tool output, can you tell me if the room is free?
# Manually interpret
```

**Problem:** Requires deep tool knowledge, manual JSON wrangling, multiple steps.

### Automatic (After):
```bash
schrute> tools on
schrute> query Is Conference Room A available Tuesday 2-4pm?
# Done! Claude handles everything.
```

**Benefit:** Natural language in, natural language out. No manual tool orchestration.

## Files Changed

- `src/lib/claude/client.ts` - Added `promptWithTools()` and `continueWithToolResults()`
- `src/lib/query/handler.ts` - Added `handleQueryWithTools()` and `convertMCPToolsToClaude()`
- `src/cli/index.ts` - Added `tools` command and `useTools` flag
- `src/mcp-servers/resource-scheduler/server.ts` - New realistic MCP server
- `events/thread-resource-scheduling.yaml` - Test email thread

## Conclusion

This feature demonstrates that **MCP + LLM agent tool use** can work. By simply:
1. Connecting an MCP server
2. Turning on tool use
3. Asking a natural language question

Schrute can become an expert in that domain, discovering and using tools automatically.

**The magic is real** - but it needs validation through testing to understand reliability and edge cases.
