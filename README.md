# Schrute - AI Coordination Assistant

> "Identity theft is not a joke, Jim! Millions of families suffer every year!"

A production-ready AI coordination assistant framework that tracks decisions, commitments, and context across email conversations. Built with privacy-first design, AWS serverless architecture, extensible MCP integration, and configurable personalities.

**Status:** All three development phases complete and production-ready.

- ✅ **Phase 1:** Local CLI prototype with speech act detection, privacy filtering, and MCP extensibility
- ✅ **Phase 2:** AWS serverless deployment with real email integration (SES), Lambda functions, and scalable storage
- ✅ **Phase 3:** Example application (Smykowski) demonstrating GitHub project coordination

## ✨ Features

### Core Framework (Phase 1 + 2)
- 🎯 **Speech Act Detection** - Automatically identifies requests, commitments, decisions, questions, and more
- 🔒 **Privacy-Aware** - Respects participant visibility and never leaks information inappropriately
- 🧠 **Hybrid Memory** - Efficient context management with full recent messages + summarized older ones
- 🎭 **Personalities** - Configurable response styles (Dwight Schrute, Louie De Palma, Tom Smykowski, etc.)
- 🔌 **MCP Integration** - Extensible via Model Context Protocol (Knowledge Store + Dynamic Skills)
- 💬 **Interactive CLI** - Full-featured command-line interface for testing and demonstration
- 📧 **Email Threading** - Understands conversation context and relationships
- 🤖 **Activation Logic** - Intelligently decides when to respond based on context

### Production Deployment (Phase 2)
- ☁️ **AWS Serverless** - Lambda functions with automatic scaling
- 📬 **Real Email Integration** - Amazon SES for sending and receiving emails
- 🗄️ **Scalable Storage** - S3 for email archives, DynamoDB for metadata and speech acts
- 🔐 **Secure** - AWS Secrets Manager, encryption at rest, least-privilege IAM roles
- 🚀 **One-Command Deploy** - AWS SAM for infrastructure as code

### Example Applications (Phase 3)
- 🐙 **Smykowski** - GitHub project coordinator with issue tracking, PR management, and workload balancing
- 📊 **Extension Pattern** - Build specialized assistants without modifying core framework

## 🚀 Quick Start

### Local Development (Phase 1)

**Prerequisites:**
- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com/))

**Installation:**
```bash
# Clone the repository
git clone https://github.com/yourusername/schrute.git
cd schrute

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add: CLAUDE_API_KEY=sk-ant-...

# Build the project
npm run build
```

**Run the CLI:**
```bash
# Development mode (auto-recompile with tsx)
npm run dev

# Production mode (after build)
npm run cli
```

### AWS Deployment (Phase 2)

**Prerequisites:**
- AWS account with SES configured
- AWS CLI installed and configured
- SAM CLI installed

**Deploy to AWS:**
```bash
# Build and deploy
npm run deploy

# Quick redeploy (after first deployment)
npm run deploy:quick
```

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed deployment instructions including:
- SES domain verification
- Email routing setup
- Parameter configuration
- Testing the deployment

### Smykowski Example (Phase 3)

To deploy the GitHub project coordinator example:

```bash
cd examples/smykowski
npm install
npm run build:lambda
npm run deploy
```

See **[examples/smykowski/README.md](examples/smykowski/README.md)** for complete feature documentation and **[examples/smykowski/DEPLOYMENT.md](examples/smykowski/DEPLOYMENT.md)** for deployment guide.

## 📖 Usage Guide

### Basic Email Processing

```
schrute> load events/thread-project-alpha.yaml
✓ Loaded 5 emails in 1 thread(s)
Detecting speech acts...
✓ Detected 12 speech acts

schrute> query What decisions have been made?
Answer:
The team has made the following key decisions:
1. Project Alpha will launch in Q2
2. Bob Smith will lead the technical implementation
3. Budget is approved at $50,000

schrute> acts decision
Speech Acts (DECISION):

[decision] Launch Project Alpha in Q2
  By: Alice Johnson
  When: 2025-01-15T10:00:00Z
  Confidence: 95%
...
```

### Personality System

Switch between different response styles:

```
schrute> personality dwight-schrute
✓ Switched to personality: dwight-schrute
  Tone: serious, intense, procedural
  Style: formal, rule-focused, slightly condescending

schrute> query What decisions have been made?
Answer:
According to the official project documentation and proper hierarchical
channels, the following decisions have been recorded with utmost precision...
```

Available personalities:
- **default** - Professional, helpful baseline
- **dwight-schrute** - Serious, procedural, rules-focused
- **louie-de-palma** - Grumpy, sarcastic, efficient
- **tom-smykowski** - Anxious, eager to please, people-person

### MCP Integration

#### Connect to Knowledge Store

