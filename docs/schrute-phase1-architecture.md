# Schrute Phase 1: Technical Architecture

**Project:** Schrute - AI Coordination Assistant Framework  
**Phase:** Phase 1 (Email-Only Baseline - Observation & Query)  
**Version:** 1.0  
**Date:** October 27, 2025  
**Architect:** Architect Agent  
**Status:** Draft for Review

---

## Executive Summary

This document defines the technical architecture for Schrute Phase 1, an observation-only email-based coordination assistant. The architecture is designed for:

- **Reliability:** Stateless Lambda functions, idempotent operations, comprehensive error handling
- **Privacy:** Participant-based access control enforced at data layer
- **Scalability:** Serverless architecture with DynamoDB for horizontal scaling
- **Maintainability:** AWS SAM for infrastructure, clear separation of concerns
- **Cost efficiency:** Pay-per-use pricing, optimized for low-to-medium volume

**Key Design Decisions:**
- AWS SAM for infrastructure as code
- DynamoDB single-table design with GSIs for querying
- Stateless Lambda functions (read state, process, update, forget)
- Anthropic Claude API for speech act detection and query understanding
- Event-driven architecture with SES triggers

---

## Technology Stack

### Programming Language & Runtime

**Language:** TypeScript 5.x
- Type safety for complex data models (speech acts, threads, participants)
- Better IDE support and refactoring
- Catches errors at compile time
- Strong typing for DynamoDB queries and Claude API responses

**Runtime:** Node.js 18
- Fast Lambda cold starts (~200ms)
- Excellent AWS SDK support
- Rich ecosystem for email parsing and text processing
- Native async/await support

### AI Model

**Model:** Claude 3.5 Haiku (`claude-3-5-haiku-20241022`)

**Rationale:**
- **Speed:** ~3x faster than Sonnet (critical for <30s response target)
- **Cost:** ~15x cheaper than Sonnet (~$0.25/million input tokens vs $3/million)
- **Accuracy:** Sufficient for structured tasks (speech act detection, query parsing)
- **Output quality:** Excellent for JSON generation and classification tasks

**Cost comparison for 1,000 emails/month:**
- Haiku: ~$0.20/month
- Sonnet: ~$3.00/month
- **Savings: ~$2.80/month (14x cheaper)**

**Note:** If accuracy testing shows Haiku doesn't hit 85-90% target, we can upgrade specific operations to Sonnet 4. But for structured extraction tasks, Haiku should be more than sufficient.

### Build & Development Tools

**Package Manager:** npm 10.x
- Standard Node.js package manager
- Lock file for reproducible builds
- Good SAM integration

**Build Tool:** esbuild
- Fast TypeScript compilation
- Bundles for optimized Lambda packages
- Tree-shaking to minimize bundle size
- Source maps for debugging

**Testing Framework:** Jest
- TypeScript support via ts-jest
- Mocking for AWS SDK, Claude API
- Code coverage reporting
- Snapshot testing for speech act detection

**Linting & Formatting:**
- ESLint with TypeScript rules
- Prettier for code formatting
- Pre-commit hooks via husky

**Type Definitions:**
- @types/node
- @types/aws-lambda
- @types/jest
- @anthropic-ai/sdk (includes types)

### Key Dependencies

**Production:**
```json
{
  "@anthropic-ai/sdk": "^0.x",
  "@aws-sdk/client-dynamodb": "^3.x",
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/client-ses": "^3.x",
  "@aws-sdk/client-secrets-manager": "^3.x",
  "@aws-sdk/lib-dynamodb": "^3.x",
  "mailparser": "^3.x"
}
```

**Development:**
```json
{
  "@types/node": "^18.x",
  "@types/aws-lambda": "^8.x",
  "@types/jest": "^29.x",
  "esbuild": "^0.x",
  "eslint": "^8.x",
  "jest": "^29.x",
  "prettier": "^3.x",
  "ts-jest": "^29.x",
  "typescript": "^5.x"
}
```

### Project Structure

```
schrute-phase1/
├── src/
│   ├── lambdas/
│   │   ├── email-receiver/
│   │   │   ├── index.ts          # Main handler
│   │   │   ├── email-parser.ts   # Email parsing logic
│   │   │   └── context-assembler.ts
│   │   ├── speech-act-detector/
│   │   │   ├── index.ts
│   │   │   ├── claude-client.ts
│   │   │   └── speech-act-types.ts
│   │   ├── query-handler/
│   │   │   ├── index.ts
│   │   │   ├── query-parser.ts
│   │   │   └── privacy-filter.ts
│   │   └── email-response/
│   │       ├── index.ts
│   │       └── email-formatter.ts
│   ├── shared/
│   │   ├── types/              # Shared TypeScript types
│   │   ├── dynamodb/           # DynamoDB helpers
│   │   ├── s3/                 # S3 helpers
│   │   └── utils/              # Shared utilities
│   └── tests/                  # Unit and integration tests
├── template.yaml               # SAM template
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
└── .prettierrc
```

### Build & Deploy Commands

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Lint
npm run lint

# Format code
npm run format

# Run tests
npm test

# Build (compile TypeScript + bundle)
npm run build

# SAM build (invokes npm run build)
sam build

# Deploy
sam deploy
```

### TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", ".aws-sam"]
}
```

---

## Architecture Overview

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│                                                                   │
│  ┌────────────┐         ┌──────────────┐                        │
│  │  AWS SES   │────────>│  S3 Bucket   │                        │
│  │  (Receive) │         │ (Raw Email)  │                        │
│  └────────────┘         └──────────────┘                        │
│         │                                                         │
│         │ Trigger                                                │
│         ▼                                                         │
│  ┌─────────────────────────────────────────────────┐            │
│  │         Email Receiver Lambda                    │            │
│  │  - Parse email                                   │            │
│  │  - Extract participants & thread info            │            │
│  │  - ALWAYS invoke Speech Act Detector (if content)│            │
│  │  - ALSO invoke Query Handler (if queries found)  │            │
│  │  - Can process BOTH in same email                │            │
│  └─────────────────────────────────────────────────┘            │
│         │                    │                                    │
│         │                    │                                    │
│         ▼                    ▼                                    │
│  ┌──────────────┐    ┌─────────────────┐                        │
│  │  Speech Act  │    │  Query Handler  │                        │
│  │   Detector   │    │     Lambda      │                        │
│  │   Lambda     │    │                 │                        │
│  └──────────────┘    └─────────────────┘                        │
│         │                    │                                    │
│         │ Write              │ Read                               │
│         ▼                    ▼                                    │
│         ┌──────────────────┐                                     │
│         │    DynamoDB      │                                     │
│         │  - Speech Acts   │                                     │
│         │  - Email Threads │                                     │
│         │  - Participants  │                                     │
│         └──────────────────┘                                     │
│                    │                                              │
│                    │ Combined Results                            │
│                    ▼                                              │
│  ┌─────────────────────────────────────────────────┐            │
│  │       Email Response Lambda                      │            │
│  │  - Format acknowledgment (speech acts)           │            │
│  │  - Format query responses                        │            │
│  │  - Combine into single email                     │            │
│  │  - Send via SES                                  │            │
│  └─────────────────────────────────────────────────┘            │
│         │                                                         │
│         ▼                                                         │
│  ┌────────────┐                                                  │
│  │  AWS SES   │                                                  │
│  │   (Send)   │                                                  │
│  └────────────┘                                                  │
│         │                                                         │
└─────────┼─────────────────────────────────────────────────────┘
          │
          ▼
     User receives
     combined response


IMPORTANT: A single email can contain BOTH speech acts AND queries.
The architecture processes both in parallel and returns a combined response.

Example email with both:
  "Bob committed to reviewing the PR by Friday. 
   By the way, what did Alice commit to last week?"

Processing:
  1. Speech Act Detector stores Bob's commitment
  2. Query Handler answers question about Alice
  3. Single response email includes both acknowledgment and answer
