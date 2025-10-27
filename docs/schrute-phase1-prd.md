# Schrute Phase 1: Product Requirements Document

**Project:** Schrute - AI Coordination Assistant Framework  
**Phase:** Phase 1 (Email-Only Baseline - Observation & Query)  
**Version:** 1.0  
**Date:** October 27, 2025  
**Product Manager:** PM Agent  
**Status:** Draft for Review

---

## Executive Summary

Schrute Phase 1 delivers an **observation-only email-based coordination assistant** that proves the core hypothesis: modern LLMs can automatically detect speech acts from natural language communication, solving the friction problem that killed Winograd & Flores' original Coordinator system (1986).

**What Phase 1 Delivers:**
- Email-based natural language interface (via AWS SES)
- Automatic speech act detection and classification
- Persistent storage of coordination semantics (DynamoDB)
- Natural language queries about detected speech acts
- Privacy-respecting information access (hybrid partial results model)

**What Phase 1 Does NOT Deliver:**
- No automated actions (no reminders, notifications, task creation)
- No MCP server integrations
- No multi-channel support (email only)
- No process execution or commitment tracking automation

**Phase 1 Value Proposition:**
Users get a searchable memory of who said what, when, with clear accountability tracking and privacy-respecting information access - providing immediate coordination value without action-taking complexity.

---

## Goals and Non-Goals

### Goals

**Primary Goal:**
Prove that LLM-based speech act detection works reliably enough (85-90% accuracy) to serve as the foundation for an AI coordination assistant.

**Secondary Goals:**
1. Establish DynamoDB data model for speech acts and email threads
2. Validate privacy model (hybrid partial results approach)
3. Demonstrate natural language query capabilities
4. Create foundation for Phase 2 action-taking capabilities
5. Enable dogfooding for Schrute's own development

### Non-Goals (Explicitly Out of Scope)

- ❌ Automated reminders or notifications
- ❌ MCP server integration
- ❌ Multi-channel support (Slack, SMS, etc.)
- ❌ Process definitions or execution
- ❌ Commitment tracking automation
- ❌ Task creation in external systems
- ❌ Reasoning/inference queries ("Why did X happen?", "What's blocking Y?")
- ❌ Decision-making or recommendations ("Should we do X?")

---

## Success Metrics

### Phase 1 "Done" Criteria

Phase 1 is complete when ALL of the following are true:

1. **Speech Act Detection Quality**
   - Can detect all 5 major speech act types (requests, commitments, questions, declarations, assertions)
   - Achieves 85-90% accuracy on representative email samples
   - Properly handles multi-speech-act emails (single email with multiple types)

2. **Data Persistence**
   - Stores speech acts in DynamoDB with proper threading
   - Maintains email thread relationships and participant lists
   - Enables retrieval by conversation, participant, time range, speech act type

