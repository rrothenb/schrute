# Schrute Phase 1: Implementation Guide

**Version:** 2.0 (Revised - Accountability-Enabled)  
**Date:** November 5, 2025  
**Target:** Claude Code Development

---

## What We're Building

Schrute Phase 1 is an **email-based coordination accountability assistant** that understands who promised what, reminds people about commitments, and learns simple processes - all without requiring external system integrations.

**The Key Insight:** Speech act detection + basic accountability = immediate value without MCP servers.

---

## Core Capabilities

### 1. Speech Act Detection (Foundation)
- Detect 5 types: REQUEST, COMMITMENT, QUESTION, DECLARATION, ASSERTION
- Store in DynamoDB with full context
- **Target accuracy: 85-90%**
- Uses Claude API (Haiku for cost efficiency)

### 2. Accountability Actions (New!)
- **Commitment reminders** - "Bob, you committed to review the PR by Friday (tomorrow)"
- **Deadline clarification** - "Bob, you said you'd review the PR - by when?"
- **Unanswered questions** - "Carol asked about API design 3 days ago but hasn't gotten an answer"
- **Stuck requests** - "Alice asked for a review 5 days ago but no one has committed"
- **Dependency tracking** - "Ted is waiting on your review, Bob"

### 3. Process Learning (Conversational)
- Users teach processes via email: "When someone commits to a review, remind after 2 days"
- Store processes in DynamoDB
- Execute automatically based on triggers
- Examples:
  - "Remind about commitments 1 day before deadline"
  - "Flag commitments without deadlines immediately"
  - "Send weekly summary of open commitments"

### 4. Natural Language Queries
- "What did Bob commit to?"
- "What questions are unanswered?"
- "Show me overdue commitments"
- "Who's waiting on Alice?"

### 5. Privacy Model
- Information scoped to email thread participants
- Explicit filtering with warnings when results are hidden
- Zero information leakage across thread boundaries

---

## What Phase 1 Does NOT Do

❌ Create tickets in external systems (no MCP servers yet)  
❌ Read ticket status from GitHub/Jira  
❌ Make decisions or recommendations  
❌ Multi-channel support (email only)  
❌ Complex reasoning ("why is this blocked?")

---

## Technical Stack

**Infrastructure:**
- AWS SAM (Infrastructure as Code)
- AWS Lambda (TypeScript/Node.js 18)
- AWS DynamoDB (single-table design with GSIs)
- AWS SES (email send/receive)
- AWS S3 (raw email storage)
- **AWS EventBridge** (NEW - for time-based triggers)
- Anthropic Claude API (Haiku - `claude-3-5-haiku-20241022`)

**Key Dependencies:**
- `@anthropic-ai/sdk` - Claude API client
- `@aws-sdk/client-dynamodb` - DynamoDB operations
- `@aws-sdk/client-ses` - Email sending
- `@aws-sdk/client-s3` - Email storage
- `mailparser` - Email parsing

**Build Tools:**
- TypeScript 5.x (strong typing)
- esbuild (fast bundling)
- Jest (testing)

---

## Architecture Changes from Original Design

### What Stays the Same
✅ Email Receiver Lambda (parses emails)  
✅ Speech Act Detector Lambda (detects speech acts via Claude API)  
✅ Query Handler Lambda (answers questions)  
✅ Email Response Lambda (sends replies)  
✅ DynamoDB single-table design (SPEECH_ACT, EMAIL_THREAD, PARTICIPANT_INDEX entities)  
✅ Privacy model (participant-based access control)

### What's New
🆕 **EventBridge Rules** - Time-based triggers for reminders  
🆕 **Reminder Executor Lambda** - Processes due reminders  
🆕 **Process Definition Storage** - DynamoDB entity type: PROCESS  
🆕 **Process Executor Lambda** - Executes user-defined processes  
🆕 **Reminder State Tracking** - Track what reminders have been sent

### Architecture Addition: Time-Based Reminders

```
EventBridge (every 15 minutes)
    ↓
Reminder Executor Lambda
    ↓
Query DynamoDB for:
  - Commitments approaching deadline
  - Commitments past deadline
  - Unanswered questions > X days
  - Requests without commitments > Y days
    ↓
Generate reminder emails
    ↓
Email Response Lambda → SES
```

---

## DynamoDB Schema Additions

