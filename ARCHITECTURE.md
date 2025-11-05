# Schrute Architecture

## Overview

Schrute is an AI coordination assistant built on a modular architecture with three key design principles:

1. **Privacy-First**: Information is tracked by participant and never leaked inappropriately
2. **LLM-Native**: Uses Claude API for all intelligent tasks (speech acts, activation, queries, summaries)
3. **Extensible**: MCP integration allows runtime addition of capabilities without code changes

## System Components

### Core Libraries (`src/lib/`)

#### Type System (`types/`)

Central type definitions using Zod for runtime validation:

- **Email Types**: EmailSchema, EmailThreadSchema with validation
- **Speech Act Types**: 10 types (request, commitment, decision, etc.)
- **Privacy Types**: ParticipantContext, PrivacyFilterResult
- **Personality Types**: PersonalityConfig with constraints and styles
- **Knowledge Types**: KnowledgeEntry with categories and privacy metadata
- **Memory Types**: EmailSummary, MemoryContext for hybrid system
- **MCP Types**: MCPServerConfig, MCPTool, MCPToolResult

All types are exported from `~/lib/types` for consistent usage across the codebase.

#### Email Processing (`email/`)

**Parser** (`parser.ts`):
- Loads YAML email files using the `yaml` library
- Validates against EmailSchema using Zod
- Returns validated Email[] array
- Throws descriptive errors on invalid format

**Thread Builder** (`threads.ts`):
- Groups emails by `thread_id`
- Builds EmailThread with all messages
- Extracts unique participants across thread
- Maintains chronological ordering

**Key Design Decision**: YAML over JSON for human-readable mock emails in Phase 1.

#### Speech Act Detection (`speech-acts/`)

**Detector** (`detector.ts`):
- Uses Claude API to identify speech acts in email body
- Exhaustive detection: finds ALL speech acts in a message
- Returns structured SpeechAct objects with:
  - Type (enum of 10 types)
  - Content (extracted text)
  - Actor (who performed the act)
  - Participants (who can see it)
  - Confidence score (0-1)
  - Source message ID
- Batching support for efficient processing

**Store** (`store.ts`):
- In-memory storage with Map<id, SpeechAct>
- Query methods: getByType, getByThread, getByParticipant
- Timestamp filtering: getBefore, getAfter, getInRange
- Confidence filtering: getByMinConfidence
- Efficient indexing for common queries

**Prompt Engineering**:
```typescript
const prompt = `
Analyze this email and identify ALL speech acts present.
For each act, provide:
- type: one of [request, question, commitment, decision, ...]
- content: the specific text expressing this act
- confidence: 0.0-1.0 score

Email:
${email.body}

Return JSON array of speech acts.
`
```

#### Privacy System (`privacy/`)

**Tracker** (`tracker.ts`):
- Maintains ParticipantContext for each email address
- Tracks `accessible_messages` list per participant
- Tracks `accessible_speech_acts` list per participant
- Records `first_seen` timestamp

**Filter** (`filter.ts`):
- `canAccessEmails`: Checks if all current participants saw source messages
- `canAccessSpeechActs`: Checks if all current participants saw source messages
- `canAccessKnowledge`: Checks if all participants in entry.participants are present
- Returns PrivacyFilterResult with:
  - `allowed`: boolean
  - `reason`: explanation string
  - `restricted_participants`: who is blocking access

**Privacy Algorithm**:
```
For information to be shared:
  FOR EACH current participant P:
    IF P not in source_message_participants:
      DENY with reason "Due to presence of P"

  ALLOW (all participants have access)
```

**Conservative Approach**: When uncertain, restrict. Better to withhold than leak.

#### Query System (`query/`)

**Handler** (`handler.ts`):
- Accepts QueryRequest with asker, query, and context participants
- Assembles context from emails, speech acts, and knowledge
- Applies privacy filtering before sending to LLM
- Generates response using Claude API with personality
- Returns QueryResponse with answer and privacy flags