```
schrute> mcp connect knowledge-store node dist/mcp-servers/knowledge-store/server.js
✓ Connected to knowledge-store
  Tools available: 5

schrute> knowledge list
Knowledge Entries:

[decision] Use TypeScript for Phase 1
  ID: abc-123
  Updated: 2025-01-15T10:00:00Z

[commitment] Bob commits to spec by Friday
  ID: def-456
  Updated: 2025-01-15T11:30:00Z
```

#### Connect to Dynamic Skills

```
schrute> mcp connect dynamic-skills node dist/mcp-servers/dynamic-skills/server.js
✓ Connected to dynamic-skills
  Tools available: 5

schrute> skills list
Dynamic Skills:

email-formatter
  Formats emails professionally
  Placeholders: text

schrute> skills invoke email-formatter {"text":"hey can u send that report"}
Result:
Dear Colleague,

I hope this message finds you well. Would you be able to send
the report at your earliest convenience?

Best regards
```

### Creating Dynamic Skills

Use the MCP interface to create custom skills:

```
schrute> mcp invoke create_skill {
  "name": "meeting-summarizer",
  "description": "Summarizes meeting notes",
  "prompt_template": "Summarize these meeting notes concisely:\n\n{{notes}}",
  "input_placeholders": [
    {
      "name": "notes",
      "description": "Meeting notes to summarize",
      "required": true
    }
  ]
}
✓ Skill created

schrute> skills invoke meeting-summarizer {"notes":"Discussed Q2 roadmap..."}
```

### Privacy Testing

```
schrute> load events/thread-mixed-participants.yaml
✓ Loaded 3 emails in 1 thread(s)

schrute> query What is the budget for raises?
⚠️  Cannot reveal information due to the presence of: Dave Wilson
   This information was only shared between Alice, Bob, and Carol.
```

### Memory System

Toggle between full context and hybrid memory:

```
schrute> memory on
✓ Hybrid memory system enabled
  Queries will use recent messages + summaries for older messages

schrute> memory off
✓ Hybrid memory system disabled
  Queries will use all messages directly (legacy mode)
```

## 📂 Project Structure

```
schrute/
├── src/
│   ├── lib/                       # Core libraries
│   │   ├── types/                 # TypeScript types
│   │   ├── email/                 # Email parsing & threading
│   │   ├── speech-acts/           # Speech act detection
│   │   ├── privacy/               # Privacy filtering
│   │   ├── query/                 # Query handling
│   │   ├── personality/           # Personality system
│   │   ├── activation/            # Activation logic
│   │   ├── memory/                # Memory management
│   │   ├── claude/                # Claude API wrapper
│   │   ├── storage/               # Storage abstraction (S3/DynamoDB)
│   │   └── mcp/                   # MCP client
│   ├── mcp-servers/               # MCP server implementations
│   │   ├── knowledge-store/       # Knowledge storage
│   │   ├── dynamic-skills/        # Runtime skills
│   │   └── mock-skills/           # Example servers
│   ├── lambdas/                   # AWS Lambda functions (Phase 2)
│   │   ├── ingest/                # Email ingestion
│   │   ├── processor/             # Speech act detection + activation
│   │   └── responder/             # Response generation
│   └── cli/                       # Interactive CLI
├── examples/
│   └── smykowski/                 # GitHub coordinator example (Phase 3)
│       ├── src/                   # Smykowski source code
│       ├── __tests__/             # Comprehensive test suite
│       ├── template.yaml          # AWS SAM template
│       └── README.md              # Feature documentation
├── events/                        # Mock email YAML files
├── personalities/                 # Personality configs
├── knowledge/                     # Knowledge store files
├── skills/                        # Dynamic skills storage
├── template.yaml                  # AWS SAM template (Phase 2)
├── ARCHITECTURE-PHASE2.md         # Phase 2 architecture docs
└── DEPLOYMENT.md                  # Deployment guide
```

## 🏗️ Architecture

### Deployment Modes

**Local CLI (Phase 1):**
- YAML email files for testing
- In-memory storage
- Interactive command-line interface
- Perfect for development and experimentation

**AWS Serverless (Phase 2):**
```
SES receives email → S3 (raw EML) → Ingest Lambda → DynamoDB + S3
                                          ↓
                                   Processor Lambda → Detect speech acts → Check activation
                                          ↓
                                   Responder Lambda → Generate response → Send via SES
```
- Automatic scaling with Lambda
- Persistent storage (S3 + DynamoDB)
- Real email integration via SES
- See [ARCHITECTURE-PHASE2.md](ARCHITECTURE-PHASE2.md) for details

### Speech Act Detection

Uses Claude API to identify speech acts in emails:

- **Requests** - "Can you send the report?"
- **Commitments** - "I'll have it done by Friday"
- **Decisions** - "We've decided to use TypeScript"
- **Questions** - "What's the timeline?"
- Plus: statements, greetings, acknowledgments, suggestions, objections, agreements

### Privacy Model

- Tracks which participants have seen which messages
- Only shares information if ALL current participants have access
- Provides explicit denials when information is restricted
- Conservative approach: when in doubt, restrict

