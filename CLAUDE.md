# Schrute - AI Coordination Assistant Framework

## 🎯 Project Context
AI coordination assistant using email interface. Phase 1 prototype is **COMPLETE**:
- ✅ Speech act detection from emails
- ✅ Natural language queries about detected speech acts
- ✅ Privacy-respecting information access
- ✅ Personality system with configurable response styles
- ✅ Hybrid memory system for efficient context management
- ✅ MCP integration for extensibility (Knowledge Store + Dynamic Skills)
- ✅ Interactive CLI for testing and demonstration
- Foundation for future action-taking capabilities

## 📚 Tech Stack
- Runtime: Node.js 18+
- Language: TypeScript 5 (strict mode)
- Cloud: AWS (SES, DynamoDB) - deployment via SAM when ready (Phase 2)
- LLM: Anthropic Claude API (claude-3-5-sonnet-20241022)
- MCP: Model Context Protocol SDK for extensibility
- Testing: Jest with TypeScript + ESM (93 tests: 37 unit, 8 integration, 48 live API)

## 📁 Project Structure

```
schrute/
├── src/
│   ├── lib/                          # Core libraries
│   │   ├── types/                    # Shared TypeScript types
│   │   ├── email/                    # Email parsing, threading
│   │   ├── speech-acts/              # Speech act detection & storage
│   │   ├── privacy/                  # Participant tracking & filtering
│   │   ├── query/                    # Query handling & context assembly
│   │   ├── personality/              # Personality system
│   │   ├── activation/               # Activation decision logic
│   │   ├── memory/                   # Hybrid memory management
│   │   ├── claude/                   # Claude API client wrapper
│   │   └── mcp/                      # MCP client manager
│   ├── mcp-servers/                  # MCP server implementations
│   │   ├── knowledge-store/          # Markdown-based knowledge storage
│   │   ├── dynamic-skills/           # Runtime skill creation system
│   │   └── mock-skills/              # Example mock services
│   ├── cli/                          # Interactive CLI tool
│   └── lambdas/                      # Lambda functions (future)
├── events/                           # Mock email YAML files
├── personalities/                    # Personality configurations
├── knowledge/                        # Knowledge store markdown files
├── skills/                           # Dynamic skills JSON storage
├── dist/                             # Build output (gitignored)
└── template.yaml                     # AWS SAM template (future)
```

## 📝 TypeScript Standards
- Strict mode enabled (`tsconfig.json`)
- No `any` types - use proper types or `unknown`
- Path alias: `~/*` maps to `./src/*`
- Export shared types from `~/lib/types`

## 🎨 Code Style
- No semicolons (project standard)
- Prettier for formatting
- ESLint for linting
- Single quotes for strings

## 🏗️ Phase 1 Architecture

### Core Components

**Email Processing Pipeline:**
1. Parse YAML email files → validate structure
2. Build conversation threads by thread_id
3. Track participant access for privacy
4. Detect speech acts (requests, commitments, decisions, etc.)
5. Check activation (should Schrute respond?)

**Query System:**
1. Accept natural language query
2. Assemble context (emails + speech acts + knowledge)
3. Apply privacy filtering
4. Generate response using Claude API with personality
5. Return answer with source tracking

**Memory System:**
- Hybrid approach: Recent N messages (full) + older messages (summarized)
- Configurable thresholds (default: 10 recent, rest summarized)
- Reduces token usage for long email threads
- Maintains context quality

**MCP Integration:**
- Client manages connections to multiple MCP servers
- Knowledge Store: Markdown files with YAML frontmatter
- Dynamic Skills: LLM-powered tools created at runtime
- Extensible: Add new servers without code changes

### Privacy Model

- **Participant Tracking:** Every message has a participant list (from, to, cc)
- **Access Control:** Information only shared if ALL current participants have seen source messages
- **Explicit Denials:** When blocked, system names who is restricting access
- **Conservative:** When uncertain, restrict access

Phase 1 is purely prototyping: No lambdas, no SES, local execution only

## 📧 Email YAML Format

Mock email files in `events/` use this structure:

```yaml
- message_id: msg-001
  thread_id: thread-alpha
  from:
    email: alice@company.com
    name: Alice Johnson
  to:
    - email: bob@company.com
      name: Bob Smith
  cc: []
  subject: Project Alpha Kickoff
  body: |
    Hi Bob,

    Let's kick off Project Alpha next week.
    Can you commit to having the spec ready by Friday?
  timestamp: '2025-01-15T10:00:00Z'
  in_reply_to: null  # For threading
```

**Key Fields:**
- `message_id`: Unique identifier
- `thread_id`: Groups related messages
- `timestamp`: ISO 8601 format
- `in_reply_to`: References parent message for threading

## 🎭 Personality Configuration Format

Personality YAML files in `personalities/`:

```yaml
name: dwight-schrute
description: Overly serious assistant manager personality
tone: serious, intense, procedural
speaking_style: formal, rule-focused, slightly condescending
constraints:
  - Always reference procedures and rules
  - Take everything very seriously
  - Emphasize hierarchy and proper channels
example_phrases:
  - "According to company policy..."
  - "As Assistant Regional Manager..."
  - "This is a matter of utmost importance."
system_prompt_additions: |
  You are Dwight Schrute, Assistant Regional Manager.
  You take your responsibilities extremely seriously and always
  follow proper procedures. You speak formally and emphasize
  the importance of rules and hierarchy.
```

