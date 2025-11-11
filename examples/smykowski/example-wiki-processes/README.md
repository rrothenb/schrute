# Example Wiki Process Definitions

This directory contains example process definitions for Smykowski's wiki-driven automation system.

## What Are Wiki Processes?

Wiki processes are automation workflows defined in natural language on your GitHub wiki. Tom reads these wiki pages and executes the defined actions automatically in response to GitHub events.

## Available Example Processes

### 1. Auto-Label New Issues
**File:** `Auto-Label-New-Issues.md`
**Trigger:** New issue created
**Actions:** Automatically classifies and labels issues based on content

**Use case:** Small projects where maintainer doesn't want to manually triage every issue

### 2. Auto-Answer Questions
**File:** `Auto-Answer-Questions.md`
**Trigger:** New issue created
**Actions:** Detects questions and posts helpful answers from documentation

**Use case:** Solo maintainers who get repetitive questions that are already documented

### 3. Generate Wiki from Discussions
**File:** `Generate-Wiki-From-Discussions.md`
**Trigger:** Discussion closed
**Actions:** Converts discussion into permanent wiki documentation

**Use case:** Preserving institutional knowledge from valuable discussions

## How to Use These Processes

### Option 1: Copy to Your Wiki

1. Copy the markdown content from any example file
2. Create a new wiki page in your GitHub repository
3. Paste the content
4. Update the `repo` field in the frontmatter to match your repository
5. Adjust configuration values as needed
6. Tom will automatically detect and activate the process

### Option 2: Customize for Your Needs

Each process definition has two parts:

**Frontmatter (YAML):**
```yaml
---
process_id: unique-identifier
enabled: true
repo: your-org/your-repo
---
```

**Process Description (Markdown):**
- **Purpose:** What the process does
- **Trigger:** What event activates it
- **Actions:** What Tom will do
- **Configuration:** Tunable parameters

You can edit the description in natural language, and Tom's LLM will parse it into executable actions.

## Process Definition Format

### Required Frontmatter Fields

- `process_id`: Unique identifier (kebab-case)
- `enabled`: Whether process is active (true/false)
- `repo`: Repository in `owner/repo` format

### Markdown Structure

```markdown
# Process: [Name]

## Purpose
What this process does and why

## Trigger
When: [Description]
Event: `[github-event-name].[action]`

## Actions
1. [Natural language description of action 1]
2. [Natural language description of action 2]

## Configuration
```yaml
key: value
```
```

## Supported Events

- `issues.opened` - New issue created
- `issues.edited` - Issue updated
- `issues.commented` - Comment added to issue
- `issues.closed` - Issue closed
- `pull_request.opened` - New PR created
- `pull_request.review_requested` - Review requested
- `discussion.created` - New discussion started
- `discussion.closed` - Discussion marked resolved

## Supported Actions

Tom currently supports these action types:

- **comment**: Add a comment to an issue/PR
- **label**: Add labels to an issue/PR
- **assign**: Assign users to an issue/PR
- **create_issue**: Create a new issue
- **update_wiki**: Create or update a wiki page
- **calculate_metrics**: Calculate project metrics
- **classify_and_label**: AI-powered issue classification
- **answer_question**: Detect and answer questions from docs
- **generate_wiki_from_discussion**: Convert discussion to wiki page

## Testing Your Processes

1. Set `enabled: true` in the frontmatter
2. Trigger the event manually (e.g., create a test issue)
3. Check Tom's execution logs
4. Verify the expected action occurred
5. Adjust configuration as needed

## Debugging

If a process isn't working:

1. Check the wiki page has valid YAML frontmatter
2. Verify `repo` matches your repository exactly
3. Ensure `enabled: true`
4. Check the event name matches GitHub's format
5. Review Tom's logs for parsing errors

## Configuration Reference

### Common Configuration Options

**Auto-Label Process:**
- `confidence_threshold` (0.0-1.0): Minimum confidence to auto-label (default: 0.8)
- `exclude_bots` (boolean): Skip bot-created issues (default: true)

**Auto-Answer Process:**
- `confidence_threshold` (0.0-1.0): Minimum confidence to post answer (default: 0.7)
- `max_wiki_pages` (number): Maximum wiki pages to search (default: 3)
- `include_readme` (boolean): Search README for answers (default: true)

**Wiki Generation Process:**
- `min_comments` (number): Minimum comments to generate wiki (default: 3)
- `link_back` (boolean): Post comment with wiki link (default: true)

## Advanced Usage

### Combining Multiple Actions

A single process can have multiple actions:

```markdown
## Actions
1. Calculate issue response metrics
2. Add a comment with the statistics
3. Add "needs-triage" label if response time is high
```

Tom will execute actions in sequence.

### Conditional Actions

Use the configuration section to set thresholds:

```yaml
configuration:
  response_time_threshold: 24  # hours
  escalate_after: 72  # hours
```

Tom will use these values when evaluating conditions.

### Custom Labels

Tom can create labels that don't exist:

```markdown
## Actions
1. Add labels: "solo-maintainer", "help-wanted", "good-first-issue"
```

## Examples in Action

See the individual process files for:
- Detailed explanations
- Example scenarios
- Expected outputs
- Customization options

## Contributing

Have a useful process definition? Consider contributing it back:
1. Test it thoroughly on your repository
2. Document configuration options
3. Add examples of expected behavior
4. Submit a PR with the new process definition

## Learn More

- [Smykowski Documentation](../README.md)
- [Process Executor Implementation](../src/lib/workflows/process-executor.ts)
- [GitHub Webhooks Documentation](https://docs.github.com/webhooks)