```

### Component Responsibilities

**AWS SES:**
- Receives emails sent to dwight@schrute.work
- Stores raw emails in S3
- Triggers Email Receiver Lambda
- Sends response emails

**Email Receiver Lambda:**
- Parses incoming email (headers, body, thread info)
- Extracts participants (To, CC)
- **Always** invokes Speech Act Detector (if substantive content)
- **Also** extracts and processes queries (if present)
- **Can handle both** in the same email
- Orchestrates combined response

**Speech Act Detector Lambda:**
- Calls Claude API with email content
- Detects all speech acts (requests, commitments, questions, declarations, assertions)
- Stores speech acts in DynamoDB
- Returns summary for acknowledgment

**Query Handler Lambda:**
- Parses natural language query
- Determines query type and parameters
- Reads from DynamoDB with privacy filtering
- Generates response using Claude API
- Returns formatted results

**Email Response Lambda:**
- Formats response email (acknowledgment and/or query results)
- Combines multiple response types into single email
- Adds personality/signature
- Sends via SES

**DynamoDB:**
- Stores speech acts with full metadata
- Tracks email threads and participants
- Enables efficient querying with GSIs

---

## Data Model

### DynamoDB Single-Table Design

We use a single-table design with multiple entity types and access patterns supported via GSIs.

#### Primary Table: `schrute-phase1`

**Primary Key:**
- `PK` (Partition Key): String
- `SK` (Sort Key): String

**Attributes:**
- `EntityType`: String (SPEECH_ACT | EMAIL_THREAD | PARTICIPANT_INDEX)
- `Timestamp`: String (ISO 8601)
- `Data`: Map (entity-specific data)
- `GSI1PK`: String (for GSI queries)
- `GSI1SK`: String (for GSI queries)
- `GSI2PK`: String (for temporal queries)
- `GSI2SK`: String (for temporal queries)

#### Entity Types

##### 1. SPEECH_ACT Entity

**Primary Key:**
```
PK: "SPEECH_ACT#<speech_act_id>"
SK: "METADATA"
```

**Attributes:**
```json
{
  "EntityType": "SPEECH_ACT",
  "SpeechActId": "sa_20251027_001",
  "Type": "REQUEST|COMMITMENT|QUESTION|DECLARATION|ASSERTION",
  "EmailThreadId": "thread_abc123",
  "EmailMessageId": "msg_xyz789",
  "Timestamp": "2025-10-27T10:30:00Z",
  "Participants": ["alice@example.com", "bob@example.com"],
  "Actor": "alice@example.com",
  "Target": "bob@example.com",
  "Content": "Can you review the PR by Friday?",
  "Deadline": "2025-10-31T23:59:59Z",
  "Context": {
    "Subject": "PR Review Needed",
    "PreviousMessages": 2
  },
  "RelatedSpeechActIds": ["sa_20251026_042"],
  "GSI1PK": "THREAD#thread_abc123",
  "GSI1SK": "2025-10-27T10:30:00Z",
  "GSI2PK": "ACTOR#alice@example.com",
  "GSI2SK": "2025-10-27T10:30:00Z"
}
```

##### 2. EMAIL_THREAD Entity

**Primary Key:**
```
PK: "THREAD#<thread_id>"
SK: "METADATA"
```

**Attributes:**
```json
{
  "EntityType": "EMAIL_THREAD",
  "ThreadId": "thread_abc123",
  "Subject": "PR Review Needed",
  "Participants": ["alice@example.com", "bob@example.com"],
  "CreatedAt": "2025-10-27T10:30:00Z",
  "LastMessageAt": "2025-10-27T15:45:00Z",
  "MessageCount": 3,
  "SpeechActCount": 5,
  "GSI1PK": "ALL_THREADS",
  "GSI1SK": "2025-10-27T15:45:00Z"
}
```

##### 2a. EMAIL_MESSAGE Entity (for context assembly)

**Primary Key:**
```
PK: "THREAD#<thread_id>"
SK: "MSG#<timestamp>#<message_id>"
```

**Attributes:**
```json
{
  "EntityType": "EMAIL_MESSAGE",
  "MessageId": "msg_xyz789",
  "Timestamp": "2025-10-27T10:30:00Z",
  "From": "alice@example.com",
  "To": ["bob@example.com", "carol@example.com"],
  "Participants": ["alice@example.com", "bob@example.com", "carol@example.com"],
  "Subject": "PR Review Needed",
  "S3Key": "emails/2025/10/27/msg_xyz789.eml",
  "QuotesMessageIds": ["msg_abc456"],
  "HasQuotedHistory": true,
  "GSI1PK": "THREAD#thread_abc123",
  "GSI1SK": "MSG#2025-10-27T10:30:00Z"
}
```

**Note:** EMAIL_MESSAGE entities enable smart context assembly by tracking which emails quote previous messages, allowing efficient gap detection and retrieval.

##### 3. PARTICIPANT_INDEX Entity

**Purpose:** Efficiently find all threads a participant was part of

**Primary Key:**
```
PK: "PARTICIPANT#<email>"
SK: "THREAD#<thread_id>"
```

**Attributes:**
```json
{
  "EntityType": "PARTICIPANT_INDEX",
  "Participant": "alice@example.com",
  "ThreadId": "thread_abc123",
  "FirstSeen": "2025-10-27T10:30:00Z",
  "LastSeen": "2025-10-27T15:45:00Z",
  "GSI1PK": "PARTICIPANT#alice@example.com",
  "GSI1SK": "2025-10-27T15:45:00Z"
}
```

#### Global Secondary Indexes (GSI)

**Note:** GSI = Global Secondary Index. This is a DynamoDB feature that creates an additional index on the table, allowing efficient queries using different partition and sort keys than the primary table. Without GSIs, we'd be forced to either scan the entire table (expensive) or only query by primary key (PK/SK), which wouldn't support most of Schrute's query patterns.

##### GSI1: Thread-Based Queries
**Purpose:** Get all speech acts in a thread, chronologically

```
PK: GSI1PK (Partition Key)
SK: GSI1SK (Sort Key)
```

**Access Patterns:**
- Get all speech acts in thread: `GSI1PK = "THREAD#<thread_id>"`
- Get recent threads: `GSI1PK = "ALL_THREADS"`, ordered by GSI1SK

##### GSI2: Actor/Temporal Queries
**Purpose:** Get speech acts by actor, with temporal filtering

```
PK: GSI2PK (Partition Key)
SK: GSI2SK (Sort Key)
```

**Access Patterns:**
- Get all speech acts by person: `GSI2PK = "ACTOR#<email>"`
- Get speech acts in date range: Filter on GSI2SK
- Get overdue commitments: GSI2PK + deadline filter

#### Access Patterns & Query Examples

**1. Get all speech acts in a thread:**
```python
# Query GSI1
response = table.query(
    IndexName='GSI1',
    KeyConditionExpression='GSI1PK = :thread_id',
    ExpressionAttributeValues={
        ':thread_id': 'THREAD#thread_abc123'
    }
)
```

**2. Get all commitments by Bob:**
```python
# Query GSI2
response = table.query(
    IndexName='GSI2',
    KeyConditionExpression='GSI2PK = :actor',
    FilterExpression='#type = :commitment',
    ExpressionAttributeNames={
        '#type': 'Type'
    },
    ExpressionAttributeValues={
        ':actor': 'ACTOR#bob@example.com',
        ':commitment': 'COMMITMENT'
    }
)
```

**3. Get all threads a participant was in:**
```python
# Query primary table
response = table.query(
    KeyConditionExpression='PK = :participant',
    ExpressionAttributeValues={
        ':participant': 'PARTICIPANT#alice@example.com'
    }
)
thread_ids = [item['ThreadId'] for item in response['Items']]
```

**4. Privacy-filtered query (who committed to X):**
```python
# 1. Get threads visible to all query participants
query_participants = ['alice@example.com', 'bob@example.com', 'carol@example.com']
visible_threads = get_threads_with_all_participants(query_participants)

# 2. Query commitments by person, filter by visible threads
commitments = table.query(
    IndexName='GSI2',
    KeyConditionExpression='GSI2PK = :actor',
    FilterExpression='#type = :commitment',
    ExpressionAttributeNames={'#type': 'Type'},
    ExpressionAttributeValues={
        ':actor': 'ACTOR#bob@example.com',
        ':commitment': 'COMMITMENT'
    }
)

# 3. Filter in application code
filtered = [c for c in commitments['Items'] 
            if c['EmailThreadId'] in visible_threads]
```

**5. Temporal queries (commitments from last week):**
```python
from datetime import datetime, timedelta

one_week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()

response = table.query(
    IndexName='GSI2',
    KeyConditionExpression='GSI2PK = :actor AND GSI2SK > :timestamp',
    FilterExpression='#type = :commitment',
    ExpressionAttributeNames={'#type': 'Type'},
    ExpressionAttributeValues={
        ':actor': 'ACTOR#bob@example.com',
        ':timestamp': one_week_ago,
        ':commitment': 'COMMITMENT'
    }
)
```

---

## Lambda Architecture

### Lambda Functions

#### 1. Email Receiver Lambda

**Function Name:** `schrute-phase1-email-receiver`

**Trigger:** AWS SES (via receipt rule)

**Memory:** 512 MB  
**Timeout:** 30 seconds  
**Runtime:** Node.js 18  
**Language:** TypeScript

**Environment Variables:**
```yaml
EMAIL_BUCKET: schrute-phase1-email-storage
SPEECH_ACT_DETECTOR_FUNCTION: schrute-phase1-speech-act-detector
QUERY_HANDLER_FUNCTION: schrute-phase1-query-handler
EMAIL_RESPONSE_FUNCTION: schrute-phase1-email-response
DYNAMODB_TABLE: schrute-phase1
```

**Responsibilities:**
1. Parse incoming SES event
2. Retrieve email from S3
3. Parse email headers (From, To, CC, Subject, Message-ID, In-Reply-To)
4. Extract email body (text and HTML)
5. Determine thread ID (from In-Reply-To or Message-ID)
6. Extract participants list
7. Invoke Speech Act Detector (detects both speech acts and queries via LLM)
8. Invoke Query Handler for any detected queries
9. Orchestrate combined response

**Email Processing Logic:**
```typescript
interface EmailProcessingResult {
  speechActs: SpeechActSummary | null;
  queryResponses: QueryResponse[];
}