**Context Assembly**:
1. Gather emails (filtered by privacy)
2. Gather speech acts (filtered by privacy)
3. Gather knowledge entries (filtered by privacy)
4. Format into structured prompt
5. Include personality instructions
6. Send to Claude API

**Prompt Structure**:
```
System: You are Schrute, an AI coordinator...
[Personality additions]

User: Here is the email history:
[Privacy-filtered emails]

Here are detected speech acts:
[Privacy-filtered speech acts]

Here is relevant knowledge:
[Privacy-filtered knowledge]

Question: [user query]
```

#### Personality System (`personality/`)

**Loader** (`loader.ts`):
- Scans `personalities/` directory for YAML files
- Loads and validates PersonalityConfig
- Maintains registry of available personalities
- Provides default fallback

**Integration**:
- Personalities inject into system prompt
- Modify tone, style, and constraints
- Include example phrases for consistency
- Allow arbitrary `system_prompt_additions`

**Example Personality**:
```yaml
name: dwight-schrute
tone: serious, intense
speaking_style: formal, rule-focused
constraints:
  - Always reference procedures
  - Take everything seriously
system_prompt_additions: |
  You are Dwight Schrute, Assistant Regional Manager...
```

#### Activation Logic (`activation/`)

**Decider** (`decider.ts`):
- Uses Claude API to determine if Schrute should respond
- Checks multiple signals:
  - Directly in To: line
  - Mentioned by name/alias
  - Pronoun reference in context
  - Question about area of responsibility
  - Request for Schrute's expertise
- Returns ActivationDecision with confidence and reasons
- Conservative: respond when uncertain (better available than silent)

**Prompt**:
```
Given this email and thread context, should Schrute respond?

Schrute's config:
- Name: Schrute
- Aliases: [...]
- Responsibilities: [...]
- Expertise: [...]

Email: [message]
Thread context: [recent messages]

Should Schrute respond? Why?
```

#### Memory System (`memory/`)

**Manager** (`manager.ts`):
- Implements hybrid memory strategy
- Configurable thresholds:
  - `recentMessageCount`: Keep full (default: 10)
  - `summaryBatchSize`: Emails per summary (default: 5)
- Builds MemoryContext for queries:
  - Recent messages (full text)
  - Older messages (summarized)
  - Relevant speech acts
  - Relevant knowledge

**Summarizer** (`summarizer.ts`):
- Uses Claude API to create EmailSummary
- Extracts key points from thread segment
- Maintains participant list for privacy
- Caches summaries to avoid redundant API calls

**Memory Algorithm**:
```
Given N emails in thread:
  Recent = last recentMessageCount emails (full)
  Older = remaining emails

  FOR EACH batch of summaryBatchSize in Older:
    IF not cached:
      summary = generateSummary(batch)
      cache(summary)

  RETURN {
    recent_messages: Recent,
    summaries: [cached summaries for Older],
    relevant_speech_acts: [...],
    relevant_knowledge: [...]
  }
```

**Token Optimization**: For a 100-email thread:
- Without memory: ~50,000 tokens (100 × 500 avg)
- With memory (10 recent + summaries): ~7,000 tokens (10 × 500 + 9 × 200)

#### Claude API Client (`claude/`)

**Client** (`client.ts`):
- Wraps Anthropic SDK
- Provides two methods:
  - `prompt`: Single-turn completions
  - `chat`: Multi-turn conversations
- Uses `claude-3-5-sonnet-20241022` model
- Singleton pattern for consistent API key usage
- JSON response parsing with error handling

**Configuration**:
```typescript
{
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  temperature: 1.0 (default)
}
```

#### MCP Client (`mcp/`)

**Manager** (`client.ts`):
- MCPClientManager class (singleton)
- Manages multiple MCP server connections
- Uses StdioClientTransport for stdio-based communication
- Tool discovery via `listTools()` API
- Tool invocation via `callTool()` API
- Connection tracking with status