**Available Personalities:**
- `default`: Professional, helpful baseline
- `dwight-schrute`: Serious, procedural, intense
- `louie-de-palma`: Grumpy, sarcastic, efficient
- `tom-smykowski`: Anxious, eager to please

## 🔌 MCP Server Specifications

### Knowledge Store Server

**Purpose:** Persistent storage of decisions, commitments, and project knowledge

**Tools:**
- `store_knowledge`: Create new knowledge entry
- `retrieve_knowledge`: Get entry by ID
- `search_knowledge`: Full-text search across content
- `list_knowledge`: Browse entries by category
- `delete_knowledge`: Remove entry

**Storage:** Markdown files in `knowledge/` with YAML frontmatter
**Categories:** decision, commitment, project_info, person, preference

**Example Entry:**
```markdown
---
id: uuid-here
category: decision
title: Use TypeScript for Phase 1
participants:
  - email: alice@company.com
    name: Alice Johnson
tags: [tech-stack, typescript]
created_at: '2025-01-15T10:00:00Z'
---
Team decided to use TypeScript for Phase 1 implementation
due to strong typing and better IDE support.
```

### Dynamic Skills Server

**Purpose:** Runtime creation of LLM-powered tools

**Tools:**
- `create_skill`: Define new skill with template
- `list_skills`: View all skills
- `update_skill`: Modify existing skill
- `delete_skill`: Remove skill
- `invoke_skill`: Execute skill with arguments
- Dynamic tools for each created skill

**Storage:** JSON file at `skills/skills.json`

**Skill Structure:**
```json
{
  "name": "email-summarizer",
  "description": "Summarizes email threads",
  "prompt_template": "Summarize this email: {{content}}",
  "input_placeholders": [
    {
      "name": "content",
      "description": "Email content to summarize",
      "required": true
    }
  ]
}
```

### Mock Skills Servers

Example servers demonstrating MCP patterns:
- **meeting-scheduler**: Mock meeting scheduling
- **document-summarizer**: Mock document analysis

## 🛠️ Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add: CLAUDE_API_KEY=sk-ant-...

# Build
npm run build
```

### Running the CLI
```bash
# Development mode (auto-recompile)
npm run dev

# Production mode (after build)
npm run cli
```

### Using the CLI

**Basic Workflow:**
```
schrute> load events/thread-project-alpha.yaml
schrute> query What decisions have been made?
schrute> acts decision
schrute> personality dwight-schrute
schrute> query What decisions have been made?
```

**MCP Integration:**
```
# Connect to Knowledge Store
schrute> mcp connect knowledge-store node dist/mcp-servers/knowledge-store/server.js

# Connect to Dynamic Skills
schrute> mcp connect dynamic-skills node dist/mcp-servers/dynamic-skills/server.js

# List connected servers
schrute> mcp list

# Browse tools
schrute> mcp tools

# Use knowledge store
schrute> knowledge list
schrute> knowledge search "budget"

# Use dynamic skills
schrute> skills list
```

### Creating Dynamic Skills

Use MCP invoke to create skills:
```
schrute> mcp invoke create_skill {"name":"email-formatter","description":"Formats emails professionally","prompt_template":"Format this email professionally: {{text}}","input_placeholders":[{"name":"text","description":"Email text","required":true}]}
```

### Testing Privacy

```
schrute> load events/thread-mixed-participants.yaml
schrute> query What is the budget for raises?
# Should see: "Cannot reveal due to presence of..."
```

### Testing

Schrute includes a comprehensive automated test suite:

**Test Structure:**
```bash
# Run all tests (93 total)
npm test

# Run unit tests only (37 tests, fast, no API key)
npm test -- parser.test.ts store.test.ts tracker.test.ts

# Run live API tests (48 tests, requires API key)
export CLAUDE_API_KEY=sk-ant-...
npm test -- *.live.test.ts
```

**Test Categories:**
- **Unit Tests (37):** Email parser, speech act store, privacy tracker, personality loader, MCP types
- **Integration Tests (8):** Component integration, sample scenario processing, end-to-end workflows
- **Live API Tests (48):** Query handler, activation decider, memory summarizer, dynamic skills invoker

**Key Features:**
- Automatic skipping of API tests when `CLAUDE_API_KEY` not set
- Estimated API cost per full run: ~$0.17-0.32
- Jest with TypeScript + ESM support
- Module name mapping for `~/*` path alias
- Coverage collection configured

See **TESTING.md** for comprehensive testing documentation including:
- Detailed test organization
- Cost breakdowns by component
- Writing new tests
- CI/CD integration strategies

## 🚫 Never Edit
- `LICENSE` file
- `.aws-sam/` directory (SAM build artifacts)
- `dist/` directory (build output)

## 💡 Development Approach
- Phase 1 is complete and functional
- Focus on modular, production-quality code
- MCP provides extensibility without core changes
- Ready for Phase 2: AWS deployment, real email integration