3. **Query Capabilities**
   - Accurately answers 10+ different natural language query types
   - Handles temporal queries (last week, overdue, upcoming)
   - Handles relationship queries (who's waiting on whom)
   - Handles aggregation queries (summarize decisions)

4. **Privacy Model**
   - Respects participant boundaries (hybrid partial results model)
   - Explicitly communicates when results are filtered
   - Never leaks information to unauthorized participants

### Key Performance Indicators

- **Speech Act Detection Accuracy:** 85-90%
- **Query Response Accuracy:** >90% for in-scope query types
- **Privacy Violations:** 0 (absolute requirement)
- **Dogfooding Success:** Successfully used for Schrute coordination for 2+ weeks

---

## User Personas

### Primary Persona: Technical Team Lead
- **Name:** Jordan (Project Coordinator)
- **Role:** Manages small development team, tracks commitments and blockers
- **Pain Points:** 
  - Forgets who committed to what
  - Loses track of unanswered questions
  - Can't remember what was decided in email threads
- **Phase 1 Value:** Searchable memory of all coordination communications

### Secondary Persona: Open Source Maintainer
- **Name:** Sam (OSS Coordinator)
- **Role:** Coordinates volunteer contributors across time zones
- **Pain Points:**
  - Contributors forget commitments
  - Lost context from old email threads
  - Can't track who's waiting on reviews
- **Phase 1 Value:** Accountability tracking without manual effort

---

## User Stories

### Epic 1: Email Processing and Speech Act Detection

**US-1.1: As a user, I want to send emails to Schrute so it can observe my team's coordination**
- **Acceptance Criteria:**
  - Schrute has a dedicated email address (e.g., dwight@schrute.work)
  - Emails sent to Schrute are received via AWS SES
  - Schrute acknowledges receipt within 30 seconds
  - Schrute processes emails asynchronously

**US-1.2: As a user, I want Schrute to detect requests in my emails**
- **Acceptance Criteria:**
  - Detects direct requests ("Can you review the PR?")
  - Detects indirect requests ("We need someone to review the PR")
  - Captures requestor, requestee, requested action, and deadline (if mentioned)
  - Achieves 85-90% accuracy on request detection

**US-1.3: As a user, I want Schrute to detect commitments in my emails**
- **Acceptance Criteria:**
  - Detects explicit commitments ("I'll review it by Friday")
  - Detects implicit commitments ("Sure, I can do that")
  - Captures committer, commitment, and deadline (if mentioned)
  - Achieves 85-90% accuracy on commitment detection

**US-1.4: As a user, I want Schrute to detect questions in my emails**
- **Acceptance Criteria:**
  - Detects direct questions ("What's the status?")
  - Detects rhetorical vs. genuine questions
  - Captures asker and question content
  - Achieves 85-90% accuracy on question detection

**US-1.5: As a user, I want Schrute to detect declarations in my emails**
- **Acceptance Criteria:**
  - Detects decisions ("We're going with Option A")
  - Detects status changes ("The PR is merged")
  - Captures declarer and declaration content
  - Achieves 85-90% accuracy on declaration detection

**US-1.6: As a user, I want Schrute to detect assertions in my emails**
- **Acceptance Criteria:**
  - Detects factual statements ("The API is down")
  - Distinguishes from opinions or questions
  - Captures asserter and assertion content
  - Achieves 85-90% accuracy on assertion detection

**US-1.7: As a user, I want Schrute to handle emails with multiple speech acts**
- **Acceptance Criteria:**
  - Single email can contain multiple speech acts
  - Each speech act is stored separately
  - All speech acts maintain reference to parent email
  - Email thread structure is preserved

### Epic 2: Natural Language Queries

**US-2.1: As a user, I want to ask Schrute what someone committed to**
- **Acceptance Criteria:**
  - Query: "What did Bob commit to?"
  - Returns all commitments by Bob visible to query participants
  - Includes commitment content and deadline (if any)
  - Applies hybrid privacy filtering

**US-2.2: As a user, I want to ask Schrute who made a request**
- **Acceptance Criteria:**
  - Query: "Who asked for the API review?"
  - Returns requestor and request details
  - Applies hybrid privacy filtering

**US-2.3: As a user, I want to ask Schrute about deadlines**
- **Acceptance Criteria:**
  - Query: "When is the PR review due?"
  - Returns deadline and associated commitment/request
  - Handles fuzzy matching on task descriptions
  - Applies hybrid privacy filtering

**US-2.4: As a user, I want to ask Schrute about unanswered questions**
- **Acceptance Criteria:**
  - Query: "What questions are unanswered?"
  - Returns questions with no detected answers in thread
  - Applies hybrid privacy filtering

**US-2.5: As a user, I want to ask Schrute about recent activity**
- **Acceptance Criteria:**
  - Query: "Show me all requests from last week"
  - Handles temporal queries (last week, yesterday, this month)
  - Returns chronologically ordered results
  - Applies hybrid privacy filtering

**US-2.6: As a user, I want to ask Schrute about overdue commitments**
- **Acceptance Criteria:**
  - Query: "What commitments are overdue?"
  - Compares commitment deadlines to current date
  - Returns overdue commitments with details
  - Applies hybrid privacy filtering

**US-2.7: As a user, I want to ask Schrute about dependencies**
- **Acceptance Criteria:**
  - Query: "Who's waiting on Bob?"
  - Identifies requests directed at Bob with no completion
  - Returns list of people waiting
  - Applies hybrid privacy filtering

**US-2.8: As a user, I want to ask Schrute to summarize decisions**
- **Acceptance Criteria:**
  - Query: "Summarize this week's decisions"
  - Aggregates declaration-type speech acts
  - Groups by topic/theme
  - Applies hybrid privacy filtering

### Epic 3: Privacy and Access Control

**US-3.1: As a user, I want my information to remain private to participants**
- **Acceptance Criteria:**
  - Information only visible to participants in original email thread
  - Queries from non-participants receive filtered results
  - No information leakage across thread boundaries

**US-3.2: As a user, I want transparency when results are filtered**
- **Acceptance Criteria:**
  - When some results are filtered, Schrute explicitly says so
  - Warning includes: "⚠️ Note: Some results filtered because [person] wasn't on all relevant email threads"
  - Suggests how to get complete results
  - Maintains trust through transparency

**US-3.3: As a user, I want to understand who can see what**
- **Acceptance Criteria:**
  - Schrute can explain privacy boundaries when asked
  - Can list who was on original thread (without revealing content)
  - Clear documentation of privacy model

### Epic 4: System Reliability

**US-4.1: As a user, I want Schrute to acknowledge receipt of emails**
- **Acceptance Criteria:**
  - Reply within 30 seconds of email receipt
  - Acknowledgment includes what Schrute understood
  - Lists detected speech acts for user validation
  - Uses configured personality/signature

**US-4.2: As a user, I want Schrute to handle errors gracefully**
- **Acceptance Criteria:**
  - If speech act detection uncertain, Schrute asks for clarification
  - If query is ambiguous, Schrute asks clarifying questions
  - No silent failures
  - All errors logged to CloudWatch

**US-4.3: As a user, I want Schrute to maintain conversation context**
- **Acceptance Criteria:**
  - Multi-turn queries in same email thread maintain context
  - Schrute remembers prior questions in thread
  - Follow-up questions work naturally ("What about Carol?")

---

## Speech Act Framework

### Speech Act Types (Phase 1)

Schrute detects and stores five primary speech act types:

#### 1. REQUEST
**Definition:** An ask for someone to take action or provide information

**Examples:**
- "Can you review the PR by Friday?"
- "We need someone to write the documentation"
- "Please update the ticket when you're done"

**Attributes:**
- `requestor`: Who is asking
- `requestee`: Who is being asked (may be implicit/unspecified)
- `action`: What is being requested
- `deadline`: When it's needed (optional)
- `context`: Thread and surrounding discussion

#### 2. COMMITMENT
**Definition:** A promise or agreement to take action

**Examples:**
- "I'll review it by Friday"
- "Sure, I can handle that"
- "Yes"

**Attributes:**
- `committer`: Who is committing
- `action`: What they're committing to
- `deadline`: When they'll complete it (optional)
- `related_request`: Link to request if this is a response
- `context`: Thread and surrounding discussion

#### 3. QUESTION
**Definition:** A request for information (not action)

**Examples:**
- "What's the status of the API redesign?"
- "When is the deadline?"
- "Why did we choose Option A?"

**Attributes:**
- `asker`: Who is asking
- `question_content`: The actual question
- `answered`: Boolean (is there a reply in thread)
- `context`: Thread and surrounding discussion

#### 4. DECLARATION
**Definition:** A statement of decision, status, or fact with authority

**Examples:**
- "We're going with Option A"
- "The PR is merged"
- "This epic is complete"

**Attributes:**
- `declarer`: Who is making the declaration
- `declaration_content`: What is being declared
- `declaration_type`: decision | status_change | fact
- `context`: Thread and surrounding discussion

#### 5. ASSERTION
**Definition:** A factual statement or observation

**Examples:**
- "The API is down"
- "We have three open tickets"
- "The build failed last night"

**Attributes:**
- `asserter`: Who is making the assertion
- `assertion_content`: The fact being asserted
- `context`: Thread and surrounding discussion

---

## Natural Language Query Scope

### In-Scope Query Types (Phase 1)

#### Basic Retrieval Queries
- "What did [person] commit to?"
- "Who asked for [thing]?"
- "When is [thing] due?"
- "What questions are unanswered?"
- "What decisions were made?"

#### Temporal Queries
- "Show me all requests from last week"
- "What commitments are due this week?"
- "What commitments are overdue?"
- "What happened yesterday?"

#### Relationship Queries
- "Who's waiting on [person]?"
- "What requests are directed at [person]?"
- "Who committed to [thing]?"

#### Aggregation Queries
- "Summarize this week's decisions"
- "List all open requests"
- "Show me all of [person]'s commitments"

### Out-of-Scope Query Types (Phase 1)

#### Reasoning/Inference Queries (Require Judgment)
- "Why did [person] miss the deadline?"
- "What's blocking the release?"
- "Is this project on track?"

#### Decision/Recommendation Queries
- "Should we reassign this to [person]?"
- "Who should handle this request?"
- "What should we do about [problem]?"

#### Action-Requiring Queries
- "Remind [person] about [commitment]"
- "Create a ticket for [thing]"
- "Send an email to [person]"

---

## Privacy Model: Hybrid Partial Results

### Core Principle
**Information is scoped to email thread participants.** You can only see speech acts from email threads where you were a participant.

### Hybrid Approach: Explicit Partial Results

When a query would return results from threads with different participant sets:

1. **Return visible results** (those where all query participants were on original thread)
2. **Explicitly communicate filtering** with warning message
3. **Suggest how to get complete results**

### Example Scenario

**Email Thread 1:** Alice, Bob, Carol
- Bob commits to "review PR by Friday"

**Email Thread 2:** Alice, Bob, Ted
- Bob commits to "update docs by Monday"

**Query Email:** To Alice, Bob, Carol, Ted, Horst
- Question: "What did Bob commit to?"

**Schrute Response:**
```
Bob committed to:
1. Review PR by Friday (from Oct 23 thread)

⚠️ Note: Some results filtered because Carol, Ted, and Horst weren't 
on all relevant email threads. For complete results, ask in a thread 
with the original participants (Alice, Bob).
```

### Edge Cases

**Case 1: No visible results**
```
Query: "What did Bob commit to?"
Response: "I don't see any commitments from Bob in threads visible 
to all participants on this email.

⚠️ Note: There may be commitments in other threads. For complete 
results, ask in threads with the original participants."
```

**Case 2: User asks about privacy**
```
Query: "Why can't I see Bob's other commitments?"
Response: "Bob made commitments in other email threads where not 
everyone on this email was a participant. I respect thread privacy 
and only show information visible to everyone on this email.

The other commitments were in threads with: [list participants without 
revealing content]."
```

**Case 3: Follow-up questions in same thread**
```
Original query participants: Alice, Bob, Carol
Follow-up query: "What about Ted's commitments?"
Response: Uses same participant set (Alice, Bob, Carol) for filtering.
```

---

## Technical Requirements

### Infrastructure

**Email Processing:**
- AWS SES for receiving emails (configured domain: schrute.work)
- AWS SES for sending email replies
- Lambda function for email receipt processing
- Lambda function for email response sending

**Speech Act Detection:**
- Lambda function for LLM-based speech act detection
- Anthropic Claude API integration (Sonnet 4 or better)
- Prompt engineering for 85-90% accuracy
- Batch processing for multi-act emails

**Storage:**
- DynamoDB for speech acts storage
- DynamoDB for email thread metadata
- DynamoDB for participant tracking
- Schema design by Architect (next phase)

**Query Handling:**
- Lambda function for natural language query processing
- Claude API integration for query understanding
- Query routing to appropriate DynamoDB queries
- Result aggregation and formatting

**Monitoring:**
- CloudWatch Logs for all Lambda functions
- CloudWatch Metrics for speech act detection accuracy
- Error alerting for processing failures

### Integration Points

**AWS SES:**
- Receipt rules configured to trigger Lambda
- S3 bucket for raw email storage (optional backup)
- Verified domain (schrute.work)

**Anthropic Claude API:**
- API key management via AWS Secrets Manager
- Rate limiting and error handling
- Cost tracking and budgeting

**DynamoDB:**
- Table design TBD by Architect
- Indexes for efficient querying
- Backup and recovery strategy

### Configuration Requirements

**Personality Configuration:**
- Name: "Dwight Schrute" (for Schrute project itself)
- Email signature: "Dwight Schrute" for new contacts, "Dwight" for replies
- Voice/tone: Helpful, professional, casual-but-competent
- Configurable per deployment

**Email Configuration:**
- Domain: schrute.work (registered)
- Address: dwight@schrute.work (suggested for this project)
- From name: "Dwight Schrute"
- Reply-to: Same as from address

---

## User Experience Requirements

### Email Acknowledgment Format

When Schrute receives an email, it should acknowledge receipt and summarize what it understood:

```
Subject: Re: [original subject]

Hi [sender name],

Got it! Here's what I understood from your email:

📋 Detected:
• Request from Alice to Bob: "Review the PR by Friday"
• Commitment from Bob: "I'll get it done"

I'm tracking these in my memory. Let me know if I misunderstood anything!

Dwight Schrute
```

### Query Response Format

When answering a query:

```
Subject: Re: [query subject]

Hi [sender name],

Bob committed to:
1. Review the PR by Friday (Oct 23 thread with Alice, Bob, Carol)
2. Update documentation by Monday (Oct 24 thread with Alice, Bob, Ted)

⚠️ Note: Some results filtered because Horst wasn't on all relevant 
email threads. For complete results, ask in a thread with the 
original participants.

Dwight
```

### Error Handling UX

When uncertain about speech act detection:

```
Subject: Re: [original subject]

Hi [sender name],

I processed your email, but I'm not entirely sure about one thing:

When you said "We should probably get that done soon", did you mean:
a) You're requesting someone to do it, or
b) Just making an observation?

Let me know so I can track it correctly!

Dwight
```

---

## Acceptance Criteria Summary

Phase 1 is **COMPLETE** when:

✅ **Speech Act Detection:**
- [ ] Detects requests, commitments, questions, declarations, assertions
- [ ] Achieves 85-90% accuracy on test email samples
- [ ] Handles multi-speech-act emails correctly
- [ ] Stores all speech acts in DynamoDB with proper threading

✅ **Natural Language Queries:**
- [ ] Answers 10+ query types accurately (>90% accuracy)
- [ ] Handles temporal queries (last week, overdue, etc.)
- [ ] Handles relationship queries (who's waiting on whom)
- [ ] Handles aggregation queries (summarize decisions)

✅ **Privacy Model:**
- [ ] Respects participant boundaries (hybrid partial results)
- [ ] Explicitly communicates when results are filtered
- [ ] Zero privacy violations
- [ ] Clear documentation of privacy model

✅ **System Reliability:**
- [ ] Acknowledges email receipt within 30 seconds
- [ ] Handles errors gracefully (no silent failures)
- [ ] Maintains conversation context across email thread
- [ ] All errors logged to CloudWatch

✅ **Dogfooding:**
- [ ] Successfully used for Schrute's own development coordination
- [ ] Used for 2+ weeks without major issues
- [ ] Team members find it useful

---

## Open Questions for Architect

These questions need to be addressed in the Architecture document:

1. **DynamoDB Schema Design:**
   - Table structure for speech acts
   - Indexes for efficient querying
   - How to model email threads and participants
   - Storage cost estimates

2. **Speech Act Detection Approach:**
   - Prompt engineering strategy for 85-90% accuracy
   - How to handle ambiguous cases
   - Batch processing vs streaming
   - Error handling and retries

3. **Query Understanding:**
   - How to parse natural language queries
   - Mapping queries to DynamoDB queries
   - Handling fuzzy matching and synonyms
   - Performance targets (query response time)

4. **Privacy Implementation:**
   - How to efficiently check participant boundaries
   - Query optimization for filtered results
   - Caching strategy (if any)

5. **Scalability:**
   - Expected email volume
   - Query volume estimates
   - Cost projections
   - Performance targets

---

## Dependencies and Risks

### Dependencies

**External:**
- AWS SES domain verification (schrute.work)
- AWS account with necessary permissions
- Anthropic Claude API access and funding
- Email clients that support standard SMTP

**Internal:**
- Architect to design DynamoDB schema
- Architect to design Lambda architecture
- Developer to implement speech act detection
- Developer to implement query handling

### Risks

**Technical Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Speech act detection accuracy <85% | High | Medium | Iterative prompt engineering, test dataset |
| Query understanding poor | Medium | Low | Use Claude's strong natural language understanding |
| DynamoDB cost higher than expected | Medium | Low | Monitor usage, optimize indexes |
| Privacy model too restrictive | Low | Medium | Validate with dogfooding |

**Process Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Scope creep (adding actions) | High | High | Strict adherence to Phase 1 scope |
| Dogfooding adoption low | Medium | Medium | Lead by example, make it useful |
| Unclear success criteria | Low | Low | This PRD defines clear acceptance criteria |

---

## Success Metrics Tracking

### How We'll Measure Success

**Weekly tracking during Phase 1 development:**

1. **Speech Act Detection Accuracy**
   - Manual review of 20 random emails per week
   - Calculate precision/recall for each speech act type
   - Target: 85-90% overall accuracy

2. **Query Accuracy**
   - Test suite of 50+ queries with known correct answers
   - Weekly execution and accuracy tracking
   - Target: >90% correct responses

3. **Privacy Violations**
   - Code review for privacy boundaries
   - Manual testing of edge cases
   - Target: Zero violations

4. **Dogfooding Usage**
   - Number of emails processed per week
   - Number of queries asked per week
   - User satisfaction (informal feedback)
   - Target: Regular use by team

---

## Timeline Estimate

**Phase 1 Development Timeline:**

- **Week 1-2:** Architecture design (DynamoDB schema, Lambda architecture)
- **Week 3-4:** Email processing and speech act detection implementation
- **Week 5-6:** Query handling implementation
- **Week 7-8:** Privacy model implementation and testing
- **Week 9-10:** Integration testing and bug fixes
- **Week 11-12:** Dogfooding and iteration

**Total: ~12 weeks to Phase 1 completion**

*Note: This is an estimate. Actual timeline depends on developer availability and complexity discoveries during implementation.*

---

## Appendix A: Example Email Threads

### Example 1: Simple Request and Commitment

```
From: Alice <alice@example.com>
To: Bob <bob@example.com>
Subject: PR Review Needed

Hi Bob,

Can you review the authentication PR by Friday? We need it for the demo.

Thanks,
Alice
```

```
From: Bob <bob@example.com>
To: Alice <alice@example.com>
Subject: Re: PR Review Needed

Sure, I'll get it done by Thursday.

Bob
```

**Expected Detection:**
- Request: Alice → Bob, "review authentication PR", deadline: Friday
- Commitment: Bob → Alice, "get it done", deadline: Thursday

### Example 2: Multi-Speech-Act Email

```
From: Carol <carol@example.com>
To: Ted <ted@example.com>, Horst <horst@example.com>
Subject: API Status Update

Hi team,

Quick update:

The API is deployed to staging (assertion). Horst, can you test it today? 
(request). Ted committed to reviewing the docs by EOD (declaration).

I think we're on track for launch (assertion).

Carol
```

**Expected Detection:**
- Assertion: Carol, "API is deployed to staging"
- Request: Carol → Horst, "test it today", deadline: today
- Declaration: Carol, "Ted committed to reviewing docs by EOD"
- Assertion: Carol, "we're on track for launch"

### Example 3: Privacy Filtering Scenario

**Thread 1:** Alice, Bob
```
Bob commits to "review security audit by Monday"
```

**Thread 2:** Alice, Bob, Carol
```
Query from Carol: "What did Bob commit to?"
```

**Expected Response:**
```
I don't see any commitments from Bob in threads visible to all 
participants on this email.

⚠️ Note: There may be commitments in other threads. For complete 
results, ask in threads with the original participants.
```

---

## Appendix B: Glossary

**Speech Act:** A communicative action that performs a social function (request, commitment, question, declaration, assertion)

**Thread:** An email conversation, identified by subject line and reply chain

**Participant:** A person included on an email (To, CC, BCC)

**Privacy Boundary:** The scope of information visible to a set of participants

**Hybrid Partial Results:** Privacy model that returns visible results while explicitly communicating filtering

**Dogfooding:** Using the product internally to validate its usefulness

**Phase 1:** Observation-only baseline with speech act detection and querying

**Phase 2:** Action-taking capabilities (reminders, notifications, process execution)

---

## Document Status

**Status:** Ready for Architect Review  
**Next Step:** Transform to Architect Agent (*agent architect) for architecture design  
**Action Items:**
1. Review and approve this PRD
2. Clarify any open questions
3. Pass to Architect for technical design

---

**Document End**
