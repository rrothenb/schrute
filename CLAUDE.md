# Schrute - AI Coordination Assistant Framework

## 🎯 Project Context
AI coordination assistant using email interface.

**Phase 1 (COMPLETE):** Local prototype with CLI
- ✅ Speech act detection from emails
- ✅ Natural language queries about detected speech acts
- ✅ Privacy-respecting information access
- ✅ Personality system with configurable response styles
- ✅ Hybrid memory system for efficient context management
- ✅ MCP integration for extensibility (Knowledge Store + Dynamic Skills)
- ✅ Interactive CLI for testing and demonstration

**Phase 2 (COMPLETE):** Production AWS deployment
- ✅ Real email integration via Amazon SES
- ✅ Serverless architecture with Lambda functions
- ✅ Scalable storage (S3 + DynamoDB)
- ✅ Enhanced context assembly with relevance ranking
- ✅ Secure secrets management
- ✅ Comprehensive deployment automation via AWS SAM
- ✅ Backward compatible with Phase 1 local testing

**Phase 3 (COMPLETE):** Example Applications
- ✅ Smykowski: AI Project Coordinator for GitHub
- ✅ Full GitHub integration (Issues, PRs, Wiki, Discussions, Projects)
- ✅ LLM-powered extractors (action items, commitments, dates, dependencies)
- ✅ ML-based expertise tracking and workload balancing
- ✅ Core coordination workflows (meeting followup, deadline tracking, PR review, etc.)
- ✅ Complete AWS deployment infrastructure
- ✅ Demonstrates extension patterns without modifying Schrute core

## 📚 Tech Stack
- Runtime: Node.js 18+
- Language: TypeScript 5 (strict mode)
- Cloud: AWS (SES, Lambda, DynamoDB, S3, Secrets Manager)
- Deployment: AWS SAM (Serverless Application Model)
- LLM: Anthropic Claude API (claude-3-5-sonnet-20241022)
- Email: mailparser for EML format parsing
- MCP: Model Context Protocol SDK for extensibility
- Testing: Jest with TypeScript + ESM (93 tests: 37 unit, 8 integration, 48 live API)

## 📁 Project Structure

```
schrute/
├── src/
│   ├── lib/                          # Core libraries
│   │   ├── types/                    # Shared TypeScript types
│   │   ├── email/                    # Email parsing, threading, EML parser
│   │   ├── speech-acts/              # Speech act detection & storage
│   │   ├── privacy/                  # Participant tracking & filtering
│   │   ├── query/                    # Query handling & context assembly
│   │   ├── personality/              # Personality system
│   │   ├── activation/               # Activation decision logic
│   │   ├── memory/                   # Hybrid memory + context assembler
│   │   ├── claude/                   # Claude API client wrapper
│   │   ├── storage/                  # Storage abstraction (S3, DynamoDB)
│   │   └── mcp/                      # MCP client manager
│   ├── mcp-servers/                  # MCP server implementations
│   │   ├── knowledge-store/          # Markdown-based knowledge storage
│   │   ├── dynamic-skills/           # Runtime skill creation system
│   │   └── mock-skills/              # Example mock services
│   ├── cli/                          # Interactive CLI tool
│   └── lambdas/                      # Lambda function handlers
│       ├── ingest/                   # Email ingestion handler
│       ├── processor/                # Speech act + activation handler
│       └── responder/                # Response generation handler
├── events/                           # Mock email YAML files (local testing)
├── personalities/                    # Personality configurations
├── knowledge/                        # Knowledge store markdown files
├── skills/                           # Dynamic skills JSON storage
├── examples/                         # Example applications (Phase 3)
│   └── smykowski/                    # GitHub project coordinator
│       ├── src/
│       │   ├── lib/
│       │   │   ├── types/            # Smykowski-specific types
│       │   │   ├── github/           # GitHub API integration
│       │   │   ├── extractors/       # LLM-powered extractors
│       │   │   ├── workflows/        # Coordination workflows
│       │   │   ├── storage/          # DynamoDB storage
│       │   │   ├── integrations/     # Schrute bridge
│       │   │   └── wiki/             # Wiki generation
│       │   ├── lambdas/              # Lambda handlers
│       │   └── mcp-servers/          # Custom MCP servers
│       ├── __tests__/                # Test suite
│       ├── template.yaml             # AWS SAM template
│       ├── ARCHITECTURE.md
│       ├── DEPLOYMENT.md
│       └── README.md                 # Full feature description
├── dist/                             # Build output (gitignored)
├── template.yaml                     # AWS SAM template (Phase 2)
├── ARCHITECTURE-PHASE2.md            # Phase 2 architecture documentation
└── DEPLOYMENT.md                     # Deployment guide
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

## 🏗️ Phase 2 Architecture (Production AWS)

### AWS Serverless Pipeline

**Email Flow:**
```
SES receives email
    ↓
S3 (raw EML)
    ↓ S3 event trigger
Ingest Lambda → Parse EML → Store in DynamoDB + S3
    ↓ async invoke
Processor Lambda → Detect speech acts → Check activation
    ↓ async invoke (if should respond)