**Connection Flow**:
```
1. Create StdioClientTransport(command, args)
2. Create MCP Client with capabilities
3. Connect client to transport
4. Discover tools via listTools()
5. Store connection metadata
6. Register tools in global registry
```

**Tool Invocation**:
```
1. Find tool by name across all servers
2. Validate tool exists on server
3. Call client.callTool(name, args)
4. Return MCPToolResult{success, result/error}
```

### MCP Servers (`src/mcp-servers/`)

#### Knowledge Store (`knowledge-store/`)

**Storage** (`storage.ts`):
- Markdown files with YAML frontmatter
- One file per entry: `{uuid}.md`
- Frontmatter contains:
  - id, category, title
  - participants (for privacy)
  - tags, timestamps
- Content: plain markdown body

**Server** (`server.ts`):
- Implements MCP protocol via `@modelcontextprotocol/sdk`
- Tools:
  - store_knowledge
  - retrieve_knowledge
  - search_knowledge
  - list_knowledge
  - delete_knowledge
- Uses StdioServerTransport
- Validates requests with Zod schemas

**File Format**:
```markdown
---
id: abc-123
category: decision
title: Use TypeScript
participants:
  - email: alice@company.com
tags: [tech-stack]
created_at: '2025-01-15T10:00:00Z'
---
Team decided to use TypeScript for better type safety.
```

**Search Implementation**:
- Full-text search across title, content, and tags
- Category filtering
- Tag filtering
- Sort by updated_at (most recent first)
- Configurable limit

#### Dynamic Skills (`dynamic-skills/`)

**Storage** (`storage.ts`):
- JSON file: `skills/skills.json`
- Array of StoredSkill objects
- In-memory cache for fast access
- Atomic writes to prevent corruption

**Invoker** (`invoker.ts`):
- Placeholder replacement: `{{name}}` → value
- Validates required placeholders present
- Uses Claude API for skill execution
- Returns SkillInvocationResult

**Server** (`server.ts`):
- Management tools:
  - create_skill
  - list_skills
  - update_skill
  - delete_skill
  - invoke_skill
- Dynamic tool registration:
  - Each skill becomes an MCP tool
  - Tool schema generated from placeholders
  - Direct invocation by skill name

**Skill Execution Flow**:
```
1. Load skill by ID or name
2. Validate required placeholders provided
3. Replace {{placeholders}} in template
4. Send constructed prompt to Claude API
5. Return result as plain text
```

**Example**:
```json
{
  "name": "email-formatter",
  "prompt_template": "Format professionally: {{text}}",
  "input_placeholders": [
    {"name": "text", "description": "Text to format", "required": true}
  ]
}
```

Invocation: `{"text": "hey send report"}`
→ Prompt: "Format professionally: hey send report"
→ Result: "Dear colleague, Could you please send the report?..."

#### Mock Skills (`mock-skills/`)

**Meeting Scheduler** (`meeting-scheduler.ts`):
- Tools: schedule_meeting, find_available_slots
- Returns formatted mock responses
- Demonstrates multi-tool service pattern

**Document Summarizer** (`document-summarizer.ts`):
- Tools: summarize_document, extract_key_points, generate_abstract
- Returns canned summaries based on length parameter
- Demonstrates parameter handling

### CLI (`src/cli/`)

**Architecture**:
- SchruteCLI class encapsulates all state
- REPL using Node.js `readline` module
- Command dispatcher with async support
- Graceful error handling

**State Management**:
```typescript
class SchruteCLI {
  private emails: Email[]
  private threads: EmailThread[]
  private speechActStore: SpeechActStore
  private privacyTracker: PrivacyTracker
  private queryHandler: QueryHandler
  private personalityLoader: PersonalityLoader
  private mcpClient: MCPClientManager
  private currentPersonality: PersonalityConfig
  private useMemorySystem: boolean
}
```