interface SpeechActDetectionResult {
  speechActs: SpeechActSummary;
  queries: Query[];
}

interface Query {
  queryText: string;
  queryType?: string;
}

async function processEmail(email: ParsedEmail): Promise<EmailProcessingResult> {
  const results: EmailProcessingResult = {
    speechActs: null,
    queryResponses: []
  };
  
  // ALWAYS invoke Speech Act Detector for substantive content
  // The LLM will detect BOTH speech acts AND queries in a single call
  if (hasSubstantiveContent(email)) {
    const detectionResult = await invokeSpeechActDetector(email);
    results.speechActs = detectionResult.speechActs;
    
    // If the LLM detected queries, process them
    if (detectionResult.queries && detectionResult.queries.length > 0) {
      results.queryResponses = await Promise.all(
        detectionResult.queries.map(query => invokeQueryHandler(query, email))
      );
    }
  }
  
  return results;
}

function hasSubstantiveContent(email: ParsedEmail): boolean {
  // Skip trivial emails like "Thanks!" or "Got it"
  const trivialPatterns = [
    /^thanks?!*$/i,
    /^got it!*$/i,
    /^ok!*$/i,
    /^sounds good!*$/i
  ];
  
  const body = email.body.trim();
  return body.length > 20 && !trivialPatterns.some(p => p.test(body));
}
```

**Flow:**
```
1. Parse SES event → Extract S3 object key
2. Get email from S3 → Parse with mailparser
3. Extract thread ID and participants
4. Detect quoted content (for context assembly)
5. Store EMAIL_MESSAGE entity in DynamoDB
6. Invoke Speech Act Detector (if substantive content)
   - LLM detects BOTH speech acts AND queries in single call
   - Pass full thread context (assembled via gap detection)
7. Store detected speech acts in DynamoDB
8. For any detected queries, invoke Query Handler
   - Pass query text and thread context
9. Wait for all responses
10. Invoke Email Response Lambda with combined results
11. Return success
```

**Example Multi-Purpose Email:**
```
From: carol@example.com
To: dwight@schrute.work
Subject: Status Update

Hi Dwight,

Bob committed to reviewing the PR by Friday.

By the way, what did Alice commit to last week?

Thanks,
Carol
```

**Processing:**
1. Speech Act Detector finds: "Bob committed to reviewing PR by Friday"
2. Query Handler answers: "What did Alice commit to last week?"
3. Combined response sent back to Carol

#### 2. Speech Act Detector Lambda

**Function Name:** `schrute-phase1-speech-act-detector`

**Trigger:** Invoked by Email Receiver Lambda

**Memory:** 1024 MB  
**Timeout:** 60 seconds  
**Runtime:** Node.js 18  
**Language:** TypeScript

**Environment Variables:**
```yaml
ANTHROPIC_API_KEY: <stored in AWS Secrets Manager>
DYNAMODB_TABLE: schrute-phase1
MODEL: claude-3-5-haiku-20241022
```

**Responsibilities:**
1. Receive email and thread context from Email Receiver
2. Assemble full thread context (if not already provided)
3. Call Claude API with context
4. Detect all speech acts AND queries from current email
5. Store each speech act in DynamoDB
6. Return summary with speech acts and detected queries
7. Update thread metadata

**Note:** See "Context Management for LLM Invocations" section for details on how thread context is assembled and provided to Claude API. The Lambda receives either a single email (containing quoted history) or multiple emails (to fill gaps).

**Claude API Prompt Strategy:**

```javascript
const systemPrompt = `You are a speech act and query detector for a coordination assistant. Your job is to identify and extract all speech acts and queries from email content.

Speech act types:
1. REQUEST - Someone asking another person to do something
2. COMMITMENT - Someone promising to do something
3. QUESTION - Someone asking for information (not action)
4. DECLARATION - Someone stating a decision or status change
5. ASSERTION - Someone stating a fact or observation

Query types (questions directed at the assistant about past communications):
- Questions about commitments: "What did Bob commit to?"
- Questions about requests: "Who asked for X?"
- Questions about deadlines: "When is X due?"
- Questions about status: "What's overdue?" "What's unanswered?"
- Questions about relationships: "Who's waiting on Bob?"
- Temporal queries: "Show me requests from last week"
- Summary queries: "Summarize this week's decisions"

For each speech act, extract:
- Type
- Actor (who is performing the speech act)
- Target (who it's directed at, if applicable)
- Content (the actual statement)
- Deadline (if mentioned)

For each query, extract:
- Query text (the actual question)
- Query type (if identifiable)

Return a JSON object with two arrays: "speechActs" and "queries". Be thorough - a single email may contain multiple speech acts AND queries.

CRITICAL: Extract speech acts and queries ONLY. Do not infer, summarize, or add commentary.`

const userPrompt = `Email from: ${email.from}
Email to: ${email.to.join(', ')}
Subject: ${email.subject}

Email body:
${email.body}

Extract all speech acts and queries from this email.`

const response = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 2000,
  system: systemPrompt,
  messages: [
    { role: 'user', content: userPrompt }
  ]
})
```

**Expected Response Format:**
```json
{
  "speechActs": [
    {
      "type": "REQUEST",
      "actor": "alice@example.com",
      "target": "bob@example.com",
      "content": "review the PR by Friday",
      "deadline": "2025-10-31T23:59:59Z"
    },
    {
      "type": "COMMITMENT",
      "actor": "bob@example.com",
      "target": "alice@example.com",
      "content": "I'll get it done by Thursday",
      "deadline": "2025-10-30T23:59:59Z",
      "related_to": "previous request"
    }
  ],
  "queries": [
    {
      "queryText": "What did Alice commit to last week?",
      "queryType": "commitment_by_person"
    }
  ]
}
```

**Storage Flow:**
```
1. Parse Claude API response
2. For each detected speech act:
   a. Generate unique speech_act_id
   b. Create SPEECH_ACT entity
   c. PutItem to DynamoDB
3. Update EMAIL_THREAD entity (increment counts)
4. Create/Update PARTICIPANT_INDEX entities
5. Return result with:
   - Speech act summary: "Detected: 2 requests, 1 commitment"
   - Detected queries: Array of query objects
```

#### 3. Query Handler Lambda

**Function Name:** `schrute-phase1-query-handler`

**Trigger:** Invoked by Email Receiver Lambda

**Memory:** 1024 MB  
**Timeout:** 60 seconds  
**Runtime:** Node.js 18  
**Language:** TypeScript

**Environment Variables:**
```yaml
ANTHROPIC_API_KEY: <stored in AWS Secrets Manager>
DYNAMODB_TABLE: schrute-phase1
MODEL: claude-3-5-haiku-20241022
```

**Responsibilities:**
1. Receive query and thread context from Email Receiver
2. Parse natural language query with context
3. Determine query type and parameters
4. Get visible threads for query participants
5. Query DynamoDB with privacy filtering
6. Call Claude API to format response (with context)
7. Return formatted answer with privacy warnings

**Note:** See "Context Management for LLM Invocations" section for details on how thread context is used to understand references in queries (e.g., "What did Bob commit to?" when "Bob" is mentioned in thread but not in query email).

**Query Understanding Prompt:**

```javascript
const systemPrompt = `You are a query parser for a coordination assistant. Parse natural language queries into structured parameters.

Query types:
- COMMITMENT_BY_PERSON: "What did Bob commit to?"
- REQUEST_BY_PERSON: "Who asked for X?"
- DEADLINE_QUERY: "When is X due?"
- TEMPORAL_QUERY: "Show me requests from last week"
- OVERDUE_QUERY: "What commitments are overdue?"
- DEPENDENCY_QUERY: "Who's waiting on Bob?"
- SUMMARY_QUERY: "Summarize this week's decisions"

Extract:
- query_type
- target_person (if applicable)
- search_term (if applicable)
- time_range (if applicable)

Return JSON with parsed parameters.`

