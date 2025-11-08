# User-Taught Skills: Dynamic Capability Learning

## Overview

Schrute can learn new capabilities through conversational interaction. When Schrute encounters a query it cannot answer, it proactively offers to learn how to handle similar queries in the future by creating a **Dynamic Skill**.

This demonstrates a key prototype capability: extending Schrute's abilities without code changes, purely through natural conversation.

## Architecture

### Components

1. **Query Handler with Confidence Detection**
   - Evaluates its ability to answer queries
   - Returns confidence level: `high`, `medium`, `low`, or `unable`
   - Suggests skill names when unable to answer

2. **Interactive CLI Skill Creation**
   - Detects `confidence: unable` responses
   - Offers to create a skill interactively
   - Guides user through skill definition

3. **Dynamic Skills MCP Server**
   - Stores skills as JSON with prompt templates
   - Executes skills by filling placeholders + Claude API
   - Skills become available immediately after creation

### Workflow

```
User asks query
    ↓
Query Handler evaluates
    ↓
Confidence: UNABLE
    ↓
CLI offers to learn
    ↓
User teaches skill (interactive prompts)
    ↓
Skill stored in Dynamic Skills server
    ↓
Next time: Query succeeds with new skill
```

## Complete End-to-End Demonstration

### Prerequisites

```bash
# Build the project
npm run build

# Set API key
export CLAUDE_API_KEY=sk-ant-...

# Start CLI
npm run cli
```

### Step 1: Connect Dynamic Skills Server

```
schrute> mcp connect dynamic-skills node dist/mcp-servers/dynamic-skills/server.js
✓ Connected to dynamic-skills server
Available tools: create_skill, list_skills, update_skill, delete_skill, invoke_skill
```

### Step 2: Load Test Email Thread

```
schrute> load events/thread-status-reports.yaml
✓ Loaded 5 emails
✓ Built 1 thread
✓ Detected X speech acts
```

**What's in this thread:**
- Alice asks Schrute to generate weekly status reports
- Team members (Bob, Carol) share their commitments and progress
- Alice describes the exact format she wants
- Perfect scenario for teaching Schrute a new skill

### Step 3: Query Without the Skill

```
schrute> query Generate a weekly status report for the team

Query: Generate a weekly status report for the team
Processing...

Answer:
I don't have a predefined format or capability to generate structured weekly status reports. While I can see the commitments and progress mentioned in the emails (Bob's API integration completed, database migration at 80%, Carol's UI work), I don't have a built-in template for formatting this into a formal weekly status report.

CONFIDENCE: UNABLE
SUGGESTED_SKILL: generate-weekly-status-report

💡 I was unable to answer this query with my current capabilities.
   Suggested skill: generate-weekly-status-report

Would you like me to learn how to answer this type of query?
Type "yes" to create a new skill, or press Enter to continue.
```

**Key observation:** Schrute detected it can't answer and offered to learn.

### Step 4: Interactive Skill Creation

Type `yes` and follow the prompts:

```
yes

=== Creating a New Skill ===

Skill name (default: generate-weekly-status-report):
  weekly-status-report

Skill description:
  (Describe what this skill does)
  Generates formatted weekly status reports showing commitments, progress, and completion status

Prompt template:
  (Write instructions for how to answer this type of query)
  (Use {{placeholder}} for input variables)
  Example: "Generate a weekly status report for the following commitments: {{commitments}}"
  Generate a weekly status report from the following team updates: {{team_updates}}. Format it with sections for: completed items, in-progress items with completion estimates, and any blockers or dependencies. Make it suitable for leadership review.

Placeholder descriptions:
  {{team_updates}} - What does this represent?
    The raw text containing team member commitments and progress updates

 Creating skill...
✓ Skill "weekly-status-report" created successfully!

You can now use it with:
  skills invoke weekly-status-report

Would you like to test the skill now? (yes/no)
  yes

Provide values for the skill:
  team_updates (The raw text containing team member commitments and progress updates):
    Bob: API integration completed. Database migration 80% complete, finishing Monday. Carol: Dashboard and profile page completed. Settings page in progress, finishing Wednesday. Will review Bob's API work.

Invoking skill...

Result:
# Weekly Status Report

## ✅ Completed This Week
- **API Integration** (Bob) - Completed this morning
- **Dashboard Layout** (Carol) - Completed
- **User Profile Page** (Carol) - Completed

## 🔄 In Progress
- **Database Migration** (Bob)
  - Status: 80% complete
  - Estimated completion: Monday
- **Settings Page** (Carol)
  - Estimated completion: Wednesday

## 📋 Upcoming Work
- **Performance Testing** (Bob) - Starting next week
- **API Review** (Carol) - Pending Bob's completion

## Dependencies & Blockers
- Carol's API review depends on Bob completing the API integration ✅ (now unblocked)

---
*Report generated for leadership review*
```

**What just happened:**
1. User taught Schrute how to create status reports
2. Skill was stored in the Dynamic Skills server
3. Skill was immediately tested and worked

### Step 5: Query Again With the Skill

Now enable automatic tool use and try again:

```
schrute> tools on
✓ Automatic tool use enabled
  Queries will automatically discover and use connected MCP tools
  Connected servers: dynamic-skills
  Available tools: 6

schrute> query Generate a weekly status report for the team

Query: Generate a weekly status report for the team
Processing...

Answer:
# Weekly Status Report

## ✅ Completed This Week
- **API Integration** (Bob) - Completed
- **Dashboard Layout** (Carol) - Completed
- **User Profile Page** (Carol) - Completed

## 🔄 In Progress
- **Database Migration** (Bob) - 80% complete, finishing Monday
- **Settings Page** (Carol) - Will finish Wednesday

## 📋 Upcoming Work
- **Performance Testing** (Bob) - Starting next week

## Dependencies
- Carol will review Bob's API work once ready

---
Sources: msg-status-001, msg-status-002, msg-status-003, msg-status-004, msg-status-005, tool:weekly-status-report
```

