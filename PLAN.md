# Schrute Phase 1 Prototype - Implementation Plan

## Overview
Build a complete-but-basic prototype of all core features using an interactive CLI tool for testing. Mock emails in YAML format, hybrid memory system, and MCP-based extensibility.

## 1. Project Foundation Setup

### 1.1 Dependencies & Configuration
- **package.json**: Node.js 18, TypeScript 5, @anthropic-ai/sdk, @modelcontextprotocol/sdk, yaml, zod for validation
- **tsconfig.json**: Strict mode, path alias `~/` -> `./src/`, ES2020 target
- **ESLint & Prettier**: No semicolons, single quotes, consistent formatting
- **Directory structure**: `src/lib/`, `src/mcp-servers/`, `src/cli/`, `events/` (YAML emails), `personalities/`, `knowledge/`

## 2. Core Type System (`src/lib/types/`)
- Email types (from, to, cc, subject, body, timestamp, thread_id, message_id)
- Speech act types (type, content, participants, confidence, source_message)
- Participant/privacy types
- Personality configuration schema
- Knowledge store entry types

## 3. Email & Privacy System (`src/lib/email/`, `src/lib/privacy/`)
- **YAML email parser**: Load and validate mock email files
- **Thread tracker**: Build conversation threads from emails
- **Participant tracker**: Track who has seen what information per message
- **Privacy filter**: Given a query context and current recipients, filter out information not all recipients have access to
- **Privacy explainer**: Generate "Cannot reveal due to presence of [name]" messages

## 4. Speech Act Detection (`src/lib/speech-acts/`)
- **Detector**: Use Claude API to exhaustively identify speech acts from emails (requests, questions, commitments, decisions, + more)
- **Storage**: In-memory store (JSON serializable for persistence later)
- **Indexer**: Build queryable index by type, participant, date, thread

## 5. Memory System (`src/lib/memory/`)
- **Hybrid strategy**: Keep recent N emails in full, maintain summaries of older emails
- **Context builder**: Assemble relevant context for queries (privacy-aware)
- **Summary generator**: Use Claude API to create summaries of email threads
- **Retrieval**: Simple keyword + recency scoring (iterate toward RAG later)

## 6. Query System (`src/lib/query/`)
- **Query handler**: Accept natural language query + current context (participants, thread)
- **Context assembly**: Pull relevant emails, speech acts, knowledge entries (privacy-filtered)
- **Response generator**: Use Claude API with personality + context to answer
- **Privacy validation**: Ensure responses don't leak information

## 7. Personality System (`src/lib/personality/`)
- **Configuration loader**: Parse YAML personality configs (tone, style, constraints, example_phrases, system_prompt_additions)
- **Personality library**: Include Dwight Schrute, Louie De Palma, Tom Smykowski configs
- **Prompt builder**: Inject personality into system prompts

## 8. Activation System (`src/lib/activation/`)
- **Configuration**: Schrute's configured name(s), areas of responsibility
- **LLM-based decision**: For each email, use Claude API to determine if Schrute should respond (check: in To line, mentioned by name, pronoun reference, relevant expertise, assigned responsibility)
- **Context builder**: Provide recent thread history for activation decision

## 9. MCP Integration

### 9.1 MCP Client Setup (`src/lib/mcp/`)
- MCP client initialization and connection management
- Tool discovery and invocation wrapper

### 9.2 Dynamic Skills MCP Server (`src/mcp-servers/dynamic-skills/`)
- **CRUD interface**: create_skill, list_skills, update_skill, delete_skill, invoke_skill
- **Skill storage**: JSON file with {name, description, input_placeholders, prompt_template}
- **Skill invocation**: Replace placeholders, call Claude API with constructed prompt
- **Tool registration**: Dynamically expose each skill as an MCP tool

### 9.3 Knowledge Store MCP Server (`src/mcp-servers/knowledge-store/`)
- **Storage**: Human-readable markdown files in `knowledge/` directory
- **CRUD interface**: store_knowledge, retrieve_knowledge, search_knowledge, list_entries
- **Categories**: decisions, commitments, project_info, people, preferences
- **Privacy metadata**: Track participant context for each entry

### 9.4 Mock Skill MCP Servers (1-2 examples)
- Example 1: "Meeting scheduler" (mock - just returns formatted text)
- Example 2: "Document summarizer" (mock - returns canned summaries)