const userPrompt = `Query: ${queryText}

Parse this query.`
```

**Privacy Filtering Algorithm:**

```javascript
async function queryWithPrivacyFilter(queryParams, queryParticipants) {
  // 1. Get all threads visible to ALL query participants
  const visibleThreads = await getThreadsWithAllParticipants(queryParticipants)
  
  // 2. Execute main query
  const results = await executeQuery(queryParams)
  
  // 3. Filter results by visible threads
  const visibleResults = results.filter(item => 
    visibleThreads.includes(item.EmailThreadId)
  )
  
  // 4. Determine if filtering occurred
  const wasFiltered = results.length > visibleResults.length
  
  // 5. Generate privacy warning if needed
  let privacyWarning = null
  if (wasFiltered) {
    const hiddenCount = results.length - visibleResults.length
    const missingParticipants = await findMissingParticipants(
      results, 
      visibleResults, 
      queryParticipants
    )
    
    privacyWarning = {
      filtered: true,
      hiddenCount,
      message: `⚠️ Note: Some results filtered because ${formatParticipantList(missingParticipants)} weren't on all relevant email threads. For complete results, ask in a thread with the original participants.`
    }
  }
  
  return {
    results: visibleResults,
    privacyWarning
  }
}
```

**Response Generation:**

```javascript
const systemPrompt = `You are Dwight Schrute, a coordination assistant. Format query results into a natural, helpful email response.

Guidelines:
- Be concise and direct
- List results clearly
- Include relevant context (dates, threads)
- Maintain friendly but professional tone
- If privacy warning provided, include it verbatim at the end

Sign off as "Dwight Schrute" for first contact in thread, "Dwight" for follow-ups.`

const userPrompt = `Query: ${originalQuery}

Results:
${JSON.stringify(results, null, 2)}

Privacy warning: ${privacyWarning || 'None'}

Format a response email.`
```

#### 4. Email Response Lambda

**Function Name:** `schrute-phase1-email-response`

**Trigger:** Invoked by Email Receiver Lambda

**Memory:** 256 MB  
**Timeout:** 30 seconds  
**Runtime:** Node.js 18  
**Language:** TypeScript

**Environment Variables:**
```yaml
SES_FROM_EMAIL: dwight@schrute.work
SES_FROM_NAME: Dwight Schrute
```

**Responsibilities:**
1. Receive combined results from Email Receiver (speech acts and/or query responses)
2. Pass original email + results to Claude API for response generation
3. LLM generates complete response email with appropriate greeting, content, and signature
4. Send formatted email via SES
5. Log sent email

**Response Generation with LLM:**

```javascript
async function generateEmailResponse(email, speechActSummary, queryResponses) {
  const isFirstContact = !email.inReplyTo
  
  const systemPrompt = `You are Dwight Schrute, a coordination assistant. Generate a complete response email.

Guidelines:
- Determine the sender's preferred name from how they sign their emails or context
- Use that name in your greeting (e.g., "Hi Bob," not "Hi robert.johnson@example.com,")
- If uncertain, use a friendly generic greeting like "Hi there,"
- Acknowledge detected speech acts naturally if provided
- Include query answers if provided, with any privacy warnings
- Sign off as "Dwight Schrute" for first contact in a thread, "Dwight" for follow-ups
- Be concise, friendly, professional, and helpful
- Format lists clearly with bullet points or numbering where appropriate`

  const userPrompt = `Original email:
From: ${email.from}
Subject: ${email.subject}
Body:
${email.body}

${speechActSummary && speechActSummary.length > 0 ? `
Speech acts I detected:
${JSON.stringify(speechActSummary, null, 2)}

Please acknowledge these naturally in your response.` : ''}

${queryResponses && queryResponses.length > 0 ? `
Query responses to include:
${JSON.stringify(queryResponses, null, 2)}

Include any privacy warnings verbatim.` : ''}

First contact in thread: ${isFirstContact}

Generate a complete response email body (greeting through signature).`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  })
  
  return response.content[0].text
}

async function sendResponseEmail(email, responseBody) {
  const params = {
    Source: 'Dwight Schrute <dwight@schrute.work>',
    Destination: { ToAddresses: [email.from] },
    Message: {
      Subject: { Data: `Re: ${email.subject}` },
      Body: { Text: { Data: responseBody } }
    }
  }
  
  await ses.sendEmail(params).promise()
  
  console.log(`Email sent to ${email.from}`)
}
```

**Example Combined Response:**

For email:
```
Bob committed to reviewing the PR by Friday.
By the way, what did Alice commit to last week?
```

Response:
```
Hi Carol,

Got it! Here's what I understood from your email:

📋 Detected:
• Commitment from Bob: "Review the PR by Friday"

---

Regarding your question:

Alice committed to:
1. Update the documentation by Oct 25 (thread with you, Alice, Bob)
2. Review the API design by Oct 28 (thread with you, Alice, Ted)

