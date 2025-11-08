# Schrute Phase 2 - Production Architecture

## 🎯 Overview
Production-ready, serverless deployment of Schrute on AWS with real email integration via SES.

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Email Ingestion                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    SES receives email
                              │
                              ▼
                    ┌──────────────────┐
                    │   S3: Raw Emails │
                    │  (EML format)    │
                    └──────────────────┘
                              │
                         S3 Event
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Lambda: Ingest                              │
│  - Parse EML format                                              │
│  - Extract metadata (from, to, subject, thread_id)              │
│  - Store in DynamoDB (threads, messages)                        │
│  - Write parsed JSON to S3                                      │
│  - Invoke Processor Lambda                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lambda: Processor                             │
│  - Detect speech acts (requests, commitments, decisions)        │
│  - Store speech acts in DynamoDB                                │
│  - Check activation (is Schrute addressed?)                     │
│  - Decide if response needed                                    │
│  - If yes: invoke Responder Lambda                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                   (If should respond)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lambda: Responder                             │
│  - Assemble context:                                            │
│    • Recent N messages (full)                                   │
│    • Older messages (summarized)                                │
│    • Speech acts (boosted relevance)                            │
│    • MCP skill context (boosted relevance)                      │
│  - Load personality config                                      │
│  - Generate response via Claude API                             │
│  - Send email via SES                                           │
│  - Log activation decision                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Email sent to recipient(s)
```

## 📦 AWS Resources

### S3 Buckets

**schrute-emails-raw**
- Purpose: Store raw emails from SES (EML format)
- Retention: 90 days (configurable)
- Structure: `{year}/{month}/{day}/{message-id}.eml`

**schrute-emails-processed**
- Purpose: Store parsed email JSON
- Retention: 90 days (configurable)
- Structure: `{thread-id}/{message-id}.json`

**schrute-knowledge**
- Purpose: Knowledge store markdown files
- Retention: Permanent
- Structure: `{category}/{id}.md`

**schrute-skills**
- Purpose: Dynamic skill definitions
- Retention: Permanent
- Structure: `skills.json`

**schrute-personalities**
- Purpose: Personality configurations
- Retention: Permanent
- Structure: `{personality-name}.yaml`

### DynamoDB Tables

**schrute-threads**
- Purpose: Thread metadata and participant tracking
- Primary Key: `thread_id` (String)
- Attributes:
  - `subject`: String
  - `participants`: List (all email addresses that have seen thread)
  - `created_at`: String (ISO 8601)
  - `updated_at`: String (ISO 8601)
  - `message_count`: Number
  - `last_message_id`: String

**schrute-messages**
- Purpose: Message index for fast retrieval
- Primary Key: `message_id` (String)
- GSI: `thread_id-timestamp-index`
  - Partition key: `thread_id`
  - Sort key: `timestamp`
- Attributes:
  - `thread_id`: String
  - `from_email`: String
  - `from_name`: String
  - `to`: List (email addresses)
  - `cc`: List (email addresses)
  - `subject`: String
  - `timestamp`: String (ISO 8601)
  - `in_reply_to`: String (nullable)
  - `s3_key`: String (path to processed JSON)
  - `participants`: List (all addresses from/to/cc)

**schrute-speech-acts**
- Purpose: Speech act index
- Primary Key: `act_id` (String - UUID)
- GSI: `thread_id-timestamp-index`
  - Partition key: `thread_id`
  - Sort key: `timestamp`
- GSI: `type-timestamp-index`
  - Partition key: `type`
  - Sort key: `timestamp`
- Attributes:
  - `type`: String (request, commitment, question, decision, etc.)
  - `thread_id`: String
  - `message_id`: String
  - `from_email`: String
  - `content`: String (extracted speech act text)
  - `timestamp`: String (ISO 8601)
  - `participants`: List (from message)

**schrute-activation-log**
- Purpose: Record activation decisions for analysis
- Primary Key: `log_id` (String - UUID)
- GSI: `thread_id-timestamp-index`
- Attributes:
  - `thread_id`: String
  - `message_id`: String
  - `timestamp`: String (ISO 8601)
  - `should_respond`: Boolean
  - `reason`: String (why activated/not activated)
  - `schrute_addressed`: Boolean
  - `response_sent`: Boolean (nullable)
  - `response_message_id`: String (nullable)

### Lambda Functions

**schrute-ingest**
- Trigger: S3 event (ObjectCreated)
- Memory: 512 MB
- Timeout: 30 seconds
- Environment:
  - `THREADS_TABLE`: DynamoDB table name
  - `MESSAGES_TABLE`: DynamoDB table name
  - `PROCESSED_BUCKET`: S3 bucket name
  - `PROCESSOR_FUNCTION`: Next Lambda ARN

**schrute-processor**
- Trigger: Invoked by ingest-lambda
- Memory: 1024 MB
- Timeout: 60 seconds
- Environment:
  - `ANTHROPIC_API_KEY_SECRET`: Secrets Manager ARN
  - `SPEECH_ACTS_TABLE`: DynamoDB table name
  - `ACTIVATION_LOG_TABLE`: DynamoDB table name
  - `RESPONDER_FUNCTION`: Next Lambda ARN
  - `SCHRUTE_EMAIL`: Email address to check for activation

**schrute-responder**
- Trigger: Invoked by processor-lambda
- Memory: 1024 MB
- Timeout: 120 seconds
- Environment:
  - `ANTHROPIC_API_KEY_SECRET`: Secrets Manager ARN
  - `THREADS_TABLE`: DynamoDB table name
  - `MESSAGES_TABLE`: DynamoDB table name
  - `SPEECH_ACTS_TABLE`: DynamoDB table name
  - `KNOWLEDGE_BUCKET`: S3 bucket name
  - `PERSONALITIES_BUCKET`: S3 bucket name
  - `SKILLS_BUCKET`: S3 bucket name
  - `MCP_KNOWLEDGE_FUNCTION`: Lambda ARN
  - `MCP_SKILLS_FUNCTION`: Lambda ARN
  - `SES_FROM_EMAIL`: Sender email
  - `CONTEXT_WINDOW_SIZE`: Number of recent messages (default: 10)

**schrute-mcp-knowledge**
- Trigger: Invoked by responder-lambda
- Memory: 512 MB
- Timeout: 30 seconds
- Purpose: MCP Knowledge Store server as Lambda

**schrute-mcp-skills**
- Trigger: Invoked by responder-lambda
- Memory: 512 MB
- Timeout: 30 seconds
- Purpose: MCP Dynamic Skills server as Lambda

### Secrets Manager

**schrute/anthropic-api-key**
- Purpose: Store Anthropic API key securely
- Type: SecretString

### SES Configuration

**Receipt Rule**
- Recipient: schrute@{your-domain}
- Action: S3 (write to schrute-emails-raw bucket)

**Sending**
- From: schrute@{your-domain}
- Domain verified in SES

## 🧠 Context Assembly Strategy

### Sliding Window with Relevance Boosting

The responder Lambda implements an "infinite context" approach through intelligent prioritization:

**1. Recent Messages (Full)**
- Most recent N messages (default: 10) included in full
- Configurable via `CONTEXT_WINDOW_SIZE`

**2. Older Messages (Summarized)**
- Messages beyond window are summarized
- Summaries stored/cached in DynamoDB
- Include: key participants, topics, decisions

**3. Speech Act Boosting**
- Messages containing speech acts get priority
- Commitments and decisions especially important
- Included even if outside window

**4. MCP Skill Relevance**
- Messages relevant to connected MCP skills boosted
- Determined by keyword matching and embeddings (future)
- For now: simple keyword matching against skill descriptions

**5. Graceful Degradation**
- If context exceeds token limit:
  - Keep most recent messages
  - Keep speech acts
  - Trim older summaries
- Always maintain thread coherence

### Token Budget Management

**Limits:**
- Target context: 50,000 tokens (safe margin)
- Reserved for response: 4,000 tokens
- Available for context: 46,000 tokens

**Distribution:**
- Recent messages: ~30,000 tokens (60%)
- Speech acts: ~10,000 tokens (20%)
- Summaries: ~6,000 tokens (15%)
- System prompt + personality: ~2,000 tokens (5%)

## 🔒 Security & Privacy

### Privacy Model (Unchanged)
- Participant-based access control
- Information only shared if ALL current participants have access
- Explicit denials when blocked

### AWS Security
- IAM roles with least privilege
- Secrets Manager for API keys
- VPC for Lambda (optional, for future RDS)
- S3 bucket encryption at rest
- DynamoDB encryption at rest
- CloudWatch Logs for audit trail

### Email Security
- Only respond to explicitly addressed emails
- No whitelist/allowlist (trust SES recipient config)
- Validate email structure before processing
- Rate limiting via Lambda reserved concurrency

## 📊 Monitoring & Observability

### CloudWatch Metrics
- Lambda invocations, errors, duration
- DynamoDB read/write capacity
- S3 GET/PUT operations
- SES send success/failure

### CloudWatch Logs
- Structured JSON logging
- Correlation IDs for request tracing
- Log levels: DEBUG, INFO, WARN, ERROR

### Alarms (Future)
- Lambda error rate > threshold
- DynamoDB throttling
- SES bounce rate > threshold
- Processing latency > threshold

## 🧪 Testing Strategy

### Local Testing (Preserved)
- CLI still works with YAML files
- All existing unit tests pass
- Integration tests with mocked AWS

### AWS Testing
- LocalStack for local AWS simulation
- Integration tests with test SES email
- Canary deployment with test emails

### E2E Testing
- Send test email to Schrute
- Verify processing pipeline
- Verify response sent
- Verify DynamoDB state

## 🚀 Deployment

### Prerequisites
- AWS CLI configured
- SAM CLI installed
- Domain configured in SES
- Anthropic API key

### Deployment Steps
```bash
# Build
sam build

# Deploy
sam deploy --guided

# Set Anthropic API key
aws secretsmanager create-secret \
  --name schrute/anthropic-api-key \
  --secret-string "sk-ant-..."

# Configure SES receipt rule (manual or via CLI)
```

### Configuration
- All configs baked into deployment
- Personalities bundled in Lambda
- Knowledge/skills seeded at deploy time
- Redeploy to update configs

## 🔄 Migration from Phase 1

### What Changes
- Storage: File system → S3 + DynamoDB
- Execution: Local CLI → Lambda
- Email: YAML files → Real SES emails

### What Stays the Same
- Core logic (speech acts, privacy, activation)
- Personality system
- MCP integration
- Query handling

### Backward Compatibility
- CLI still works for local testing
- Existing tests still pass
- Same TypeScript codebase

## 📈 Future Enhancements (Post-Phase 2)

- Vector embeddings for semantic search
- Automatic archival to Glacier
- Multi-region deployment
- Enhanced MCP skill discovery
- Web dashboard for monitoring
- Email template customization
