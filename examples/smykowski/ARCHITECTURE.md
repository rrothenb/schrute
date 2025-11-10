# Smykowski Architecture

## Overview

Smykowski is an AI project coordinator for GitHub teams, built on top of the Schrute framework. It demonstrates how to extend Schrute's core functionality to create specialized coordination assistants.

## Design Principles

1. **Zero Core Modifications**: Smykowski extends Schrute without modifying its code
2. **GitHub-Native**: All coordination state lives in GitHub (Issues, Wiki, Discussions)
3. **Email-First**: Primary communication channel is email
4. **Serverless**: AWS Lambda-based architecture for scalability
5. **Privacy-Aware**: Inherits Schrute's privacy filtering system

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Email Interface                          │
│                       (via Schrute/SES)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lambda: Email Processor                       │
│  - Extract action items, commitments, decisions                 │
│  - Create GitHub issues                                          │
│  - Execute workflows                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   GitHub Integration     │   │   DynamoDB Storage      │
│  - Issues                │   │  - Commitments          │
│  - Pull Requests         │   │  - Team State           │
│  - Wiki                  │   │  - Metrics              │
│  - Discussions           │   └─────────────────────────┘
│  - Projects              │
└─────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│ Lambda: GitHub Webhook   │   │  Lambda: Scheduler      │
│  - Issue events          │   │  - Deadline checks      │
│  - PR events             │   │  - Stale PR detection   │
│  - Discussion events     │   │  - Daily standup prep   │
└─────────────────────────┘   └─────────────────────────┘
```

## Components

### 1. GitHub Integration Layer

**Purpose**: Interact with GitHub API

**Modules**:
- `client.ts`: Octokit wrapper with rate limiting
- `issues.ts`: Issue CRUD operations
- `pull-requests.ts`: PR management and review coordination
- `wiki.ts`: Wiki page management
- `discussions.ts`: Discussion creation (GraphQL)
- `projects.ts`: Projects v2 integration (GraphQL)
- `webhooks.ts`: Webhook verification and parsing

**Key Features**:
- Automatic retry with exponential backoff
- Rate limit handling
- Error recovery
- Comprehensive type safety

### 2. Extractors (LLM-Powered)

**Purpose**: Extract structured data from natural language

**Modules**:
- `action-items.ts`: Extract tasks from emails
- `commitments.ts`: Detect explicit promises
- `dates.ts`: Parse natural language dates using Claude
- `assignments.ts`: Determine appropriate assignees
- `dependencies.ts`: Extract issue dependencies

**How It Works**:
```typescript
const extractor = new ActionItemExtractor(claudeClient)
const items = await extractor.extract(email)
// Returns: Array of ActionItem with assignees, deadlines, confidence
```

### 3. Workflows

**Purpose**: Orchestrate coordination tasks

**Implemented Workflows**:

1. **Meeting Followup**: Convert meeting notes → GitHub issues
2. **Deadline Tracking**: Monitor commitments, send reminders
3. **PR Review Coordination**: Track PRs, request reviews, escalate
4. **Status Synthesis**: Generate project status reports
5. **Workload Balancing**: Identify and resolve workload imbalances

**Workflow Pattern**:
```typescript
class WorkflowName {
  async execute(context): Promise<Result> {
    // 1. Gather data
    // 2. Process with LLM/logic
    // 3. Update GitHub
    // 4. Store state in DynamoDB
    // 5. Send notifications
  }
}
```

### 4. Schrute Bridge

**Purpose**: Access Schrute's core functionality

**What It Provides**:
- Speech act detection
- Privacy filtering
- Query handling
- Personality system
- Memory summarization

**Usage**:
```typescript
const bridge = new SchruteBridge({ claudeApiKey })
const speechActs = await bridge.detectSpeechActs(email)
const context = await bridge.assembleContext(threadId, participants)
```

### 5. DynamoDB Storage

**Tables**:

1. **Commitments**: Track promises and deadlines
   - PK: `id`
   - GSI: `person_email-deadline-index`

2. **Team State**: Team member information
   - PK: `email`
   - Tracks: workload, expertise, vacation status

3. **Metrics**: Process metrics
   - PK: `metric_id`
   - Tracks: PR review time, cycle time, velocity

### 6. Lambda Functions

**email-processor**:
- Triggered by: SQS (emails from Schrute)
- Actions: Extract items, create issues, run workflows

**github-webhook**:
- Triggered by: API Gateway (GitHub webhooks)
- Actions: Handle issue/PR/discussion events

**scheduler**:
- Triggered by: EventBridge (every 15 minutes)
- Actions: Deadline checks, reminders, metrics

## Data Flow Examples

### Example 1: Meeting Notes → GitHub Issues

```
1. Email received with meeting notes
   ↓
2. Schrute's ingest Lambda processes email
   ↓
3. Smykowski's email-processor triggered
   ↓
4. ActionItemExtractor extracts items with Claude
   ↓
5. DateParser parses deadlines with Claude
   ↓
6. MeetingFollowupWorkflow creates issues
   ↓
7. GitHub issues created with assignments
   ↓
8. Discussion post summarizes meeting
   ↓
9. Confirmation email sent to attendees
```

### Example 2: Deadline Reminder

```
1. Scheduler Lambda runs (every 15 min)
   ↓
2. Query commitments from DynamoDB
   ↓
3. DeadlineTrackingWorkflow checks deadlines
   ↓
4. Identify upcoming/overdue items
   ↓
5. Post reminders to GitHub issues
   ↓
6. Update commitment status in DynamoDB
   ↓
7. Send escalation emails if overdue
```

## Deployment Architecture

**AWS Resources**:
- 3 Lambda functions (email-processor, github-webhook, scheduler)
- 3 DynamoDB tables (on-demand billing)
- 3 Secrets Manager secrets
- 1 API Gateway REST API
- 1 EventBridge rule

**Cost Estimate** (for small team, ~100 emails/day):
- Lambda: ~$5/month
- DynamoDB: ~$2/month
- Secrets Manager: ~$1/month
- API Gateway: ~$0.50/month
- **Total: ~$8.50/month**

## Integration with Schrute

Smykowski extends Schrute through composition, not modification:

```typescript
// Smykowski imports and uses Schrute's components
import { SpeechActDetector } from '@schrute/lib/speech-acts/detector.js'
import { PrivacyTracker } from '@schrute/lib/privacy/tracker.js'

// But Schrute is unaware of Smykowski
// All Smykowski-specific logic lives in examples/smykowski/
```

## Security

1. **Secrets Management**: All tokens in Secrets Manager
2. **Webhook Verification**: HMAC signature validation
3. **IAM Least Privilege**: Functions have minimal permissions
4. **DynamoDB Encryption**: At-rest encryption enabled
5. **Privacy Filtering**: Inherited from Schrute

## Extensibility

To add new workflows:

1. Create workflow class in `src/lib/workflows/`
2. Implement `execute()` method
3. Wire into Lambda handler
4. Deploy with SAM

To add new extractors:

1. Create extractor in `src/lib/extractors/`
2. Use Claude API for intelligent extraction
3. Return typed results
4. Add tests

## Testing Strategy

- **Unit Tests**: GitHub integration, extractors, workflows
- **Integration Tests**: End-to-end workflow execution
- **Mocks**: GitHub API mocked for fast, reliable tests
- **Live Tests**: Optional Claude API tests (with API key)