**Command Categories**:
1. Core: load, query, acts, threads, status, help, exit
2. Personality: personality, personalities
3. Memory: memory
4. MCP: mcp connect/list/tools/invoke
5. Knowledge: knowledge list/search/get
6. Skills: skills list/invoke

**Input Parsing**:
```
input: "mcp connect knowledge-store node dist/..."
↓
command: "mcp"
args: "connect knowledge-store node dist/..."
↓
handleMCPCommand(args)
↓
subcommand: "connect"
rest: "knowledge-store node dist/..."
↓
mcpConnect("knowledge-store node dist/...")
```

## Data Flow

### Email Processing Pipeline

```
YAML File
  ↓
loadEmailsFromYaml()
  ↓
Email[] (validated)
  ↓
buildThreads()
  ↓
EmailThread[]
  ↓
privacyTracker.trackEmails()
  ↓
speechActDetector.detectBatch()
  ↓
SpeechAct[]
  ↓
speechActStore.addMany()
privacyTracker.trackSpeechActs()
  ↓
activationDecider.shouldRespondBatch()
  ↓
Map<message_id, ActivationDecision>
```

### Query Processing Pipeline

```
User Query
  ↓
QueryRequest {
  query, asker, context_participants
}
  ↓
queryHandler.handleQuery()
  ↓
├─ Gather emails (all)
├─ Gather speech acts (all)
├─ Gather knowledge (via MCP)
  ↓
├─ privacyFilter.filterEmails()
├─ privacyFilter.filterSpeechActs()
├─ privacyFilter.filterKnowledge()
  ↓
Build context {
  emails (filtered),
  speech_acts (filtered),
  knowledge (filtered)
}
  ↓
Format prompt with personality
  ↓
claudeClient.prompt()
  ↓
QueryResponse {
  answer,
  sources,
  privacy_restricted
}
```

### MCP Tool Invocation Flow

```
CLI: "knowledge list"
  ↓
mcpClient.invokeToolByName("list_knowledge", {})
  ↓
Find tool → server: knowledge-store
  ↓
client.callTool("list_knowledge", {})
  ↓
[Stdio IPC to server process]
  ↓
Server: knowledge-store
  ↓
storage.list({})
  ↓
Read knowledge/*.md files
Parse YAML frontmatter
Filter by criteria
Sort by updated_at
  ↓
Return JSON array
  ↓
[Stdio IPC back to client]
  ↓
MCPToolResult {success, result}
  ↓
CLI: Display formatted results
```

## Design Decisions

### Why YAML for Mock Emails?

- **Readability**: Easier to write and edit than JSON
- **Multiline**: Natural support for email bodies
- **Comments**: Can annotate test scenarios
- **Validation**: Zod provides runtime validation
- **Phase 1 Only**: Real emails in Phase 2 will use SES/IMAP

### Why In-Memory Storage?

- **Speed**: No I/O latency for Phase 1 testing
- **Simplicity**: No database setup required
- **Serializable**: Easy to save/load for persistence later
- **Phase 1 Only**: DynamoDB in Phase 2

### Why MCP for Extensibility?

- **Standard Protocol**: Industry-standard Model Context Protocol
- **Runtime Addition**: Add servers without code changes
- **Process Isolation**: Servers run in separate processes
- **Language Agnostic**: Servers can be written in any language
- **Tool Discovery**: Automatic tool registration

### Why Hybrid Memory?

- **Token Efficiency**: Reduces token usage by 80-90% for long threads
- **Context Quality**: Recent messages in full, older summarized
- **Configurable**: Thresholds can be tuned per use case
- **LLM-Generated**: Summaries use same LLM for consistency

### Why Singleton Patterns?

- **Consistent State**: Single source of truth
- **Resource Management**: One API key, one config
- **Simple Access**: No dependency injection needed
- **Phase 1 Appropriate**: More complex patterns later if needed

### Why No Tests Yet?

