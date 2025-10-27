# Schrute Phase 1: Requirements Analysis

**Project:** Schrute - AI Coordination Assistant Framework  
**Phase:** Phase 1 (Email-Only Baseline)  
**Document Version:** 1.0  
**Date:** October 27, 2025  
**Analyst:** Business Analyst Agent  

---

## Executive Summary

Schrute is a greenfield open-source framework for building AI coordination assistants that handle mundane teamwork tasks. The project takes an exploratory, opportunistic approach - learning what works through incremental development rather than rigid upfront requirements.

**Phase 1 Goal:** Prove speech act detection works reliably with an observation-only system - detect all speech acts in email threads and answer natural language questions about them.

**Key Innovation:** Using LLMs to automatically infer speech acts from natural language, solving the friction problem that killed Winograd & Flores' original Coordinator system (1986).

**Phase 1 Deliberate Limitation:** No action-taking, no MCP servers, no reminders - purely observational. This proves the core hypothesis (LLM-based speech act detection) before adding complexity.

---

## Project Context

### Origin Story
The project evolved from exploring AIA (architecture/construction) coordination processes → Computer Supported Cooperative Work (CSCW) research → Winograd & Flores' speech act theory → realization that modern LLMs can solve the original Coordinator system's fatal flaw.

### Core Philosophy: The "Micro-Intern"

Schrute-based agents are like eager but literal interns:
- ✅ Follow explicit instructions reliably
- ✅ Never forget what you told them  
- ✅ Work 24/7 without complaining
- ✅ Handle repetitive tasks without error
- ❌ No independent judgment or "common sense"
- ❌ Need very clear, mechanical directions
- ❌ Won't "read between the lines"

**Not an expert, not a decision-maker** - just a reliable coordination helper.

### Project Constraints (Non-Negotiable)

1. **No UI** - Communicate as you would with a remote teammate
2. **Natural communication** - Email threads, standard tools (when configured with MCP servers)
3. **Speech acts** - Foundation for recognizing actionable utterances
4. **Privacy-first** - Don't share info with people who didn't see it originally
5. **Configurable personality** - Name, voice, email address
6. **Minimize context** - Document decisions, use tools naturally
7. **Human-in-loop** - Natural review via email threads
8. **Assistant/intern mindset** - No major decisions, no expertise claims

---

## Phase 1 Scope

### What Phase 1 Delivers

**Minimal Viable Schrute** - Observation and Query Only:
1. Email handling (AWS SES → Lambda → processing → response)
2. Speech act detection (all types: requests, commitments, questions, declarations, assertions)
3. Speech act storage in DynamoDB
4. Natural language queries about detected speech acts
5. Privacy-respecting question answering

**What Phase 1 Does NOT Include:**
- ❌ No MCP servers
- ❌ No Dynamic Skills capability
- ❌ No S3 storage
- ❌ No action-taking (no reminders, no notifications, no task creation)
- ❌ No commitment tracking beyond storage
- ❌ No process execution

**Phase 1 is purely observational** - it watches email conversations, understands what speech acts occurred, and can answer questions about them. That's it.

### Example Phase 1 Workflow

```
Email Thread:
Alice: "Bob, can you review the PR by Friday?"
Bob: "Yes, I'll get it done."

[Schrute detects and stores speech acts:
 - Request from Alice to Bob: "review the PR by Friday"
 - Commitment from Bob: "I'll get it done"]

Later, user asks Schrute: "What did Bob commit to?"

Schrute replies: "Bob committed to review the PR by Friday 
(mentioned in email thread with Alice on Oct 23)."

[Note: No reminder is sent on Friday - Phase 1 doesn't take actions]
```

**Phase 1 Value Proposition:**
- Searchable memory of who said what
- Clear accountability tracking
- Privacy-respecting information access
- Foundation for action-taking in Phase 2

---

## Requirements Discovery

### Confirmed Core Capabilities (Phase 1)