### New Entity: PROCESS

**Primary Key:**
```
PK: "PROCESS#<process_id>"
SK: "METADATA"
```

**Attributes:**
```json
{
  "EntityType": "PROCESS",
  "ProcessId": "review-reminder",
  "Name": "Review Commitment Reminder",
  "Description": "Remind about review commitments after 2 days",
  "Trigger": {
    "type": "commitment.detected",
    "pattern": "review"
  },
  "Condition": {
    "type": "no_response",
    "duration": "2 days"
  },
  "Action": {
    "type": "send_reminder_email",
    "template": "review_reminder",
    "to": "committer"
  },
  "Enabled": true,
  "CreatedBy": "alice@example.com",
  "CreatedAt": "2025-11-05T10:00:00Z"
}
```

### New Entity: REMINDER

**Primary Key:**
```
PK: "REMINDER#<reminder_id>"
SK: "METADATA"
```

**Attributes:**
```json
{
  "EntityType": "REMINDER",
  "ReminderId": "rem_001",
  "Type": "commitment_deadline",
  "SpeechActId": "sa_20251027_001",
  "ScheduledFor": "2025-10-30T09:00:00Z",
  "SentAt": "2025-10-30T09:05:00Z",
  "Status": "sent|pending|cancelled",
  "GSI1PK": "SCHEDULED_REMINDERS",
  "GSI1SK": "2025-10-30T09:00:00Z"
}
```

### GSI Addition

**GSI3: Scheduled Reminders**
- Purpose: Efficiently query reminders due now
- PK: `GSI3PK = "SCHEDULED_REMINDERS"`
- SK: `GSI3SK = <timestamp>`

---

## Lambda Functions

### 1. Email Receiver Lambda (Existing - Enhanced)
**Changes:**
- Detect if email contains process learning instructions
- Route to Process Learner Lambda if detected

### 2. Speech Act Detector Lambda (Existing - No Changes)
- Already handles detection well
- Just store results; accountability happens elsewhere

### 3. Query Handler Lambda (Existing - Enhanced)
**New query types:**
- Overdue commitments
- Commitments without deadlines
- Unanswered questions
- Blocked requests

### 4. Email Response Lambda (Existing - No Changes)
- Formats and sends all types of emails (acks, queries, reminders)

### 5. Reminder Executor Lambda (NEW)
**Trigger:** EventBridge (every 15 minutes)

**Responsibilities:**
1. Query DynamoDB for pending reminders (GSI3)
2. Query for commitments approaching/past deadline
3. Query for unanswered questions > threshold
4. Query for requests without commitments > threshold
5. Generate reminder emails for each
6. Mark reminders as sent
7. Invoke Email Response Lambda

**Environment Variables:**
- `DYNAMODB_TABLE`
- `EMAIL_RESPONSE_FUNCTION`
- `REMINDER_THRESHOLDS` (JSON config)

### 6. Process Learner Lambda (NEW)
**Trigger:** Invoked by Email Receiver when process teaching detected

**Responsibilities:**
1. Parse natural language process description
2. Use Claude API to extract structured process definition
3. Validate process definition
4. Store in DynamoDB as PROCESS entity
5. Confirm understanding with user

**Example Interaction:**
```
User: "When someone commits to a review, remind after 2 days if no response"

Schrute: "Got it! I've created a process:
- Trigger: Commitment detected (containing 'review')
- Wait: 2 days
- Check: Has there been a response in the thread?
- Action: Send reminder to committer

Would you like me to enable this?"
```

### 7. Process Executor Lambda (NEW)
**Trigger:** EventBridge (every 30 minutes)

**Responsibilities:**
1. Query enabled processes
2. For each process, check if conditions are met
3. Execute actions (send email, create reminder, etc.)
4. Log execution history

---

## Key Implementation Details

### Speech Act Detection Prompt Strategy

**System Prompt:**
```
You are a speech act detector. Extract all coordination-related speech acts.

Types: REQUEST, COMMITMENT, QUESTION, DECLARATION, ASSERTION

For each, extract:
- Type
- Actor (who)
- Target (to whom, if applicable)
- Content (what)
- Deadline (when, if mentioned)

Return ONLY valid JSON array. No markdown, no explanation.
```

**Target Accuracy:** 85-90% (test with manual review of sample emails)