Dwight
```

**Note on Name Personalization:**

Rather than attempting to extract names from email addresses programmatically, the Email Response Lambda should pass the full email context to an LLM for response generation. The LLM can:
- Detect how the sender signs their emails ("Thanks, Bob" vs "Robert Johnson")
- Understand nicknames and preferred names from context
- Handle cultural differences in name ordering
- Choose appropriate formality level

This approach is more robust than pattern matching and leverages the LLM's natural language understanding.

---

## Context Management for LLM Invocations

### The Context Problem

**Challenge:** LLMs need full thread context to:
- Accurately detect speech acts (especially implicit commitments like "sure" or "will do")
- Understand references ("can you review *it*?")
- Answer queries about the thread
- Link related speech acts (commitment responding to request)

**Naive approach problems:**
- Including all emails wastes tokens (most threads include quoted history)
- But NOT including previous emails loses critical context
- Privacy restrictions complicate retrieval

**Solution:** Smart context assembly with gap detection

### Context Assembly Algorithm

**Key Design Decision:** For LLM invocations (speech act detection, query handling, response generation), provide **all emails involving the current participants**, not just emails in the current thread. This ensures:
- Name preferences established in introductory emails are remembered
- Relationship dynamics are understood across conversations
- Historical context informs current interactions

**Thread vs Participant Context:**
- **Speech act storage**: Stored with threadId (for organization)
- **LLM context**: Uses ALL participant emails (for understanding)

```javascript
async function assembleParticipantContext(currentEmail, participants) {
  const context = {
    currentThreadEmails: [],
    historicalEmails: [],
    allEmails: []
  }
  
  // Step 1: Get ALL threads involving these participants (privacy-filtered)
  const visibleThreads = await getThreadsWithParticipants(participants)
  
  // Step 2: Get current thread emails (for gap detection)
  const threadId = currentEmail.threadId
  const currentThreadMessages = await getThreadMessages(threadId, participants)
  context.currentThreadEmails = currentThreadMessages
  
  // Step 3: Get historical emails from other threads
  // Limit to recent history (last 30 days or 50 emails, whichever is less)
  const historicalMessages = await getHistoricalMessages(
    visibleThreads.filter(t => t !== threadId),
    participants,
    { maxEmails: 50, maxDays: 30 }
  )
  context.historicalEmails = historicalMessages
  
  // Step 4: Detect gaps in current thread
  const quotedMessageIds = extractQuotedMessages(currentEmail.body)
    .map(msg => msg.messageId)
    .filter(id => id)
  
  const currentThreadGaps = currentThreadMessages.filter(msg =>
    !quotedMessageIds.includes(msg.messageId) &&
    msg.messageId !== currentEmail.messageId
  )
  
  // Step 5: Assemble context prioritizing recent/current thread
  // For LLM: [historical context] + [current thread with gaps filled] + [current email]
  context.allEmails = [
    ...context.historicalEmails.slice(-10), // Last 10 historical emails
    ...currentThreadGaps,
    currentEmail
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  
  return context
}

async function getThreadsWithParticipants(participants) {
  // Find intersection of threads where ALL participants were present
  const participantThreads = await Promise.all(
    participants.map(p => getThreadsForParticipant(p))
  )
  
  const intersection = participantThreads.reduce((acc, threads) => {
    return acc.filter(t => threads.includes(t))
  })
  
  return intersection
}

async function getHistoricalMessages(threadIds, participants, options) {
  const { maxEmails, maxDays } = options
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxDays)
  
  const allMessages = []
  
  for (const threadId of threadIds) {
    const messages = await getThreadMessages(threadId, participants)
    allMessages.push(...messages.filter(msg => 
      new Date(msg.Timestamp) >= cutoffDate
    ))
  }
  
  // Sort by timestamp and limit
  return allMessages
    .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
    .slice(0, maxEmails)
}
```

**Context Size Management:**

For Phase 1, use conservative limits to manage token costs:
- **Historical context**: Last 10 emails from other threads (≈5K tokens)
- **Current thread**: Full thread with gap filling (≈10K tokens)
- **Current email**: Always included (≈2K tokens)
- **Total**: ≈17K tokens input per LLM call (well under Haiku's 200K limit)

For Phase 2+, could implement smarter summarization for very long histories.

### Quoted Message Detection

Email clients quote previous messages in various formats. We need to detect these patterns:

```javascript
function extractQuotedMessages(emailBody) {
  const quotedMessages = []
  
  // Pattern 1: "On [date], [person] wrote:"
  const pattern1 = /On (.+?), (.+?) <(.+?)> wrote:/g
  let match
  while ((match = pattern1.exec(emailBody)) !== null) {
    quotedMessages.push({
      date: match[1],
      sender: match[2],
      email: match[3],
      // Try to extract Message-ID from headers if present
      messageId: extractMessageIdFromQuote(emailBody, match.index)
    })
  }
  
  // Pattern 2: Email client quote markers (>, |, etc.)
  const lines = emailBody.split('\n')
  let inQuote = false
  let currentQuote = []
  
  for (const line of lines) {
    if (line.startsWith('>') || line.startsWith('|')) {
      inQuote = true
      currentQuote.push(line.replace(/^[>|]\s*/, ''))
    } else if (inQuote && currentQuote.length > 0) {
      // End of quote block
      quotedMessages.push({
        content: currentQuote.join('\n'),
        messageId: null // Can't determine ID from content alone
      })
      currentQuote = []
      inQuote = false
    }
  }
  
  // Pattern 3: HTML quoted sections (if parsing HTML)
  // <blockquote> tags, specific classes, etc.
  
  return quotedMessages
}
```

### Privacy-Filtered Thread Retrieval

Only retrieve emails where ALL current participants were present:

```javascript
async function getThreadMessages(threadId, currentParticipants) {
  // Get all messages in thread
  const response = await dynamodb.query({
    TableName: 'schrute-phase1',
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :threadId AND begins_with(GSI1SK, :prefix)',
    ExpressionAttributeValues: {
      ':threadId': `THREAD#${threadId}`,
      ':prefix': 'MSG#'
    }
  })
  
  // Filter to only messages where ALL current participants were present
  const visibleMessages = response.Items.filter(msg => {
    const msgParticipants = new Set(msg.Participants)
    return currentParticipants.every(p => msgParticipants.has(p))
  })
  
  return visibleMessages.sort((a, b) => 
    new Date(a.Timestamp) - new Date(b.Timestamp)
  )
}
```

### Context for Speech Act Detection

When calling Claude for speech act detection:

```javascript
async function detectSpeechActsWithContext(currentEmail, threadContext) {
  const systemPrompt = `You are a speech act detector for a coordination assistant. 
Your job is to identify and extract all speech acts from email content.

You will be given either:
1. A single email (if it contains full quoted thread history), OR
2. Multiple emails in chronological order (if current email lacks full history)

Focus on detecting speech acts in the MOST RECENT email, but use previous 
emails for context to understand references, implicit commitments, and relationships.

Speech act types: REQUEST, COMMITMENT, QUESTION, DECLARATION, ASSERTION

Return JSON array of speech acts from the MOST RECENT email only.`

  let userPrompt = ''
  
  if (threadContext.emails.length === 1) {
    // Current email contains full context
    userPrompt = `Email from: ${currentEmail.from}
Email to: ${currentEmail.to.join(', ')}
Subject: ${currentEmail.subject}
Date: ${currentEmail.timestamp}

${currentEmail.body}

Extract all speech acts from this email.`
  } else {
    // Need to provide previous emails for context
    userPrompt = `Email Thread Context (chronological order):

${threadContext.emails.slice(0, -1).map((email, idx) => `
--- Previous Email ${idx + 1} ---
From: ${email.from}
To: ${email.to.join(', ')}
Date: ${email.timestamp}

${email.body}
`).join('\n')}

--- CURRENT Email (extract speech acts from this) ---
From: ${currentEmail.from}
To: ${currentEmail.to.join(', ')}
Subject: ${currentEmail.subject}
Date: ${currentEmail.timestamp}

${currentEmail.body}

Extract all speech acts from the CURRENT email only, using previous emails for context.`
  }
  
  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  })
  
  return JSON.parse(response.content[0].text)
}
```

### Context for Query Handling

When answering queries, provide relevant thread context:

```javascript
async function handleQueryWithContext(query, currentEmail, threadId, participants) {
  // Assemble thread context (for understanding the query)
  const threadContext = await assembleThreadContext(currentEmail, threadId, participants)
  
  // Also retrieve relevant speech acts from DynamoDB
  const speechActs = await queryDynamoDB(query, participants)
  
  const systemPrompt = `You are Dwight Schrute, a coordination assistant. 
Answer the user's query based on the speech acts database and thread context.

Thread context helps you understand references in the query.
Speech acts database provides the actual data to answer with.

Format responses naturally and include privacy warnings if results were filtered.`

  const userPrompt = `Thread context:
${formatThreadContext(threadContext)}

Speech acts database results:
${JSON.stringify(speechActs, null, 2)}

User's query: "${query}"

Answer the query based on the speech acts database, using thread context 
to understand references.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  })
  
  return response.content[0].text
}
```

### DynamoDB Schema Extension

Add message metadata to support context retrieval:

```javascript
// New entity type: EMAIL_MESSAGE
{
  "PK": "THREAD#thread_abc123",
  "SK": "MSG#2025-10-27T10:30:00Z#msg_xyz789",
  "EntityType": "EMAIL_MESSAGE",
  "MessageId": "msg_xyz789",
  "Timestamp": "2025-10-27T10:30:00Z",
  "From": "alice@example.com",
  "To": ["bob@example.com", "carol@example.com"],
  "Participants": ["alice@example.com", "bob@example.com", "carol@example.com"],
  "Subject": "PR Review",
  "S3Key": "emails/2025/10/27/msg_xyz789.eml",
  "QuotesMessageIds": ["msg_abc456", "msg_def789"], // Extracted quoted message IDs
  "HasQuotedHistory": true, // Boolean flag
  "GSI1PK": "THREAD#thread_abc123",
  "GSI1SK": "MSG#2025-10-27T10:30:00Z"
}
```

### Storage Strategy

**S3 Storage:**
- Raw emails stored in S3: `emails/YYYY/MM/DD/message-id.eml`
- Retain for 90 days (lifecycle policy)
- Use for gap-filling only

**DynamoDB Storage:**
- Store message metadata (participants, timestamp, quoted IDs)
- Store extracted speech acts
- Use for fast lookups and privacy filtering

**Gap Detection Decision Tree:**

```
1. Current email received
2. Check if email contains quoted history:
   a. Parse for quote markers (>, |, "On X wrote:")
   b. Extract quoted message IDs if possible
   c. Set HasQuotedHistory flag
3. If HasQuotedHistory == true:
   → Provide only current email to LLM (contains full context)
4. If HasQuotedHistory == false:
   → Query DynamoDB for thread messages (privacy filtered)
   → Retrieve missing messages from S3
   → Provide full chronological context to LLM
```

### Example Scenarios

**Scenario 1: Email with full quoted history**
```
Current email body:
"Sure, I'll handle that by Friday.

On Oct 27, Bob wrote:
> Can you review the PR?
> We need it for the demo."
```

**Context decision:** Only provide current email (contains Bob's request as quote)

---

**Scenario 2: Brief reply without quotes**
```
Current email body:
"Sure, will do!"
```

**Context decision:** 
- Detect no quoted history
- Retrieve previous email from thread
- Provide: [Previous email: "Can you review the PR?"] + [Current: "Sure, will do!"]
- LLM can now understand this is a commitment to review the PR

---

**Scenario 3: New participant added**
```
Thread participants: Alice, Bob
Current email: Alice, Bob, Carol
Carol wasn't on previous emails
```

**Context decision:**
- Privacy filter: Only include emails where Alice, Bob, AND Carol were present
- Result: No previous emails visible to all three
- Context: Only current email
- Speech acts from previous emails NOT included in Carol's query results

---

**Scenario 4: Multi-turn conversation**
```
Email 1: Bob: "Can someone review the PR?"
Email 2: Alice: "I can do it"
Email 3: Bob: "Great! By Friday?"
Email 4: Alice: "Sure" (no quotes)
```

**Context for Email 4:**
- No quoted history detected
- Retrieve emails 1-3 from thread (all have same participants)
- Provide full context: [Email 1, 2, 3, 4]
- LLM understands "Sure" = commitment to Friday deadline

### Performance Optimization

**Caching Strategy:**
```javascript
// Cache assembled contexts (thread changes infrequently)
const contextCache = new Map()

async function assembleThreadContextCached(currentEmail, threadId, participants) {
  const cacheKey = `${threadId}:${participants.sort().join(',')}`
  
  // Check cache (expires after 5 minutes)
  const cached = contextCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < 300000) {
    // Append current email to cached context
    return {
      ...cached.context,
      emails: [...cached.context.emails, currentEmail]
    }
  }
  
  // Assemble fresh context
  const context = await assembleThreadContext(currentEmail, threadId, participants)
  
  contextCache.set(cacheKey, {
    context,
    timestamp: Date.now()
  })
  
  return context
}
```

**Token Optimization:**
- Truncate very old thread history (>50 emails or >30 days)
- Summarize old emails if thread is very long
- For queries, only provide last N emails for context (not full history)

### Testing Context Assembly

**Test Cases:**

1. **Single email (no thread):** Context = [current email]
2. **Reply with quotes:** Context = [current email only]
3. **Reply without quotes:** Context = [previous email] + [current]
4. **Long thread with quotes:** Context = [current email only]
5. **Long thread without quotes:** Context = [last N emails] + [current]
6. **New participant added:** Context = [only emails with all participants]
7. **Gap in middle:** Context = [email 1, 3, 5] (missing 2, 4 due to privacy)

---

## Speech Act Detection Strategy

### Accuracy Target: 85-90%

To achieve 85-90% accuracy, we use a multi-pronged approach:

#### 1. Explicit Prompt Engineering

**System Prompt Design:**
- Clear definitions of each speech act type
- Concrete examples for each type
- Explicit extraction format (JSON)
- Emphasis on thoroughness and accuracy

**Example Handling:**
```
GOOD REQUEST examples:
- "Can you review the PR?"
- "We need someone to write docs"
- "Please update the ticket"

BAD REQUEST examples (not requests):
- "The PR needs review" (assertion, not request)
- "I reviewed the PR" (declaration, not request)
```

#### 2. Validation Loop

```javascript
async function detectSpeechActs(email) {
  // First pass: detect speech acts
  const detected = await callClaudeAPI(email)
  
  // Validate: check for required fields
  const validated = detected.filter(act => {
    return act.type && act.actor && act.content
  })
  
  // If low confidence or missing critical info, ask for clarification
  if (validated.length === 0 && email.body.length > 50) {
    await sendClarificationEmail(email, 
      "I processed your email but I'm not sure I detected all the coordination items. Could you rephrase or confirm?"
    )
    return []
  }
  
  return validated
}
```

#### 3. Structured Output

Force Claude to return JSON:
```javascript
const userPrompt = `${emailContent}

CRITICAL: Return ONLY valid JSON. No markdown, no explanation. Just JSON array of speech acts.

Example format:
[
  {
    "type": "REQUEST",
    "actor": "alice@example.com",
    "target": "bob@example.com",
    "content": "review the PR",
    "deadline": "2025-10-31"
  }
]`
```

#### 4. Testing & Iteration

**Test Dataset:**
Create 100 test emails covering:
- Simple single-act emails (20)
- Multi-act emails (30)
- Ambiguous cases (20)
- Edge cases (implicit commitments, unclear deadlines) (30)

**Measurement:**
- Manual review of 20 random emails per week
- Calculate precision/recall per speech act type
- Identify failure patterns
- Iterate on prompts

**Failure Patterns to Watch:**
- Confusing assertions with requests
- Missing implicit commitments
- Incorrectly extracting deadlines
- Missing follow-up questions

---

## Privacy Implementation

### Participant-Based Access Control

**Core Principle:** A user can only see speech acts from email threads where they were a participant.

#### Thread Visibility Algorithm

```javascript
async function getThreadsVisibleToAllParticipants(participants) {
  // For each participant, get their threads
  const participantThreads = await Promise.all(
    participants.map(p => getThreadsForParticipant(p))
  )
  
  // Find intersection (threads where ALL participants were present)
  const intersection = participantThreads.reduce((acc, threads) => {
    return acc.filter(t => threads.includes(t))
  })
  
  return intersection
}

async function getThreadsForParticipant(email) {
  const response = await dynamodb.query({
    TableName: 'schrute-phase1',
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `PARTICIPANT#${email}`
    }
  })
  
  return response.Items.map(item => item.ThreadId)
}
```

#### Query Execution with Privacy

```javascript
async function executePrivateQuery(queryParams, queryParticipants) {
  // 1. Get visible threads
  const visibleThreads = await getThreadsVisibleToAllParticipants(queryParticipants)
  
  if (visibleThreads.length === 0) {
    return {
      results: [],
      privacyWarning: {
        filtered: true,
        message: "âš ï¸ Note: No results visible to all participants on this email. There may be results in other threads."
      }
    }
  }
  
  // 2. Execute query
  const allResults = await queryDynamoDB(queryParams)
  
  // 3. Filter by visible threads
  const visibleResults = allResults.filter(r => 
    visibleThreads.includes(r.EmailThreadId)
  )
  
  // 4. Generate privacy warning
  const wasFiltered = allResults.length > visibleResults.length
  
  return {
    results: visibleResults,
    privacyWarning: wasFiltered ? generatePrivacyWarning(allResults, visibleResults, queryParticipants) : null
  }
}
```

#### Privacy Warning Generation

```javascript
function generatePrivacyWarning(allResults, visibleResults, queryParticipants) {
  const hiddenCount = allResults.length - visibleResults.length
  
  // Find which participants were missing from hidden threads
  const hiddenThreads = allResults
    .filter(r => !visibleResults.includes(r))
    .map(r => r.EmailThreadId)
  
  const missingParticipants = new Set()
  
  for (const threadId of hiddenThreads) {
    const threadParticipants = await getThreadParticipants(threadId)
    for (const participant of queryParticipants) {
      if (!threadParticipants.includes(participant)) {
        missingParticipants.add(participant)
      }
    }
  }
  
  const names = Array.from(missingParticipants)
    .map(email => extractFirstName(email))
  
  return {
    filtered: true,
    hiddenCount,
    message: `⚠️ Note: Some results filtered because ${formatList(names)} ${names.length === 1 ? "wasn't" : "weren't"} on all relevant email threads. For complete results, ask in a thread with the original participants.`
  }
}
```

---

## Infrastructure as Code (SAM)

### SAM Template Structure

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Schrute Phase 1 - Email-Only Coordination Assistant

# TypeScript Build Configuration
# SAM will automatically detect package.json and run 'npm install' and 'npm run build'
# Ensure each Lambda's package.json has a 'build' script that compiles TypeScript
# Example: "build": "esbuild index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js"

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]
  
  EmailDomain:
    Type: String
    Default: schrute.work
  
  FromEmailAddress:
    Type: String
    Default: dwight@schrute.work
  
  AnthropicApiKey:
    Type: String
    NoEcho: true
    Description: Anthropic API key (stored in Secrets Manager)

Globals:
  Function:
    Timeout: 30
    MemorySize: 512
    Runtime: nodejs18.x
    Environment:
      Variables:
        ENVIRONMENT: !Ref Environment
        DYNAMODB_TABLE: !Ref DynamoDBTable

Metadata:
  # Tell SAM how to build TypeScript functions
  AWS::ServerlessRepo::Application:
    Name: schrute-phase1
    Description: Email-based AI coordination assistant
    
Resources:
  # S3 Bucket for raw email storage
  EmailStorageBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "schrute-${Environment}-email-storage"
      LifecycleConfiguration:
        Rules:
          - Id: DeleteOldEmails
            Status: Enabled
            ExpirationInDays: 90

  # DynamoDB Table
  DynamoDBTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "schrute-${Environment}"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
        - AttributeName: GSI2PK
          AttributeType: S
        - AttributeName: GSI2SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: GSI1
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
        - IndexName: GSI2
          KeySchema:
            - AttributeName: GSI2PK
              KeyType: HASH
            - AttributeName: GSI2SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true

  # Secrets Manager for API keys
  AnthropicApiKeySecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub "schrute-${Environment}-anthropic-api-key"
      SecretString: !Ref AnthropicApiKey

  # Lambda Execution Role
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: SchrutePolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:PutItem
                  - dynamodb:Query
                  - dynamodb:UpdateItem
                Resource:
                  - !GetAtt DynamoDBTable.Arn
                  - !Sub "${DynamoDBTable.Arn}/index/*"
              - Effect: Allow
                Action:
                  - s3:GetObject
                Resource: !Sub "${EmailStorageBucket.Arn}/*"
              - Effect: Allow
                Action:
                  - ses:SendEmail
                  - ses:SendRawEmail
                Resource: "*"
              - Effect: Allow
                Action:
                  - lambda:InvokeFunction
                Resource: "*"
              - Effect: Allow
                Action:
                  - secretsmanager:GetSecretValue
                Resource: !Ref AnthropicApiKeySecret

  # Email Receiver Lambda
  EmailReceiverFunction:
    Type: AWS::Serverless::Function
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: "es2020"
        Sourcemap: true
        EntryPoints: 
          - index.ts
    Properties:
      FunctionName: !Sub "schrute-${Environment}-email-receiver"
      CodeUri: src/lambdas/email-receiver/
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Environment:
        Variables:
          EMAIL_BUCKET: !Ref EmailStorageBucket
          SPEECH_ACT_DETECTOR_FUNCTION: !Ref SpeechActDetectorFunction
          QUERY_HANDLER_FUNCTION: !Ref QueryHandlerFunction
          EMAIL_RESPONSE_FUNCTION: !Ref EmailResponseFunction

  # Speech Act Detector Lambda
  SpeechActDetectorFunction:
    Type: AWS::Serverless::Function
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: "es2020"
        Sourcemap: true
        EntryPoints: 
          - index.ts
    Properties:
      FunctionName: !Sub "schrute-${Environment}-speech-act-detector"
      CodeUri: src/lambdas/speech-act-detector/
      Handler: index.handler
      MemorySize: 1024
      Timeout: 60
      Role: !GetAtt LambdaExecutionRole.Arn
      Environment:
        Variables:
          ANTHROPIC_API_KEY_SECRET: !Ref AnthropicApiKeySecret
          MODEL: claude-3-5-haiku-20241022

  # Query Handler Lambda
  QueryHandlerFunction:
    Type: AWS::Serverless::Function
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: "es2020"
        Sourcemap: true
        EntryPoints: 
          - index.ts
    Properties:
      FunctionName: !Sub "schrute-${Environment}-query-handler"
      CodeUri: src/lambdas/query-handler/
      Handler: index.handler
      MemorySize: 1024
      Timeout: 60
      Role: !GetAtt LambdaExecutionRole.Arn
      Environment:
        Variables:
          ANTHROPIC_API_KEY_SECRET: !Ref AnthropicApiKeySecret
          MODEL: claude-3-5-haiku-20241022

  # Email Response Lambda
  EmailResponseFunction:
    Type: AWS::Serverless::Function
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: "es2020"
        Sourcemap: true
        EntryPoints: 
          - index.ts
    Properties:
      FunctionName: !Sub "schrute-${Environment}-email-response"
      CodeUri: src/lambdas/email-response/
      Handler: index.handler
      MemorySize: 256
      Role: !GetAtt LambdaExecutionRole.Arn
      Environment:
        Variables:
          SES_FROM_EMAIL: !Ref FromEmailAddress
          SES_FROM_NAME: Dwight Schrute

  # SES Permission for Lambda
  SESInvokePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref EmailReceiverFunction
      Action: lambda:InvokeFunction
      Principal: ses.amazonaws.com
      SourceAccount: !Ref AWS::AccountId

Outputs:
  EmailStorageBucket:
    Value: !Ref EmailStorageBucket
    Export:
      Name: !Sub "${AWS::StackName}-EmailStorageBucket"

  DynamoDBTable:
    Value: !Ref DynamoDBTable
    Export:
      Name: !Sub "${AWS::StackName}-DynamoDBTable"

  EmailReceiverFunctionArn:
    Value: !GetAtt EmailReceiverFunction.Arn
    Export:
      Name: !Sub "${AWS::StackName}-EmailReceiverFunctionArn"
```