1. **Email parsing and speech act detection** - All types detected and classified
2. **Speech act storage** - Persistent record in DynamoDB
3. **Natural language querying** - Ask questions about what happened
4. **Participant-based access control** - Privacy rules for who can query what

**Not in Phase 1:**
- Commitment tracking (action/reminder layer)
- Process execution
- MCP server integration
- Dynamic skills
- Any automated actions

### Speech Act Framework

Always detecting and tracking (inspired by Winograd & Flores):
- **Requests**: Who asked for what, when
- **Commitments**: Who promised what, by when  
- **Questions**: What information is needed
- **Declarations**: What decisions were made
- **Assertions**: What facts were stated

*Phase 1 detects and stores these, but takes no automated actions based on them. That's for Phase 2.*

---

## Open Questions & Unknowns

### Critical Clarifications Needed

1. **Speech Act Detection**
   - What's the accuracy threshold?
   - How do we measure it?
   - What's the test dataset?
   - Prompting strategy?

2. **DynamoDB Schema**
   - Speech acts storage structure?
   - Email thread tracking?
   - Participant/privacy tracking?
   - Conversation context management?

3. **Privacy Model**
   - Exact rules for information boundaries?
   - Per-email-thread? Per-person? Configurable?
   - How does Schrute determine who can ask what?

4. **Natural Language Query Handling**
   - How sophisticated should query understanding be?
   - What types of questions should Phase 1 answer?
   - How to handle ambiguous queries?

5. **Phase 1 Success Criteria**
   - When do we know Phase 1 is "done"?
   - What observable behaviors must work?
   - What edge cases need handling?

---

## Technical Architecture (High-Level)

### Infrastructure Stack

- **Cloud**: AWS
- **Email**: SES (send/receive)
- **Compute**: Lambda functions
- **Storage**: DynamoDB (speech acts, email threads, participant data)
- **LLM**: Anthropic Claude API
- **IaC**: AWS SAM (Serverless Application Model)
- **Language**: TypeScript/Node.js

**Not Needed in Phase 1:**
- S3 (no file storage needs)
- EventBridge (no time-based triggers)
- MCP servers (no action layer)

### Architecture Pattern

**Stateless by design:**
1. Read current state from storage
2. Process incoming communication
3. Update storage/tools
4. Forget everything

Memory lives in structured data, not LLM context.

### Current Implementation Status

Looking at uploaded files:
- ✅ Email receiver Lambda skeleton exists
- ✅ Email sender Lambda skeleton exists
- ✅ SAM template structure in place
- ✅ TypeScript configuration
- ⚠️ Speech act detection - not yet implemented
- ⚠️ DynamoDB tables - not yet defined (need speech acts table design)
- ⚠️ Query handling Lambda - not yet implemented
- ⚠️ Privacy/access control logic - not yet designed

---

## User Experience Requirements

### Natural Communication Patterns

Users interact via email as if Schrute is a remote teammate:
- No special syntax required
- No structured commands
- Casual or formal language both work
- Multi-turn conversations supported

### Email Address Configuration

- Domain: smykowski.work (registered)
- Suggested: tom@smykowski.work (for Smykowski project itself)
- Configurable per deployment
- Signature: "Tom Smykowski" for new contacts, "Tom" for subsequent replies

### Personality Configuration

- Name: Configurable (e.g., "Tom Smykowski" for project coordination)
- Voice/tone: Configurable
- Signature style: Configurable
- Communication formality: Configurable

---

## Success Metrics & Validation

### Phase 1 Must-Have Behaviors