**Success!** Schrute:
- Automatically discovered the new skill
- Used it to answer the query
- Generated a properly formatted report
- Attributed the skill as a source

## Key Capabilities Demonstrated

1. **Self-Awareness**: Schrute knows when it can't answer queries
2. **Proactive Learning**: Offers to learn without being explicitly told
3. **Interactive Teaching**: Guides users through skill creation
4. **Immediate Availability**: Skills work right after creation
5. **Automatic Discovery**: New skills are found and used automatically
6. **Source Attribution**: Tool usage is tracked and credited

## Advanced: Creating Complex Skills

### Example: Email Summarizer

```
schrute> query Summarize all emails in a 2-sentence executive brief
[Schrute detects it can't do this format]
💡 Would you like me to learn...

yes

Skill name: executive-email-brief
Description: Summarizes email threads in 2 sentences for executives
Prompt template: Summarize the following email thread in exactly 2 sentences suitable for a C-level executive: {{email_content}}. Focus on decisions and action items only.
```

### Example: Risk Highlighter

```
Skill name: risk-identifier
Description: Identifies and highlights project risks from emails
Prompt template: Analyze this email thread and identify all project risks, delays, or potential blockers: {{thread_content}}. For each risk, rate severity (low/medium/high) and suggest mitigation.
```

## Implementation Details

### Confidence Detection

The query handler asks Claude to assess its confidence:

```typescript
IMPORTANT: After your answer, include a confidence assessment on a new line:
CONFIDENCE: [HIGH|MEDIUM|LOW|UNABLE]

If your confidence is UNABLE:
SUGGESTED_SKILL: [a descriptive name for a skill that could help]
```

Claude's response is parsed to extract:
- Clean answer text
- Confidence level
- Suggested skill name (if unable)

### Skill Storage Format

Skills are stored as JSON:

```json
{
  "id": "uuid",
  "name": "weekly-status-report",
  "description": "Generates formatted weekly status reports",
  "prompt_template": "Generate a weekly status report from: {{team_updates}}...",
  "input_placeholders": [
    {
      "name": "team_updates",
      "description": "Team member commitments and progress",
      "required": true
    }
  ],
  "created_at": "2025-01-18T10:00:00Z",
  "updated_at": "2025-01-18T10:00:00Z"
}
```

### Skill Execution

When invoked, the Dynamic Skills server:
1. Validates required placeholders are provided
2. Substitutes placeholder values into template
3. Sends to Claude API
4. Returns result

## Testing Strategy

### Manual Test Checklist

- [ ] Load status reports email thread
- [ ] Query for status report (should fail with confidence: unable)
- [ ] Accept offer to create skill
- [ ] Complete interactive skill creation
- [ ] Test skill immediately
- [ ] Enable automatic tool use
- [ ] Query again (should succeed using new skill)
- [ ] Verify skill is listed in `skills list`

### Validation Points

1. **Confidence detection works**
   - Query handler correctly identifies when it can't answer
   - Suggested skill name is reasonable

2. **Interactive flow is smooth**
   - All prompts are clear
   - Default values work
   - Placeholder detection is accurate

3. **Skill creation succeeds**
   - Skill stored in skills.json
   - No errors during creation

4. **Skill execution works**
   - Immediate test succeeds
   - Subsequent queries with tools enabled use the skill
   - Results are high quality

5. **Integration is seamless**
   - No need to reconnect or reload
   - Tool discovery finds new skill automatically
   - Source attribution includes tool name

## Cost Considerations

- **Skill creation**: ~$0.01-0.02 per skill (one Claude API call)
- **Skill execution**: ~$0.01-0.03 per invocation (depending on template complexity)
- **Query with skill**: ~$0.02-0.05 (includes detection + tool use + response)

For a prototype, these costs are negligible. In production:
- Cache skill results when appropriate
- Batch similar queries
- Use prompt caching for repeated patterns

## Future Enhancements

1. **Skill Templates Library**: Pre-built templates for common patterns
2. **Skill Versioning**: Track changes and rollback if needed
3. **Skill Sharing**: Export/import skills between Schrute instances
4. **Automatic Improvement**: Refine skills based on usage feedback
5. **Multi-step Skills**: Skills that call other skills or tools
6. **Permission System**: Control who can create/modify skills

## Comparison: Before vs. After

### Before (Manual Skill Creation)

1. User identifies capability gap
2. Developer writes MCP server code
3. Developer deploys server
4. User connects to server via CLI
5. User can now use the capability

**Time:** Hours to days
**Requires:** Developer + deployment

### After (User-Taught Skills)

1. User asks query
2. Schrute offers to learn
3. User teaches in 2-3 minutes
4. Capability immediately available

**Time:** 2-3 minutes
**Requires:** Only the end user

This is the "magic" - instant extensibility through conversation.

## Conclusion

User-Taught Skills demonstrate that Schrute can:
- Recognize its limitations
- Learn new capabilities interactively
- Apply learned skills automatically
- Extend without code changes

This validates the core hypothesis: **an LLM-based assistant can learn domain-specific capabilities through conversation alone**, making it practical to customize Schrute for any team's unique workflows without engineering resources.