---

## Cost Estimation

### Monthly Cost Breakdown (Low Volume: 100 emails/month)

**DynamoDB:**
- Storage: ~1 GB (100,000 speech acts) = $0.25
- Read requests: ~1,000 queries = $0.25
- Write requests: ~500 speech acts = $1.25
- **Total: ~$1.75/month**

**Lambda:**
- Email Receiver: 100 invocations × 0.5s × 512MB = $0.01
- Speech Act Detector: 100 invocations × 2s × 1024MB = $0.04
- Query Handler: 50 invocations × 2s × 1024MB = $0.02
- Email Response: 150 invocations × 0.2s × 256MB = $0.01
- **Total: ~$0.08/month**

**S3:**
- Storage: ~1 GB emails = $0.02
- Requests: 100 PUTs + 100 GETs = $0.01
- **Total: ~$0.03/month**

**SES:**
- Receiving: 100 emails = Free (first 1,000 free)
- Sending: 150 emails = Free (first 62,000 free on EC2)
- **Total: $0/month**

**Anthropic Claude API:**
- Speech act detection: 100 emails × 500 tokens avg × $0.00025/1K tokens = $0.0125
- Query handling: 50 queries × 1,000 tokens avg × $0.00025/1K tokens = $0.0125
- **Total: ~$0.025/month** (using Haiku)