1. Receive emails via SES
2. Detect all major speech act types in email content
3. Store speech acts in DynamoDB with proper threading
4. Answer natural language questions about detected speech acts
5. Respect privacy boundaries (don't share info across thread boundaries)
6. Handle multi-turn query conversations

**Phase 1 Does NOT:**
- Send reminders
- Create tasks
- Take any automated actions
- Execute processes
- Integrate with external tools

### Validation Approach

Given exploratory nature: "See what works" rather than rigid pass/fail tests.

**Suggested approach:**
- Start dogfooding immediately
- Use Schrute to coordinate Schrute development
- Iterate based on what's painful/useful
- Document learnings for Phase 2

---

## Dependencies & Integration Points

### External Services
- AWS SES (email send/receive)
- AWS Lambda (compute)
- AWS DynamoDB (storage)
- Anthropic Claude API (LLM for speech act detection and query handling)

**Not Needed in Phase 1:**
- AWS S3 (no file storage)
- AWS EventBridge (no time-based triggers)
- MCP Protocol (no tool integrations)

---

## Risks & Mitigations

### Technical Risks

1. **MCP Maturity** - Very new protocol, limited tooling
   - Mitigation: Start simple, build own test servers

2. **LLM Reliability** - May guess instead of asking for clarification
   - Mitigation: Explicit prompting, validation loops, structured workflows

3. **Speech Act Accuracy** - Core assumption might not work well enough
   - Mitigation: Phase 1 tests this fundamental hypothesis

4. **Integration Complexity** - Email, MCP, storage, LLM coordination
   - Mitigation: Incremental integration, extensive logging

### Process Risks

1. **Scope Creep** - Easy to add features and lose focus
   - Mitigation: Strict phase boundaries, dogfooding forces focus

2. **Analysis Paralysis** - Exploratory projects can stall
   - Mitigation: "Good enough" documentation, bias toward action

3. **Unclear Success** - Without rigid requirements, when is it "done"?
   - Mitigation: Define observable behaviors even if not SMART metrics

---

## Recommended Next Steps

### For PM Agent

1. **Clarify open questions** (see Open Questions section)
2. **Define Phase 1 PRD** with:
   - Speech act detection specifications
   - Natural language query capabilities
   - Privacy rules specification
   - DynamoDB schema requirements for speech acts and threads
   - Example query scenarios (step-by-step interactions)
   - Acceptance criteria for observation-only system
3. **Define what makes Phase 1 "done"** - observable, testable criteria

### For Architect Agent (after PM)

1. Design DynamoDB schema for speech acts and email threads
2. Specify speech act detection prompting approach
3. Design natural language query handling system
4. Map Lambda functions and data flows
5. Design privacy/access control system
6. Plan for stateless operation (read state, process, respond, forget)

---

## Reference Materials

- **Main Documentation**: /mnt/project/claude.md
- **Previous Discussions**: 
  - "Project review and documentation" (Dynamic Skills design)
  - "Summary of other chat" (Original Smykowski concept)
- **GitHub Repo**: (to be determined)
- **Domain**: smykowski.work

---

## Appendix: Key Insights from Analysis

### The Winograd & Flores Connection

Original Coordinator system (1986) failed because it required users to explicitly categorize messages into speech act types (REQUEST, PROMISE, INFORM, etc.). This created friction and adoption failure.

**Modern solution:** LLMs can infer speech acts from natural language automatically - solving the UX problem that killed the original vision.

### Phase 1 Philosophy: Observation First

Phase 1 deliberately limits scope to **observation and query only**:
- Proves speech act detection works reliably
- Establishes data model and privacy rules
- Creates foundation for action layer (Phase 2+)
- Provides immediate value without complexity risk

**Why observation-only is valuable:**
- Searchable memory of conversations
- Accountability tracking
- Historical context retrieval
- Prevents "he said / she said" confusion

### Why Email First

- Universal, familiar interface
- Natural async communication  
- No special syntax or tools to learn
- Can dogfood from day 1
- Add action layer (Phase 2) when detection is proven

---

## Document Status

**Status:** Ready for PM Review  
**Next Agent:** PM Agent (Product Manager)  
**Action:** Transform via `*agent pm` to create Phase 1 PRD
