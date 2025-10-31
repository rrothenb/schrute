# Feature Specification: Speech-Act-Based AI Assistant Prototype

**Feature Branch**: `001-speech-act-assistant`
**Created**: 2025-10-31
**Status**: Draft
**Input**: User description: "I'd like some help prototyping what I think will be the hardest part of the schrute project (named for the character dwight schrute) - a minimal, extensible, AI assistant that is focused on: - Having the most human like interface by forgoing a UI in favor of using the conventional tools used to communicate with a remote team member - email, slack, wikis, calendars, and common tools - Utilizing speech acts to reason about commitments, etc. Has the ability to identify all the speech acts in an email and save them and to query them. - Respects privacy by recognizing which emails were sent to which email addresses and will not share information from a speech acts query to someone who wasn't included in the relevant emails. If a query would include potentially private information, return the clearly allowed information and indicate the person(s) causing the information to be withheld. - In order to fully understand an email, the agent may need every email ever received from anyone involved in the current email thread, even if the emails weren't part of the current thread. - Simply including every email ever received by the agent isn't practical over time as this could overwhelm the context. It seems that a simple RAG solution based on semantic closeness may not be suitable either."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Query Commitments from Email Conversations (Priority: P1)

A team member sends a natural language query to the assistant asking about commitments, requests, or promises made in previous email conversations. The assistant identifies relevant speech acts from emails the querying person was included in and returns a structured summary.

**Why this priority**: This is the core value proposition of the system - extracting actionable commitments from unstructured communication. Without this, the assistant has no purpose.

**Independent Test**: Can be fully tested by seeding the system with sample emails containing commitments (e.g., "I'll send the report by Friday"), then querying "What commitments does John have?" and verifying the assistant returns only commitments from emails the querier participated in.

**Acceptance Scenarios**:

1. **Given** the assistant has processed 20 emails containing various speech acts, **When** a team member queries "What did Sarah commit to doing?", **Then** the assistant returns all commitments Sarah made in emails that included the querying person
2. **Given** the assistant has emails from multiple conversation threads, **When** a team member queries "What are my open commitments?", **Then** the assistant returns only commitments made by the querying person that haven't been marked as fulfilled
3. **Given** an email thread contains a commitment ("I'll review the document by Tuesday"), **When** the assistant processes this email, **Then** it correctly identifies this as a commitment speech act with the actor, action, and deadline

---

### User Story 2 - Privacy-Aware Information Filtering (Priority: P1)