**Total Monthly Cost (100 emails): ~$1.91/month**

### Monthly Cost (Medium Volume: 1,000 emails/month)

**DynamoDB:** ~$17.50  
**Lambda:** ~$0.80  
**S3:** ~$0.30  
**SES:** ~$0.10 (receiving), Free (sending)  
**Claude API:** ~$0.25 (using Haiku)

**Total Monthly Cost (1,000 emails): ~$18.95/month**

### Cost Optimization Strategies

1. **Claude Model Selection:**
   - Using Haiku (12-15x cheaper than Sonnet)
   - Monitor accuracy - if <85%, upgrade specific operations to Sonnet
   - Hybrid approach: Haiku for detection, Sonnet for complex queries (if needed)

2. **DynamoDB On-Demand vs Provisioned:**
   - Use on-demand for Phase 1 (unpredictable traffic)
   - Switch to provisioned if sustained usage patterns emerge

3. **Lambda Memory Tuning:**
   - Profile actual memory usage
   - Adjust memory allocations to minimize cost

4. **S3 Lifecycle Policies:**
   - Move old emails to Glacier after 90 days
   - Delete after 1 year (GDPR compliance)

5. **API Cost Reduction:**
   - Cache frequently asked queries
   - Batch speech act detection where possible
   - Use context efficiently (avoid redundant context in prompts)

---

## Performance Targets

### Latency Targets

**Email Acknowledgment:**
- Target: < 30 seconds
- Measured: SES receipt → SES send acknowledgment
- Components:
  - Email Receiver: < 2s
  - Speech Act Detector: < 20s (Claude API)
  - Email Response: < 5s

**Query Response:**
- Target: < 30 seconds
- Measured: SES receipt → SES send response
- Components:
  - Email Receiver: < 2s
  - Query Handler: < 20s (DynamoDB + Claude API)
  - Email Response: < 5s

### Throughput Targets

**Phase 1 (Dogfooding):**
- 10-50 emails/day
- 5-20 queries/day

**Future Scaling:**
- DynamoDB: Virtually unlimited (on-demand)
- Lambda: 1,000 concurrent executions (default)
- SES: 14 emails/second receiving (quota increase if needed)

### Reliability Targets

**Availability:** 99.5% (dependent on AWS SES, Lambda, DynamoDB)

**Data Durability:** 99.999999999% (11 nines via DynamoDB)

**Error Rate:** < 1% (excluding user errors like malformed queries)

---

## Security Considerations

### Data Protection

**Encryption at Rest:**
- DynamoDB: Server-side encryption enabled by default
- S3: SSE-S3 encryption for email storage
- Secrets Manager: Encrypted API keys

**Encryption in Transit:**
- All AWS API calls use HTTPS
- SES uses TLS for email transmission
- Claude API uses HTTPS

**Access Control:**
- Lambda functions use least-privilege IAM roles
- API keys stored in Secrets Manager (not environment variables)
- S3 bucket policies restrict access to Lambda only

### Privacy & Compliance

**Email Privacy:**
- Raw emails stored in S3 with 90-day retention
- Participant-based access control in DynamoDB
- No cross-thread information leakage

**GDPR Considerations:**
- User can request deletion of all their data
- Implement data export functionality (Phase 2)
- Email retention policy (90 days)

**PII Handling:**
- Email addresses stored as-is (needed for coordination)
- No sensitive data stored beyond email content
- Consider anonymization for analytics (future)

### Monitoring & Alerting

**CloudWatch Alarms:**
- Lambda error rate > 5%
- Lambda duration > 50s
- DynamoDB throttled requests > 10
- SES bounce rate > 10%

**CloudWatch Logs:**
- All Lambda invocations logged
- Speech act detection results logged (for accuracy measurement)
- Query execution logged (for debugging)

**Metrics to Track:**
- Speech act detection accuracy (manual review)
- Query response accuracy (user feedback)
- Privacy violations (should be zero)
- API costs (budget alerts)

---

## Error Handling & Recovery

### Lambda Error Handling

**Retry Strategy:**
- Automatic retries for transient errors (3 attempts)
- Exponential backoff (1s, 2s, 4s)
- Dead Letter Queue (SQS) for failed messages

**Error Types:**

1. **Parsing Errors (Email):**
   - Log error details
   - Send user-friendly error message
   - Don't store invalid data

2. **Claude API Errors:**
   - Retry on rate limit (429)
   - Retry on timeout (5xx)
   - Fallback message on persistent failure

3. **DynamoDB Errors:**
   - Retry on throttling
   - Alert on persistent failures
   - Graceful degradation (inform user)

4. **SES Sending Errors:**
   - Retry on transient failures
   - Log bounce/complaint notifications
   - Alert on high bounce rate

### Failure Scenarios

