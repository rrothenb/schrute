---
process_id: generate-wiki-from-discussions
enabled: true
repo: your-org/your-repo
---

# Process: Generate Wiki Pages from Discussions

## Purpose
Convert valuable GitHub Discussions into permanent wiki documentation, preserving institutional knowledge.

## Trigger
**When:** A discussion is closed or marked resolved
**Event:** `discussion.closed`

Alternative: Can also run on a schedule to process recent active discussions.

## Actions

1. **Analyze the discussion**
   - Extract key points, decisions, and conclusions
   - Identify participants and major contributors
   - Determine if discussion has sufficient content for wiki page

2. **Generate wiki page**
   - Summarize the discussion into clear documentation
   - Organize content with proper headings and structure
   - Categorize as: process, decision, reference, or FAQ
   - Include links back to original discussion

3. **Create or update wiki**
   - Generate appropriate wiki page title
   - Post formatted content to wiki
   - Link back to discussion from wiki page

## Configuration

```yaml
min_comments: 3
link_back: true
categories:
  - process
  - decision
  - reference
  - faq
```

## How It Works

When a discussion is closed, Tom will:
1. Check if discussion has enough content (default: 3+ comments)
2. Analyze the full discussion thread
3. Extract key insights, decisions, and action items
4. Generate well-formatted wiki page content
5. Create wiki page with appropriate title and category
6. Optionally post a comment linking to the new wiki page

## Example

**Discussion:** "Should we use REST or GraphQL for the new API?"

**Participants:** alice, bob, carol (15 comments)

**Tom's Wiki Page:**
```markdown
# API Architecture Decision: REST vs GraphQL

## Summary
After discussion among the team, we decided to use REST for the v2 API.

## Key Points
- GraphQL considered for flexibility but team has more REST experience
- REST simpler for our use case (CRUD operations)
- Can revisit GraphQL for v3 if needed

## Decision
Use REST with JSON:API spec for v2 API

## Rationale
- Team expertise: 3/3 team members experienced with REST
- Tooling: Existing testing framework works with REST
- Timeline: Faster implementation (2 weeks saved)
- Client needs: Clients requested simple REST endpoints

## Participants
@alice, @bob, @carol

## Related
- Original discussion: #42
- Implementation tracking: #125

---
_Generated from [Discussion #42](link) on 2024-01-15_
```

**Category:** Decision

**Wiki Page:** "API Architecture Decision: REST vs GraphQL"

## Benefits

- **Preserves knowledge**: Important discussions don't get lost
- **Searchable documentation**: Wiki pages easier to find than old discussions
- **Onboarding**: New team members can read decisions without digging through history
- **Living documentation**: Project history captured in organized format

## When Wiki Pages Are Created

Tom will create wiki pages when discussions:
- Have meaningful conclusions or decisions
- Contain useful reference information
- Answer common questions (FAQ material)
- Document team processes

Tom will skip wiki creation if:
- Discussion too short (< min_comments threshold)
- No clear conclusions reached
- Already documented elsewhere

## Categories

Tom categorizes wiki pages as:

- **process**: Team workflows, procedures, guidelines
  - Example: "Code Review Process"

- **decision**: Major decisions and rationale
  - Example: "Database Choice: PostgreSQL"

- **reference**: Technical reference, examples, how-tos
  - Example: "API Authentication Examples"

- **faq**: Frequently asked questions
  - Example: "Common Installation Issues"

## Customization

Adjust the behavior:
- **min_comments**: Minimum discussion length to warrant wiki page (default: 3)
- **link_back**: Post comment linking to wiki (default: true)
- **categories**: Customize category types for your project

## Manual Triggers

You can also manually trigger wiki generation by:
1. @mentioning Tom in a discussion
2. Using the "generate-wiki" label
3. Running the wiki-monitor scheduler (checks recent discussions)

## Review Process

After Tom creates a wiki page:
1. Review the generated content
2. Edit wiki page if needed (Tom won't overwrite manual edits)
3. Add additional sections or examples
4. Link to related pages

The wiki generation provides a solid first draft that humans can refine.