## 10. Interactive CLI Tool (`src/cli/`)
- **Email processor**: Load YAML emails, run activation check, detect speech acts
- **Query mode**: Interactive prompt for asking questions
- **Commands**:
  - `load <emails.yaml>` - Process mock email file
  - `query <question>` - Ask question as specific participant(s)
  - `acts [type]` - List detected speech acts
  - `knowledge [category]` - View stored knowledge
  - `skills` - List available MCP skills
  - `threads` - Show conversation threads
  - `personality <name>` - Switch personality
- **Main script**: `src/cli/index.ts` as entry point

## 11. Sample Data & Configuration

### 11.1 Mock Email Threads (`events/`)
- `thread-project-alpha.yaml` - Project discussion with decisions and commitments
- `thread-meeting-request.yaml` - Meeting scheduling with questions and requests
- `thread-technical-question.yaml` - Technical Q&A demonstrating knowledge retrieval
- `thread-mixed-participants.yaml` - Privacy scenario with different participant sets

### 11.2 Personality Configurations (`personalities/`)
- `dwight-schrute.yaml` - Overly serious, procedure-focused
- `louie-de-palma.yaml` - Grumpy, sarcastic, efficient
- `tom-smykowski.yaml` - Anxious, people-person, overly helpful
- `default.yaml` - Professional, helpful baseline

## 12. Documentation Updates

### 12.1 Update CLAUDE.md
- Add Phase 1 architecture overview
- Document email YAML format
- Document personality configuration format
- Add MCP server specifications
- Include development workflow for prototype

### 12.2 Update README.md
- Installation instructions
- CLI usage guide
- Mock email format examples
- How to create personalities
- How to create dynamic skills
- Architecture diagram (text-based)

### 12.3 New: ARCHITECTURE.md
- System components and data flow
- Speech act detection approach
- Privacy model details
- Memory/context strategy
- MCP integration patterns

## Implementation Order

1. ✅ Project setup (package.json, tsconfig, ESLint, directories)
2. ✅ Core types and YAML email parser
3. ✅ Basic CLI scaffolding + sample mock emails
4. ✅ Claude API integration wrapper
5. ✅ Speech act detection (basic)
6. ✅ Participant tracking and privacy filtering
7. ✅ Query system (basic - no knowledge store yet)
8. ✅ Personality system and sample configs
9. ✅ Activation logic
10. ⏳ Memory system (hybrid approach) - **TODO**
11. ⏳ MCP client setup - **TODO**
12. ⏳ Knowledge Store MCP server - **TODO**
13. ⏳ Dynamic Skills MCP server - **TODO**
14. ⏳ Mock skill MCP servers (1-2) - **TODO**
15. ⏳ Wire everything together in CLI - **TODO**
16. ⏳ Documentation updates (CLAUDE.md, README.md, ARCHITECTURE.md) - **TODO**
17. ⏳ Polish and testing with various scenarios - **TODO**

## Key Technical Decisions

- **YAML over JSON**: More human-readable for mock emails
- **In-memory storage**: Serialize to JSON files as needed, no database for prototype
- **Claude API everywhere**: Speech acts, activation, queries, summaries all use Claude
- **MCP for extensibility**: Both custom and mock servers to validate the pattern
- **CLI over web**: Fastest path to interactive testing
- **No AWS/Lambda yet**: Local execution only, infrastructure deferred to Phase 2

## Design Notes

### Privacy Model
- Track participant access at the message level
- Each message has a list of participants (from, to, cc)
- Information can only be shared if ALL current participants have seen the source messages
- When blocked, explicitly name who is restricting access
- Conservative approach: when in doubt, restrict

### Dynamic Skills System
- Skills are prompt templates stored in a database/file
- Creating a skill: provide name, description, input placeholders
- Invoking a skill: replace placeholders with provided values, send to LLM
- Recursive LLM calls - the skill system uses Claude to implement skills
- Inspired by Claude Skills, but simpler/prototype version

### Activation Logic
- Always respond if in To: line
- Use LLM to determine if Schrute should respond based on:
  - Direct mention by name/alias
  - Pronoun reference in context
  - Question about area of responsibility
  - Request for something Schrute handles
  - Relevant expertise keywords
  - Reference to previous tasks
- Conservative: when uncertain, respond (better to be available)