**Scenario 1: Claude API Down**
```
1. Speech Act Detector detects API failure
2. Logs error with email details
3. Sends user acknowledgment: "I received your email but 
   couldn't process it yet. I'll retry in a few minutes."
4. Store email in retry queue
5. Process when API recovers
```

**Scenario 2: DynamoDB Throttling**
```
1. Write fails with ProvisionedThroughputExceededException
2. Exponential backoff retry (3 attempts)
3. If still failing, send user message: "I'm experiencing 
   high load. Your request is queued and will be processed soon."
4. Store in DLQ for manual intervention
```

**Scenario 3: Malformed Email**
```
1. Parser fails to extract speech acts
2. Log parsing error with email content
3. Send clarification request: "I had trouble understanding 
   your email. Could you rephrase?"
4. Don't store anything (avoid bad data)
```

---

## Testing Strategy

### Unit Testing

**Lambda Functions:**
- Test each function in isolation
- Mock AWS SDK calls (DynamoDB, S3, SES)
- Mock Claude API responses
- Test error handling paths

**Speech Act Detection:**
- Test prompt generates correct JSON
- Test parsing of Claude responses
- Test handling of ambiguous cases
- Test multi-act emails

**Privacy Filtering:**
- Test thread visibility algorithm
- Test privacy warning generation
- Test edge cases (no visible threads, partial visibility)

### Integration Testing

**End-to-End Email Flow:**
1. Send test email to SES
2. Verify speech acts stored in DynamoDB
3. Verify acknowledgment email sent
4. Query stored speech acts
5. Verify query response

**Privacy Testing:**
1. Create threads with different participant sets
2. Query from various participant combinations
3. Verify filtering works correctly
4. Verify privacy warnings appear when expected

### Load Testing

**Objectives:**
- Verify Lambda scales to handle 10× expected load
- Identify DynamoDB throttling points
- Measure end-to-end latency under load

**Test Scenarios:**
- 100 emails/minute for 10 minutes
- Burst of 50 queries simultaneously
- Sustained load for 1 hour

### Accuracy Testing

**Speech Act Detection:**
- Manual test set: 100 emails with known speech acts
- Calculate precision/recall for each type
- Target: 85-90% overall accuracy

**Query Understanding:**
- Manual test set: 50 queries with expected results
- Measure response accuracy
- Target: >90% correct

---

## Deployment Process

### Initial Setup

**1. AWS Account Setup:**
```bash
# Configure AWS CLI
aws configure

# Create S3 bucket for SAM artifacts
aws s3 mb s3://schrute-sam-artifacts
```

**2. Domain Verification (SES):**
```bash
# Verify schrute.work domain in SES console
# Add DNS records (TXT, MX, DKIM)
# Wait for verification (can take up to 72 hours)
```

**3. Deploy Stack:**
```bash
# Build Lambda functions
sam build

# Deploy (guided first time)
sam deploy --guided \
  --parameter-overrides \
    Environment=dev \
    EmailDomain=schrute.work \
    FromEmailAddress=dwight@schrute.work \
    AnthropicApiKey=<your-api-key>
```

**4. Configure SES Receipt Rule:**
```bash
# Create receipt rule set (via AWS Console or CLI)
# Add rule:
#   - Recipients: dwight@schrute.work
#   - Actions:
#     1. S3: Store in EmailStorageBucket
#     2. Lambda: Invoke EmailReceiverFunction
```

**5. Test Setup:**
```bash
# Send test email
echo "Test email body" | mail -s "Test" dwight@schrute.work

# Check CloudWatch logs
sam logs -n EmailReceiverFunction --tail
```

### Update Deployment

```bash
# Make code changes
# Build
sam build

# Deploy (uses previous parameters)
sam deploy

# Validate deployment
sam validate
```

### Rollback

```bash
# List previous stacks
aws cloudformation describe-stacks

# Rollback to previous version
aws cloudformation rollback-stack --stack-name schrute-dev
```

---

## Monitoring Dashboard

### CloudWatch Dashboard Layout

**Email Processing:**
- Email Receiver invocations (count)
- Speech Act Detector invocations (count)
- Email Response sent (count)
- Average processing time (seconds)
- Error rate (%)

**Query Processing:**
- Query Handler invocations (count)
- Average query response time (seconds)
- Privacy-filtered queries (count)
- Error rate (%)

**DynamoDB:**
- Read capacity units consumed
- Write capacity units consumed
- Throttled requests (count)
- Storage size (GB)

**Cost Tracking:**
- Lambda cost (daily)
- DynamoDB cost (daily)
- Claude API cost (daily)
- Total cost (daily)

**Accuracy Metrics (Manual):**
- Speech act detection accuracy (weekly sample)
- Query response accuracy (weekly sample)
- Privacy violations (ongoing, should be zero)

---

## Migration Path to Phase 2

### What Changes in Phase 2

**Phase 1 (Observation Only):**
- Detects speech acts
- Answers queries
- No automated actions

**Phase 2 (Action-Taking):**
- Sends reminders for overdue commitments
- Escalates when no response
- Creates tasks in external systems (via MCP)
- Executes user-defined processes

### Architecture Changes Needed

**New Components:**
- EventBridge Rules for time-based triggers
- Process Definition storage (DynamoDB or S3)
- MCP Server integrations (GitHub, Jira, etc.)
- Action execution Lambda functions

**Modified Components:**
- Speech Act Detector: Add process execution logic
- Query Handler: Add action routing
- DynamoDB Schema: Add process definitions

**Data Model Additions:**
- PROCESS entity type
- ACTION entity type
- Execution history and status

### Backward Compatibility

Phase 1 architecture is designed to support Phase 2 without breaking changes:
- DynamoDB schema extensible (add new entity types)
- Lambda functions modular (add new functions)
- Privacy model unchanged (applies to actions too)

---

## Appendix A: DynamoDB Query Examples

### Example 1: Get All Speech Acts in Thread

```javascript
const AWS = require('aws-sdk')
const dynamodb = new AWS.DynamoDB.DocumentClient()

async function getSpeechActsInThread(threadId) {
  const params = {
    TableName: 'schrute-phase1',
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :threadId',
    ExpressionAttributeValues: {
      ':threadId': `THREAD#${threadId}`
    }
  }
  
  const result = await dynamodb.query(params).promise()
  return result.Items
}
```

### Example 2: Get Commitments by Person with Date Range

```javascript
async function getCommitmentsByPerson(email, startDate, endDate) {
  const params = {
    TableName: 'schrute-phase1',
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :actor AND GSI2SK BETWEEN :start AND :end',
    FilterExpression: '#type = :commitment',
    ExpressionAttributeNames: {
      '#type': 'Type'
    },
    ExpressionAttributeValues: {
      ':actor': `ACTOR#${email}`,
      ':start': startDate,
      ':end': endDate,
      ':commitment': 'COMMITMENT'
    }
  }
  
  const result = await dynamodb.query(params).promise()
  return result.Items
}
```

### Example 3: Get Overdue Commitments

```javascript
async function getOverdueCommitments() {
  const now = new Date().toISOString()
  
  // Note: This requires a scan since we need to filter across all actors
  // In production, consider a GSI on deadline for better performance
  const params = {
    TableName: 'schrute-phase1',
    FilterExpression: '#type = :commitment AND #deadline < :now',
    ExpressionAttributeNames: {
      '#type': 'Type',
      '#deadline': 'Data.Deadline'
    },
    ExpressionAttributeValues: {
      ':commitment': 'COMMITMENT',
      ':now': now
    }
  }
  
  const result = await dynamodb.scan(params).promise()
  return result.Items
}
```

---

## Appendix B: Error Response Templates

### Email Parsing Error

```
Subject: Re: [original subject]

Hi [name],

I received your email but had trouble parsing it. Could you send it again or rephrase? 

If this keeps happening, there might be an issue with email encoding.

Dwight
```

### Claude API Failure

```
Subject: Re: [original subject]

Hi [name],

I received your email but I'm experiencing technical difficulties processing it right now. I'll retry automatically in a few minutes.

If this is urgent, please resend or reach out directly.

Dwight
```

### Query Not Understood

```
Subject: Re: [query subject]

Hi [name],

I'm not sure I understood your question. Could you rephrase it?

Some examples of questions I can answer:
- "What did Bob commit to?"
- "Show me requests from last week"
- "Who's waiting on Alice?"

Dwight
```

### Privacy Filter (No Results)

```
Subject: Re: [query subject]

Hi [name],

I don't see any results visible to all participants on this email.

⚠️ Note: There may be results in other threads. For complete results, ask in a thread with the original participants.

Dwight
```

---

## Document Status

**Status:** Ready for Review  
**Next Steps:**
1. Review and approve architecture
2. Begin implementation
3. Set up AWS infrastructure
4. Develop Lambda functions
5. Test speech act detection accuracy
6. Deploy to dev environment

**Open Questions:**
- None (all PRD questions addressed)

---

**Document End**