A team member queries for information that includes some private emails (emails they weren't copied on). The assistant returns only information from emails the querier had access to, and indicates that additional information exists but is being withheld due to privacy constraints.

**Why this priority**: Privacy protection is a fundamental requirement. Without this, the system violates trust and creates security issues. This is P1 because it must be designed into the core architecture from the start.

**Independent Test**: Can be fully tested by creating two email threads - one including User A, one excluding User A. When User A queries for information that spans both threads, the system returns data only from their thread and indicates "Additional information withheld (involves: User B)".

**Acceptance Scenarios**:

1. **Given** an email was sent only to Alice and Bob, **When** Charlie queries for commitments made by Alice, **Then** the assistant returns only commitments from emails Charlie participated in and indicates "Additional information exists but is private (participants: Alice, Bob)"
2. **Given** a query would return 5 commitments (3 from accessible emails, 2 from private emails), **When** the assistant processes the query, **Then** it returns the 3 accessible commitments with a note: "2 additional items withheld due to privacy constraints"
3. **Given** all relevant emails included the querying person, **When** they make a query, **Then** no privacy warnings appear in the response

---

### User Story 3 - Context-Aware Email Understanding (Priority: P2)

When processing a new email, the assistant retrieves relevant historical context about the participants and topics to accurately interpret speech acts, even when the email contains ambiguous references or assumes shared knowledge.

**Why this priority**: Accurate speech act extraction requires understanding context. This is P2 because basic speech act extraction (P1) can work with limited context, but quality improves significantly with this enhancement.

**Independent Test**: Can be fully tested by sending an email that says "I'll finish it by Thursday" where "it" refers to a project mentioned in a previous unrelated email thread with the same participants. The system should correctly link "it" to the project context.

**Acceptance Scenarios**:

1. **Given** Alice and Bob have discussed "Project Phoenix" in 10 previous emails, **When** Alice sends Bob a new email saying "I'll complete the analysis by Friday" without mentioning the project name, **Then** the assistant associates this commitment with Project Phoenix based on their recent conversation history
2. **Given** a new email from Dave saying "Thanks, that resolves my question", **When** the assistant processes this, **Then** it retrieves Dave's original question from previous emails to understand what was resolved
3. **Given** the assistant needs context for an email from participants with 500 historical emails, **When** it retrieves context, **Then** the system builds a graph of email relationships and retrieves all emails in connected conversation chains (same thread, referenced messages, or shared participants discussing same entities/topics)

---

### User Story 4 - Interface Through Standard Communication Tools (Priority: P2)

Team members interact with the assistant by sending emails or messages through their normal communication channels (email client, Slack, etc.) rather than through a specialized interface. The assistant responds through the same channels.

**Why this priority**: This differentiates the product by reducing friction, but is P2 because early prototypes can use simpler interaction methods to validate core functionality first.

**Independent Test**: Can be fully tested by sending an email to the assistant's address with a query like "What are my commitments?" and receiving an email response with the structured information.

**Acceptance Scenarios**:

1. **Given** a user sends an email to the assistant's designated address, **When** the email contains a query about commitments, **Then** the assistant replies via email with the requested information
2. **Given** a user sends a Slack direct message to the assistant, **When** the message asks "What did I promise to deliver this week?", **Then** the assistant responds in the same Slack thread with relevant commitments
3. **Given** a user mentions the assistant in a calendar event comment, **When** they ask for availability information, **Then** the assistant responds through the calendar interface

---

### User Story 5 - Identify and Classify Multiple Speech Act Types (Priority: P3)

The assistant recognizes various speech act types beyond commitments, including requests, questions, assertions, acknowledgments, and directives, and allows querying across these categories.

**Why this priority**: This extends the system's utility beyond commitment tracking to general conversation understanding. It's P3 because the core prototype can focus on commitments initially, then expand to other speech acts.

**Independent Test**: Can be fully tested by processing an email containing multiple speech acts ("Can you send me the report? I'll review it by Thursday. Thanks for handling the client call.") and verifying each is correctly categorized as a request, commitment, and acknowledgment respectively.

**Acceptance Scenarios**:

1. **Given** an email containing a question ("What's the status of the deployment?"), **When** the assistant processes it, **Then** it classifies this as a "request for information" speech act and associates it with the sender
2. **Given** multiple emails in a thread, **When** someone asks "What questions has Alice asked me?", **Then** the assistant returns all question speech acts directed at the querying person
3. **Given** an acknowledgment like "Got it, thanks!", **When** the assistant processes this, **Then** it links this to the preceding message being acknowledged

---

### Edge Cases

- What happens when an email is BCC'd to someone? Should the assistant treat BCC recipients as having access to that information for privacy purposes?
- How does the system handle forwarded emails where someone gains access to a conversation they weren't originally part of?
- What happens when someone leaves the organization? Should their emails remain in the system for participants to query?
- How does the assistant handle ambiguous speech acts like "I might be able to do that by Friday" - is this a commitment or not?
- What happens when email addresses change (e.g., someone gets married, company rebrand)?
- How does the system handle group aliases/distribution lists for privacy (e.g., engineering@company.com)?
- What happens when historical context retrieval would require processing thousands of emails in real-time?
- How does the assistant differentiate between a genuine commitment and hypothetical statements ("I could finish it by Tuesday if needed")?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extract speech acts from email messages and persist them with metadata including participants, timestamp, and conversation context
- **FR-002**: System MUST classify extracted speech acts into categories (minimally: commitments, requests, questions, assertions, acknowledgments)
- **FR-003**: System MUST associate each speech act with the specific email addresses that were recipients (To, CC) of the source email
- **FR-004**: System MUST accept natural language queries about speech acts through standard communication channels
- **FR-005**: System MUST filter query results to include only speech acts from emails where the querying person was a recipient
- **FR-006**: System MUST indicate when query results are incomplete due to privacy filtering, including which participants are associated with the withheld information
- **FR-007**: System MUST retrieve relevant historical emails about participants or topics when processing new emails to provide context for speech act interpretation
- **FR-008**: System MUST handle email threads by linking related messages together
- **FR-009**: System MUST identify actors, actions, and temporal constraints (deadlines, timeframes) in commitment-type speech acts
- **FR-010**: System MUST support queries for commitments by actor ("What has Alice committed to?"), by status ("What commitments are overdue?"), and by participant ("What commitments were made in emails I was part of?")
- **FR-011**: Users MUST be able to interact with the assistant using their existing email client without installing specialized software
- **FR-012**: System MUST maintain a mapping of participant identities to email addresses to support queries by person name
- **FR-013**: System MUST provide responses through the same communication channel used for the query (email query gets email response, Slack query gets Slack response)
- **FR-014**: System MUST handle context retrieval by building a graph of email relationships (thread membership, message references, participant overlap, entity/topic mentions) and retrieving all emails in connected conversation chains when processing new messages

### Key Entities

- **Speech Act**: Represents an identified communicative action within an email (commitment, request, question, etc.). Attributes include: type/category, actor (who performed the act), content (what was said), temporal constraints (deadlines, timeframes), source email reference, extraction timestamp
- **Email Message**: Represents a communication event. Attributes include: sender, recipients (To, CC, BCC), subject, body content, timestamp, thread identifier, related speech acts
- **Participant**: Represents a person who communicates through the system. Attributes include: name, associated email addresses, organizational context
- **Conversation Thread**: Represents a linked series of email messages. Attributes include: participant list, topic/subject, temporal span, related speech acts
- **Privacy Context**: Represents the access scope for information. Attributes include: list of participants who had access, source communication, whether information can be shared with a specific querier
- **Query**: Represents a request for information from the assistant. Attributes include: querying participant, query text, communication channel, privacy scope (which emails the querier had access to)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The assistant correctly identifies and classifies at least 85% of commitment speech acts in test emails (measured by human evaluation)
- **SC-002**: The assistant processes and responds to queries within 10 seconds for email histories up to 1,000 messages per participant
- **SC-003**: Zero privacy violations occur - the system never returns information from emails the querier didn't participate in (verified through automated testing)
- **SC-004**: Users can successfully query commitments using natural language without needing to learn structured query syntax (90% of test queries return expected results)
- **SC-005**: The assistant accurately associates context from historical emails to correctly interpret ambiguous references in at least 70% of test cases where context is needed
- **SC-006**: Users can interact with the assistant entirely through their existing email client without installing additional software
- **SC-007**: When privacy filtering applies, the system indicates what information is being withheld in 100% of cases

## Assumptions

- Email is the primary communication channel for the initial prototype, with Slack and other tools as future extensions
- The assistant has access to read emails through standard protocols (IMAP, API integration, or email forwarding)
- BCC recipients are treated as having access to email contents for privacy purposes (should be revisited based on use cases)
- Speech act taxonomy will start with 5 basic categories and expand based on usage patterns
- "Commitment" speech acts require explicit future action language (e.g., "I will", "I'll", "I commit to") rather than implicit or hypothetical statements
- Context retrieval will use a graph-based approach: building relationship graphs of email threads, references, participants, and topics to retrieve connected conversation chains (as specified in FR-014)
- Calendar and wiki integration are post-prototype features
- The assistant operates as a service that participants explicitly add to their communications (not passively monitoring all email)
- Initial prototype will support English language only
- Organizational context (reporting relationships, project structures) will be manually configured or inferred from email patterns rather than requiring HR system integration