### Process Learning Prompt Strategy

**System Prompt:**
```
You are a process learning assistant. Convert natural language descriptions 
of coordination processes into structured JSON definitions.

Process structure:
{
  "trigger": { "type": "...", "pattern": "..." },
  "condition": { "type": "...", "duration": "..." },
  "action": { "type": "...", "template": "...", "to": "..." }
}

Common triggers:
- commitment.detected
- request.detected
- question.unanswered

Common conditions:
- no_response (duration)
- deadline_approaching (duration)
- missing_deadline

Common actions:
- send_reminder_email
- send_summary_email
- flag_for_attention

Return ONLY valid JSON. No markdown.
```

### Reminder Logic

**Commitment Deadline Reminder:**
```javascript
async function checkCommitmentDeadlines() {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  
  // Get commitments due in next 24 hours that haven't been reminded
  const commitments = await queryCommitmentsWithDeadlines(now, tomorrow)
  
  for (const commitment of commitments) {
    const alreadyReminded = await hasReminder(commitment.SpeechActId, 'deadline_approaching')
    if (!alreadyReminded) {
      await createReminder({
        type: 'commitment_deadline',
        speechActId: commitment.SpeechActId,
        message: `Reminder: You committed to "${commitment.Content}" by ${formatDate(commitment.Deadline)} (tomorrow)`
      })
    }
  }
}
```

**Unanswered Question Reminder:**
```javascript
async function checkUnansweredQuestions() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  
  // Get questions asked > 3 days ago
  const questions = await queryQuestions({ before: threeDaysAgo })
  
  for (const question of questions) {
    // Check if thread has any responses since question
    const hasResponse = await threadHasResponseSince(
      question.EmailThreadId, 
      question.Timestamp
    )
    
    if (!hasResponse) {
      const alreadyReminded = await hasReminder(question.SpeechActId, 'unanswered')
      if (!alreadyReminded) {
        await createReminder({
          type: 'unanswered_question',
          speechActId: question.SpeechActId,
          message: `Reminder: ${question.Actor} asked "${question.Content}" 3 days ago but hasn't received an answer`
        })
      }
    }
  }
}
```

### Privacy in Reminders

**Critical:** Reminders must respect thread privacy.

When sending a reminder:
1. Determine who was on original thread
2. Only send reminder to those participants
3. Do NOT expand to new people
4. If target has left project, handle gracefully

---

## Email Templates

### Commitment Reminder (Deadline Approaching)
```
Subject: Reminder: PR Review Due Tomorrow

Hi Bob,

Quick reminder that you committed to reviewing the authentication PR 
by tomorrow (Oct 31).

Let me know if you need more time!

Tom
```

### Commitment Reminder (Overdue)
```
Subject: Following up: PR Review

Hi Bob,

Just checking on the PR review you committed to by Oct 31 (yesterday). 

Is it still in progress, or do you need help?

Tom
```

### Unanswered Question Reminder
```
Subject: Re: API Design Question

Hi Carol,

Just flagging that your question about the API design from Oct 27 
hasn't gotten a response yet.

Would you like me to ping someone specific, or escalate?

Tom
```

### Process Learning Confirmation
```
Subject: Re: Process Setup

Hi Alice,

Got it! I've created a new process:

📋 Review Commitment Reminder
- When: Someone commits to a review
- Wait: 2 days with no response
- Then: Send reminder to committer

This process is now enabled. You can disable it anytime by saying 
"disable review reminders" or modify it by saying "change reminder 
delay to 3 days".