- **Exploratory Phase**: Validating architecture before locking in contracts
- **High Iteration**: Frequent changes make tests expensive
- **Phase 2 Priority**: Test suite planned for production features
- **Manual Testing**: CLI provides interactive testing

## Privacy Model Details

### Participant Tracking

Each message creates entries in ParticipantContext:

```
Email: Alice → Bob, Carol
  ↓
participantContexts:
  alice@company.com: {
    accessible_messages: [msg-001],
    accessible_speech_acts: [act-001, act-002],
    first_seen: 2025-01-15T10:00:00Z
  }
  bob@company.com: {...}
  carol@company.com: {...}
```

### Access Control Algorithm

```python
def can_access(current_participants, source_message_participants):
    for participant in current_participants:
        if participant not in source_message_participants:
            return False, f"Due to presence of {participant}"
    return True, None
```

### Example Scenarios

**Scenario 1: Public Information**
```
Message 1: Alice → Bob, Carol
  "Project budget is $50k"

Query from Alice, Bob, Carol context:
  ✓ All participants saw message
  → Share information
```

**Scenario 2: Private Information**
```
Message 1: Alice → Bob
  "Project budget is $50k"

Message 2: Alice → Bob, Carol
  "Can you send the budget to Carol?"

Query from Alice, Bob, Carol context:
  ✗ Carol didn't see Message 1
  → Deny with: "Due to presence of Carol"
```

**Scenario 3: Knowledge Privacy**
```
Knowledge Entry:
  participants: [Alice, Bob]
  content: "Salary increase: 5%"

Query from Alice, Bob, Dave context:
  ✗ Dave not in entry.participants
  → Deny
```

## Performance Considerations

### Token Usage

**Without Memory** (100 emails, 500 tokens each):
- Total: ~50,000 tokens per query
- Cost: ~$0.15 per query (at $3/1M input tokens)

**With Memory** (10 recent full, 90 in 18 summaries):
- Recent: 10 × 500 = 5,000 tokens
- Summaries: 18 × 200 = 3,600 tokens
- Total: ~8,600 tokens per query
- Cost: ~$0.026 per query
- **Savings: 83%**

### MCP Communication

**Stdio Transport**:
- Low latency: <10ms for local processes
- No network overhead
- Simple protocol
- Standard JSON-RPC

**Bottlenecks**:
- LLM API calls (1-3 seconds)
- File I/O for knowledge/skills (negligible)
- Speech act detection for large batches

### Optimization Opportunities

1. **Caching**:
   - Cache speech act detection results
   - Cache email summaries
   - Cache knowledge search results

2. **Batching**:
   - Batch speech act detection
   - Batch activation decisions

3. **Parallel Processing**:
   - Detect speech acts in parallel
   - Query multiple MCP servers concurrently

## Security Considerations

### Phase 1 (Current)

- Local execution only
- No network exposure
- API key in environment variable
- Knowledge/skills in local files

### Phase 2 (Planned)

- AWS deployment considerations
- Secrets Manager for API keys
- IAM roles for service access
- VPC isolation for MCP servers
- Encryption at rest (DynamoDB, S3)
- TLS for email (SES)

## Future Enhancements

### Short Term

- Test suite (Jest)
- Error recovery for MCP connections
- Streaming responses for long queries
- Web UI for CLI features

### Medium Term

- AWS Lambda deployment
- SES integration for real emails
- DynamoDB for persistent storage
- RAG for knowledge retrieval (vector embeddings)

### Long Term

- Action-taking capabilities (draft replies, create tasks)
- Multi-tenant support
- Calendar integration
- Slack/Teams integration
- Analytics dashboard

## Conclusion

Schrute's architecture prioritizes:

1. **Modularity**: Clear separation of concerns
2. **Extensibility**: MCP for runtime capabilities
3. **Privacy**: Conservative information sharing
4. **LLM-Native**: Leverage Claude for intelligent tasks
5. **Iteration**: Simple patterns that can evolve

Phase 1 validates core concepts. Phase 2 will add production features while maintaining these principles.
