# Realistic Email Thread Test

## Purpose

Validate that Schrute handles real-world email complexity before moving to production. This test uses a messy, realistic email thread (`thread-messy-realistic.yaml`) that includes all the complications that occur in actual workplace communication.

## Test Scenario: Project Phoenix Budget Discussion

A 12-email thread about Q2 budget approval for "Project Phoenix" with multiple complications:

### Participants
- **Alice Johnson** (alice.johnson@company.com) - Program Manager, uses "Al", "Alice", "-A"
- **Bob Smith** (bob.smith@company.com) - Infrastructure lead, signs as "Bobby", "Bob", "-B"
- **David Chen** (david.chen@company.com) - Vendor analyst, signs as "Dave", "DC", "-David"
- **Frank Wilson** (frank.wilson@company.com) - QA lead, signs as "Frank"
- **Schrute** (schrute@company.com) - CC'd on all emails

### Edge Cases Included

**1. Nickname and Name Variations**
- Alice → "Al", "-A"
- Bob → "Bobby", "-B"
- David → "Dave", "DC", "Chen"
- References like "Johnson" (ambiguous - Alice's last name?)

**2. References to People NOT on Thread**
- Carol (mentioned by Bob, never on email)
- Mike (David sent analysis to "Mike", not on thread)
- Sarah (mentioned as handling cloud migration)
- Lisa and Tom (Frank's team members)
- Elena (mentioned re: headcount approval)
- Jennifer (Bob saw her, mentioned deadline change)
- Rachel (David ran into at lunch, mentioned API changes)
- Kevin (suggested to loop in, never added)
- Michael (wanted DR costs considered)
- Greg (from finance, mentioned Karen approval)
- Karen (finance approval required)

**3. Irrelevant Chit Chat**
- "How was your weekend btw?"
- "Weekend was great btw! Took the kids to the zoo 🦁"
- "Sorry for delay"
- "lol"
- "Sorry to keep adding complications! 😅"

**4. References to Past Conversations**
- "Like we discussed back in November"
- "vendor analysis we talked about last month"
- "Did Elena approve the headcount increase?" (past discussion)
- "architecture review" (past meeting)

**5. Thread Drift & Topic Mix**
- Starts: Budget estimates
- Adds: Cloud migration costs
- Adds: Timeline compression
- Adds: Vendor selection
- Adds: Testing responsibilities dispute
- Adds: Headcount requirements
- Adds: Disaster recovery costs
- Adds: Finance approval process
- Adds: API requirements change rumor
- Subject line changes: "Q2 Budget" → "VENDOR COSTS" → "DECISIONS NEEDED" → "FINAL DECISIONS"

**6. Inline Replies with Quoting**
- David uses `> David - did you finish...` format
- Not all participants use consistent quoting

**7. Ambiguous Pronouns**
- "he said", "she said" without clear antecedent
- "your team" vs "my team"
- "we agreed" (who is "we"?)

**8. Partial Participant Changes**
- Frank added in msg-004
- Different CC lists throughout
- References to people not yet on thread

**9. Typos and Informal Language**
- "theres" instead of "there's"
- "kinda crazy lol"
- "gonna"
- Emoji usage

**10. Conflicting Information**
- Bob and Frank disagree on testing responsibilities
- "Carol mentioned" but Carol never sent email
- March deadline rumor (later confirmed false)
- Rachel mentioned API changes (unverified)

**11. Complex Decision Chain**
- Multiple proposals
- Some approved, some rejected
- Final summary email with decisions
- Commitments scattered across multiple emails

**12. Forwarded/Referenced Content**
- David mentions sending analysis to others
- Bob references seeing Jennifer
- David ran into Rachel

## Test Plan

### Setup

```bash
# Build and start CLI
npm run build
npm run cli

# Connect MCP servers (optional, for tool use tests)
schrute> mcp connect knowledge-store node dist/mcp-servers/knowledge-store/server.js
schrute> mcp connect dynamic-skills node dist/mcp-servers/dynamic-skills/server.js

# Load the messy email thread
schrute> load events/thread-messy-realistic.yaml
```

### Test 1: Email Parsing & Threading

**Objective**: Verify all emails parsed correctly despite variations

**Commands**:
```
schrute> threads
schrute> status
```

**Success Criteria**:
- ✅ All 12 emails loaded
- ✅ Single thread identified (thread-budget-mess)
- ✅ Thread title: "Q2 Budget for Project Phoenix" or similar
- ✅ All 5 participants recognized (Alice, Bob, David, Frank, Schrute)
- ✅ No parsing errors

### Test 2: Speech Act Detection

**Objective**: Detect speech acts despite informal language and mixed topics

**Commands**:
```
schrute> acts
schrute> acts commitment
schrute> acts decision
schrute> acts question
schrute> acts request
```

**Expected Speech Acts** (at minimum):

**Requests**:
- Alice requests infrastructure estimates from Bob (msg-001)
- Alice requests vendor analysis from David (msg-001)
- Alice asks Frank about parallel testing (msg-004)
- Alice asks about vendor cost difference (msg-004)
- Bob asks if Elena approved headcount (msg-005)
- Bob asks Schrute to pull up past decisions (msg-006)
- Alice asks Schrute to track decisions (msg-008)

**Commitments**:
- Bob commits to estimates by Wed (msg-002)
- David commits to VendorY recommendation (msg-003)
- Frank commits to attending call (msg-010)
- Frank cannot commit to compressed timeline without headcount (msg-010)
- Bob commits to getting DR quote by EOW (msg-012)
- David commits to finalizing VendorY contract (msg-012)
- Frank commits to sending testing plan by Monday (msg-012)
- Alice commits to getting Karen approval (msg-012)

**Decisions**:
- Going with VendorY (msg-012)
- Infrastructure approved $50K (msg-012)
- Disaster recovery approved $18K (msg-012)
- Testing responsibilities confirmed (msg-012)
- Keeping original timeline (msg-012)
- Not using Azure (msg-012)
- Not compressing timeline (msg-012)
- Total budget: $188K (msg-012)

**Questions**:
- Bob: "Are we including cloud migration in Phoenix?" (msg-002)
- David: "Did you not get it?" (msg-003)
- Frank: "Did Elena approve headcount?" (msg-005)
- Bob: "Is March deadline confirmed?" (msg-006)
- David: "Can we get on a call?" (msg-007)

**Success Criteria**:
- ✅ At least 70% of expected speech acts detected
- ✅ Key decisions in final email (msg-012) all captured
- ✅ Commitments with deadlines correctly identified
- ✅ No false positives from chit chat (weekend, zoo, lunch mentions)

### Test 3: Participant & Privacy Tracking

**Objective**: Correctly track who has access to what information

**Commands**:
```
schrute> query What did Carol say about the cloud migration?
schrute> query What did Mike think of the vendor analysis?
schrute> query What testing responsibilities did we agree on?
```

**Success Criteria**:

**Query 1** (Carol):
- ✅ Should recognize Carol was MENTIONED but never on thread
- ✅ Should indicate no direct information from Carol
- ✅ Should mention Bob referenced Carol (msg-002)

**Query 2** (Mike):
- ✅ Should recognize Mike was MENTIONED but never on thread
- ✅ Should indicate David sent analysis to Mike (msg-003)
- ✅ Should not fabricate Mike's opinions

**Query 3** (Testing responsibilities):
- ✅ Should correctly identify: Bob's team = integration, Frank's team = E2E+UAT
- ✅ Should note there was confusion/disagreement
- ✅ Should cite the resolution in msg-007 and confirmation in msg-012

### Test 4: Name Resolution & Ambiguity

**Objective**: Correctly resolve nicknames, surnames, and ambiguous references

**Commands**:
```
schrute> query What did Bobby commit to?
schrute> query What was Al's decision on the vendor?
schrute> query What did Chen say about testing?
schrute> query Who is "Johnson" referring to in Bob's email?
```

**Success Criteria**:

**Bobby = Bob Smith**:
- ✅ Should correctly identify Bobby as Bob Smith
- ✅ Should list his commitments (estimates by Wed, DR quote by EOW)

**Al = Alice Johnson**:
- ✅ Should correctly identify Al as Alice
- ✅ Should indicate she decided on VendorY after team input

**Chen = David Chen**:
- ✅ Should correctly identify Chen as David
- ✅ Should find his clarification about testing strategy (msg-007)

**"Johnson" ambiguity**:
- ✅ Should recognize this is ambiguous (could be Alice Johnson)
- ✅ Should note Bob said "Johnson is right about timeline"
- ✅ Bonus: Recognize this likely refers to Alice based on context

### Test 5: Decision Tracking with Conflicting Info

**Objective**: Track decisions despite conflicting/evolving information

**Commands**:
```
schrute> query What vendor did we choose and why?
schrute> query What happened with the timeline compression proposal?
schrute> query What is the final approved budget?
schrute> query Is the deadline moving to March?
```

**Success Criteria**:

**Vendor**:
- ✅ Should identify VendorY chosen
- ✅ Should mention cost: $120K/year
- ✅ Should cite David's recommendation (better SLA, more reliable)
- ✅ Should note VendorX was alternative ($85K, rejected)

**Timeline compression**:
- ✅ Should identify proposal to compress by 2 weeks
- ✅ Should note it was rejected
- ✅ Should explain reason: Elena didn't approve QA headcount
- ✅ Should indicate original schedule kept

**Budget**:
- ✅ Should identify final budget: $188K
- ✅ Should break down: $50K infra + $120K vendor + $18K DR
- ✅ Should note Karen approval required (over $150K)

**March deadline**:
- ✅ Should indicate this was a rumor (Bob heard from Jennifer)
- ✅ Should note it was confirmed FALSE in final email
- ✅ Should state actual deadline: end of April

### Test 6: Filtering Chit Chat from Business Content

**Objective**: Distinguish relevant business info from social chat

**Commands**:
```
schrute> query What personal activities were mentioned?
schrute> query What are the key business decisions?
schrute> acts decision
```

**Success Criteria**:
- ✅ Should recognize weekend/zoo as chit chat (if asked directly)
- ✅ Should NOT include chit chat as business decisions
- ✅ Decision acts should be business-focused only
- ✅ Bonus: If asked about personal stuff, should note it's minimal/irrelevant to project

### Test 7: Complex Responsibility Assignment

**Objective**: Track who owns what despite disagreements

**Commands**:
```
schrute> query What is Bob responsible for?
schrute> query What is Frank responsible for?
schrute> query What is David responsible for?
schrute> query Who disagreed about testing and how was it resolved?
```

**Success Criteria**:

**Bob's responsibilities**:
- ✅ Infrastructure estimates (completed)
- ✅ Integration testing (confirmed ownership)
- ✅ Get DR quote by EOW
- ✅ Execute $50K AWS infrastructure

**Frank's responsibilities**:
- ✅ E2E and UAT testing (confirmed ownership)
- ✅ Send testing plan by next Monday
- ✅ Cannot compress timeline without headcount

**David's responsibilities**:
- ✅ Vendor analysis (completed)
- ✅ Recommended VendorY
- ✅ Finalize VendorY contract with legal

**Testing disagreement**:
- ✅ Should note Bob and Frank had confusion
- ✅ Should cite Frank's concern (msg-005)
- ✅ Should cite Bob's clarification (msg-006)
- ✅ Should cite David's resolution (msg-007)
- ✅ Should cite final confirmation (msg-012)

### Test 8: References to People Not on Thread

**Objective**: Distinguish between participants and mentioned-but-absent people

**Commands**:
```
schrute> query Who are all the people mentioned in this thread?
schrute> query What role does Elena play?
schrute> query What did Sarah's team decide?
```

**Success Criteria**:

**People mentioned**:
- ✅ Should list: Alice, Bob, David, Frank, Schrute (participants)
- ✅ Should also mention: Carol, Mike, Sarah, Lisa, Tom, Elena, Jennifer, Rachel, Kevin, Michael, Greg, Karen
- ✅ Should distinguish participants from mentioned-only people

**Elena's role**:
- ✅ Should note she controls headcount approvals
- ✅ Should note she blocked additional QA engineers
- ✅ Should recognize she's NOT on the email thread

**Sarah's team**:
- ✅ Should note Sarah's team handles cloud migration
- ✅ Should recognize this is mentioned but not discussed in detail
- ✅ Should not fabricate decisions by Sarah

### Test 9: Tool Use (If Enabled)

**Objective**: Validate automatic tool use with complex thread

**Setup**:
```
schrute> tools on
```

**Commands**:
```
schrute> query Store the final budget decision in the knowledge base
schrute> query What decisions have we stored?
```

**Success Criteria**:
- ✅ Should automatically invoke `store_knowledge` tool
- ✅ Should store decision with correct category, participants, content
- ✅ Should be retrievable via knowledge search
- ✅ Should attribute tool as source

### Test 10: Activation Decision

**Objective**: Would Schrute respond appropriately if addressed?

**Scenario**: Simulate Schrute being asked directly

**Command**:
```
schrute> query Should I respond to Alice's request to track decisions?
```

**Success Criteria**:
- ✅ Should recognize Schrute was directly asked (msg-008)
- ✅ Should indicate response is appropriate
- ✅ Should recognize this is within Schrute's responsibilities
- ✅ Should suggest how to respond (e.g., "Yes, I can track these decisions...")

## Success Thresholds

**Minimum Passing Score**: 80% of success criteria met

**Critical Requirements** (must all pass):
- All 12 emails parse correctly
- Thread correctly assembled
- At least 70% of speech acts detected
- Key final decisions all captured (msg-012)
- No fabrication of information from non-participants
- No chit chat mistaken for business decisions

**Stretch Goals** (nice to have):
- 90%+ speech act detection accuracy
- Correct name resolution for all nicknames/variations
- Accurate ambiguity handling ("Johnson")
- Perfect distinction between participants and mentioned-only people

## Issues to Document

If any of the following occur, document as potential risks:

1. **Parsing failures** - Any emails that fail to parse
2. **Threading errors** - Multiple threads created from one conversation
3. **Participant misidentification** - Wrong people attributed to statements
4. **Name resolution failures** - Nicknames not connected to real names
5. **False positives** - Chit chat detected as business speech acts
6. **False negatives** - Clear commitments/decisions missed
7. **Fabrication** - Information attributed to people not on thread
8. **Ambiguity errors** - Incorrect resolution of ambiguous references
9. **Decision tracking errors** - Wrong final decisions, missing approvals/rejections
10. **Privacy violations** - Information revealed that should be filtered

## Running the Full Test

```bash
# Start fresh
npm run build
npm run cli

# Load thread
schrute> load events/thread-messy-realistic.yaml

# Validate parsing
schrute> threads
schrute> status

# Check speech acts
schrute> acts
schrute> acts commitment
schrute> acts decision

# Test queries (run all from Test Plan sections 3-8)
schrute> query What vendor did we choose and why?
schrute> query What did Bobby commit to?
schrute> query What happened with the timeline compression?
# ... (continue with all test queries)

# Enable tools and test
schrute> mcp connect knowledge-store node dist/mcp-servers/knowledge-store/server.js
schrute> tools on
schrute> query Store the final budget decision in the knowledge base

# Document findings
# - What worked well?
# - What failed or was inaccurate?
# - Any surprising behaviors?
# - Risk areas for production?
```

## Expected Outcome

This test should reveal:
- ✅ **Strengths**: What Schrute handles well (likely: structured decisions, clear commitments)
- ⚠️ **Weaknesses**: What needs improvement (likely: ambiguous references, nickname resolution)
- 🔴 **Blockers**: Any critical failures that would prevent production use
- 📋 **Recommendations**: Whether to proceed to production or iterate further

If 80%+ of criteria pass, Schrute is ready for semi-real testing (anonymized real emails).
If <80% pass, identify highest-risk failures and prototype solutions before production.