Tom
```

---

## Configuration & Personalization

**Email Settings:**
- Domain: `smykowski.work`
- From address: `tom@smykowski.work`
- From name: `Tom Smykowski` (first contact) or `Tom` (subsequent)
- Signature: Friendly but professional

**Personality:**
- Helpful and proactive
- Not pushy or nagging
- Acknowledges when uncertain
- Asks for clarification when needed
- Casual but competent tone

**Default Reminder Thresholds:**
```json
{
  "commitment_deadline_warning": "1 day",
  "commitment_overdue_followup": "1 day after deadline",
  "unanswered_question": "3 days",
  "request_without_commitment": "5 days",
  "missing_deadline_flag": "immediate"
}
```

---

## Testing Strategy

### Unit Tests (Jest)
- Speech act detection parsing
- Process definition parsing
- Reminder logic (due date calculations)
- Privacy filtering
- Email formatting

### Integration Tests
1. Send email with commitment → verify stored
2. Wait for deadline → verify reminder sent
3. Teach process → verify stored and executed
4. Query speech acts → verify privacy filtering
5. Multiple reminders → verify no duplicates

### Dogfooding
- Use Schrute to coordinate Schrute development
- Test for 2+ weeks before considering Phase 1 complete
- Iterate based on real usage pain points

---

## Success Criteria

Phase 1 is complete when:

✅ **Speech act detection works**
- 85-90% accuracy on test emails
- Handles multi-act emails correctly

✅ **Reminders work reliably**
- Deadline reminders sent 1 day before
- Overdue reminders sent 1 day after
- Unanswered question reminders sent after 3 days
- No duplicate reminders
- Respects privacy boundaries

✅ **Process learning works**
- Can teach simple processes conversationally
- Processes execute correctly
- Can list/modify/disable processes

✅ **Queries work**
- Answers all query types accurately (>90%)
- Privacy filtering works (zero violations)
- Helpful error messages

✅ **Dogfooding successful**
- Used for Schrute development for 2+ weeks
- Team finds it genuinely useful
- No major bugs or pain points

---

## Development Approach

### Week 1-2: Foundation
- Set up AWS SAM infrastructure
- Email receiver + parser
- Speech act detector (core capability)
- DynamoDB schema

### Week 3-4: Queries
- Query handler Lambda
- Privacy filtering
- Natural language query parsing

### Week 5-6: Reminders
- EventBridge setup
- Reminder executor Lambda
- Deadline/overdue logic
- Email templates

### Week 7-8: Process Learning
- Process learner Lambda
- Process executor Lambda
- Conversational process teaching
- Process management (list/disable/modify)

### Week 9-10: Integration & Testing
- End-to-end testing
- Privacy testing
- Accuracy validation
- Bug fixes

### Week 11-12: Dogfooding & Polish
- Use for Schrute development
- Iterate on UX
- Polish email templates
- Documentation

---

## Cost Estimates

**Monthly cost (100 emails + reminders):**
- DynamoDB: ~$2
- Lambda: ~$0.10
- S3: ~$0.05
- SES: Free (first 62,000 emails)
- EventBridge: ~$0.01
- Claude API (Haiku): ~$0.05
- **Total: ~$2.21/month**

**Scale to 1,000 emails/month:**
- DynamoDB: ~$20
- Lambda: ~$1
- Claude API: ~$0.50
- **Total: ~$21.50/month**

---

## What Comes After Phase 1

**Phase 2 adds:**
- MCP server integration (GitHub, Jira, etc.)
- Multi-turn conversations with context
- More sophisticated process execution
- Cross-system coordination

**Phase 3 adds:**
- Multi-channel support (Slack, SMS)
- Multiple MCP servers simultaneously
- Advanced personality configuration
- Production-ready framework

But Phase 1 should be **immediately useful** without any of that. The bar is: would you actually use this to coordinate your own project?

---

## Quick Reference: File Structure

```
schrute-phase1/
├── template.yaml                 # SAM infrastructure
├── src/
│   ├── lambdas/
│   │   ├── email-receiver/
│   │   ├── speech-act-detector/
│   │   ├── query-handler/
│   │   ├── email-response/
│   │   ├── reminder-executor/      # NEW
│   │   ├── process-learner/        # NEW
│   │   └── process-executor/       # NEW
│   └── shared/
│       ├── types/
│       ├── dynamodb/
│       └── utils/
├── tests/
└── docs/
```

---

## Getting Started

1. **Review existing code** in the repo (email receiver/sender already exist)
2. **Start with speech act detector** - this is the foundation
3. **Test detection accuracy** before building on top
4. **Add queries** next (simpler than reminders)
5. **Then add reminders** (EventBridge + time-based logic)
6. **Finally add process learning** (most complex)

The existing code gives you email handling infrastructure. You're adding:
1. Claude API integration for speech act detection
2. DynamoDB storage and querying
3. Time-based reminder logic
4. Process learning and execution

---

**Document End**

This implementation guide should be enough for Claude Code to understand what to build without being overwhelmed by specifications. Start with the core (speech act detection) and build up incrementally.