### Hybrid Memory System

- Keeps recent N messages in full (default: 10)
- Summarizes older messages using Claude API
- Reduces token usage for long threads
- Maintains context quality

### MCP Extensibility

Two built-in MCP servers:

**Knowledge Store:**
- Markdown files with YAML frontmatter
- Full-text search across content
- Category-based organization
- Privacy metadata tracking

**Dynamic Skills:**
- Runtime skill creation
- Template-based prompts with placeholders
- LLM-powered execution
- Stored in JSON

## 📝 Creating Mock Emails

Create YAML files in `events/`:

```yaml
- message_id: msg-001
  thread_id: thread-alpha
  from:
    email: alice@company.com
    name: Alice Johnson
  to:
    - email: bob@company.com
      name: Bob Smith
  subject: Project Alpha Kickoff
  body: |
    Hi Bob,

    Let's kick off Project Alpha next week.
    Can you commit to having the spec ready by Friday?
  timestamp: '2025-01-15T10:00:00Z'
```

## 🎭 Creating Personalities

Create YAML files in `personalities/`:

```yaml
name: my-personality
description: A custom personality
tone: friendly, casual
speaking_style: conversational, warm
constraints:
  - Use simple language
  - Be encouraging
example_phrases:
  - "That's a great question!"
  - "Let me help you with that."
system_prompt_additions: |
  You are a friendly, helpful assistant who speaks
  in a warm, conversational tone.
```

## 🔧 CLI Commands Reference

### Core Commands
- `load <file>` - Load and process email YAML file
- `query <question>` - Ask a question about emails
- `acts [type]` - List speech acts (optional: filter by type)
- `threads` - Show email threads
- `status` - Show current system status
- `help` - Show command help
- `exit` - Exit the CLI

### Personality Commands
- `personality <name>` - Switch to a personality
- `personalities` - List available personalities

### Memory Commands
- `memory [on|off]` - Toggle hybrid memory system

### MCP Commands
- `mcp connect <name> <command> [args]` - Connect to MCP server
- `mcp list` - List connected servers
- `mcp tools [server]` - List available tools
- `mcp invoke <tool> [JSON]` - Invoke MCP tool

### Knowledge Commands
- `knowledge list [category]` - List knowledge entries
- `knowledge search <query>` - Search knowledge
- `knowledge get <id>` - Retrieve specific entry

### Skills Commands
- `skills list` - List dynamic skills
- `skills invoke <name> [JSON]` - Execute a skill

## 🧪 Testing

### Running Tests

Schrute includes a comprehensive test suite with 93 tests:

```bash
# Run all tests (unit + integration)
npm test

# Run with coverage report
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

**Test Categories:**
- **37 unit tests** - Fast, no API key required
- **8 integration tests** - Component integration (some require API key)
- **48 live API tests** - Full Claude API integration (requires API key)

### Running Live API Tests

Live API tests require an Anthropic API key. They are automatically skipped if `CLAUDE_API_KEY` is not set:

```bash
# Set API key to run full test suite
export CLAUDE_API_KEY=sk-ant-your-key-here
npm test

# Run specific test suite
npm test -- handler.live.test.ts
```

**Estimated cost per full test run:** ~$0.17-0.32

See **[TESTING.md](TESTING.md)** for detailed information about:
- Test organization and structure
- Running specific test suites
- API cost breakdowns
- Writing new tests
- CI/CD integration

### Sample Email Threads

Sample email threads are provided in `events/` for testing:

- `thread-project-alpha.yaml` - Project planning with decisions
- `thread-meeting-request.yaml` - Meeting scheduling
- `thread-technical-question.yaml` - Technical Q&A
- `thread-mixed-participants.yaml` - Privacy test case

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Project context and development guidelines
- **[ARCHITECTURE-PHASE2.md](ARCHITECTURE-PHASE2.md)** - Detailed AWS architecture
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Step-by-step deployment guide
- **[TESTING.md](TESTING.md)** - Testing strategy and cost estimates
- **[examples/smykowski/README.md](examples/smykowski/README.md)** - Smykowski feature documentation
- **[examples/smykowski/ARCHITECTURE.md](examples/smykowski/ARCHITECTURE.md)** - Smykowski architecture
- **[examples/smykowski/DEPLOYMENT.md](examples/smykowski/DEPLOYMENT.md)** - Smykowski deployment

## 🤝 Contributing

See `CLAUDE.md` for development guidelines and project context.

**Development Modes:**
- Local development: Use CLI with YAML mock emails
- Production: Deploy to AWS with SAM
- Testing: Comprehensive test suite (93 tests)
- Extension: Build specialized assistants in `examples/` directory

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

Built with:
- [Anthropic Claude API](https://www.anthropic.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- AWS Serverless (Lambda, SES, S3, DynamoDB)
- TypeScript, Node.js, and open source tools

---

**Project Status:** Production-ready framework with all three phases complete. Ready for local development, AWS deployment, and custom extensions.