Responder Lambda → Assemble context → Generate response → Send via SES
```

**Storage Architecture:**
- **S3 Buckets:**
  - `emails-raw`: Raw EML files from SES (90-day retention)
  - `emails-processed`: Parsed JSON (90-day retention)
  - `knowledge`: Markdown knowledge entries (permanent)
  - `personalities`: Personality YAML configs (permanent)
  - `skills`: Dynamic skill definitions (permanent)

- **DynamoDB Tables:**
  - `threads`: Thread metadata, participants
  - `messages`: Message index with GSI on thread_id-timestamp
  - `speech-acts`: Speech act index with GSIs on thread_id and type
  - `activation-log`: Record of activation decisions

**Lambda Functions:**
1. **Ingest** (512MB, 30s): Parse emails, store metadata
2. **Processor** (1024MB, 60s): Detect speech acts, decide activation
3. **Responder** (1024MB, 120s): Generate and send responses

**Enhanced Context Assembly:**
- Sliding window: Recent N messages (full, default 10)
- Older messages: Summarized for context
- Relevance boosting: Messages with speech acts prioritized
- MCP skill relevance: Keyword-based boosting
- Token budget management: ~46K tokens for context
- Graceful degradation: Trim oldest summaries if needed

**Security:**
- Secrets Manager for Anthropic API key
- IAM roles with least privilege
- S3 encryption at rest (AES-256)
- DynamoDB encryption at rest
- CloudWatch Logs for audit trail

**Deployment:**
- AWS SAM for infrastructure as code
- One-command deployment: `npm run deploy`
- Parameterized configuration
- CloudFormation stack management

See **ARCHITECTURE-PHASE2.md** for detailed architecture documentation.
See **DEPLOYMENT.md** for step-by-step deployment guide.

## 🏗️ Phase 3 - Example Applications

### Smykowski: AI Project Coordinator for GitHub

**Location**: `examples/smykowski/`

Smykowski demonstrates how to build specialized coordination assistants on top of Schrute without modifying the core framework.

**Key Features**:
- **GitHub Integration**: Full API integration (Issues, PRs, Wiki, Discussions, Projects v2)
- **LLM-Powered Extractors**: Extract action items, commitments, and dates from natural language
- **ML-Based Expertise Tracking**: Learn team member expertise from GitHub activity
- **Coordination Workflows**:
  - Meeting Followup: Convert notes → GitHub issues
  - Deadline Tracking: Monitor commitments, send reminders
  - PR Review Coordination: Track reviews, escalate stale PRs
  - Status Synthesis: Generate project status reports
  - Workload Balancing: Identify and resolve team workload imbalances

**Architecture Pattern**:
```typescript
// Smykowski extends Schrute through composition
import { SchruteBridge } from './integrations/schrute-bridge.js'
import { GitHubService } from './github/index.js'

// Bridge provides access to Schrute's core features
const schrute = new SchruteBridge({ claudeApiKey })
const speechActs = await schrute.detectSpeechActs(email)

// Smykowski adds GitHub-specific functionality
const github = new GitHubService(token, repo, webhookSecret)
await github.issues.create({ title, body, assignees })
```

**Deployment**:
```bash
cd examples/smykowski
npm install
npm run build:lambda
npm run deploy
```

**Storage**:
- **GitHub**: Human-readable state (issues, wiki, discussions)
- **DynamoDB**: Internal state (commitments, team state, metrics)
- **Schrute Integration**: Inherits privacy, speech acts, personality

**Documentation**:
- `examples/smykowski/README.md` - Feature description
- `examples/smykowski/ARCHITECTURE.md` - Technical architecture
- `examples/smykowski/DEPLOYMENT.md` - Deployment guide

See Smykowski as a reference for building your own Schrute-based coordination assistants.

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

**Current State:**
- ✅ Phase 1: Complete and functional (local CLI testing)
- ✅ Phase 2: Complete and ready for deployment (AWS production)
- ✅ Phase 3: Complete with Smykowski example application

**Key Principles:**
- Focus on modular, production-quality code
- MCP provides extensibility without core changes
- Storage abstraction allows local and cloud operation
- Extension pattern: Build on Schrute without modifying core
- Backward compatible: CLI still works with YAML files
- Forward compatible: Lambda handlers use same core libraries

**Development Modes:**
- **Local Development:** Use CLI with YAML mock emails (`npm run dev`)
- **Production:** Deploy to AWS with SAM (`npm run deploy`)
- **Testing:** Unit tests work without AWS (`npm test:unit`)
- **Example Apps:** Build specialized assistants in `examples/` directory

**Building on Schrute (Phase 3 Pattern):**
1. Create new directory under `examples/`
2. Import Schrute components via `@schrute/*` alias
3. Add specialized functionality (e.g., GitHub integration)
4. Deploy independently with own SAM template
5. Reference Smykowski as implementation guide

**Next Steps (Future Enhancements):**
- Additional example applications (Slack coordinator, Jira sync, etc.)
- Vector embeddings for semantic search
- Enhanced MCP skill discovery
- Web dashboard for monitoring
- Multi-region deployment
- Official GitHub MCP server integration
