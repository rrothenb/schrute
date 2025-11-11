---
process_id: auto-label-new-issues
enabled: true
repo: your-org/your-repo
---

# Process: Auto-Label New Issues

## Purpose
Automatically classify and label new issues to help with triage and organization.

## Trigger
**When:** A new issue is created
**Event:** `issues.opened`

## Actions

1. **Classify the issue** using LLM analysis
   - Determine issue type (bug, feature-request, documentation, question, etc.)
   - Suggest appropriate labels
   - Only apply labels if confidence is high (>= 80%)

## Configuration

```yaml
confidence_threshold: 0.8
exclude_bots: true
```

## How It Works

When a new issue is opened, Tom will:
1. Read the issue title and body
2. Use AI to classify the issue into a category
3. Suggest relevant labels based on content
4. Automatically apply labels if confidence is high enough
5. Skip labeling if confidence is too low (human review needed)

## Example

**Issue:** "App crashes when clicking the submit button"

**Tom's Classification:**
- Category: `bug`
- Additional labels: `needs-triage`, `ui`
- Confidence: 0.92 ✓ (high enough to auto-label)

**Result:** Issue automatically labeled with `bug`, `needs-triage`, `ui`

## Benefits

- **Saves time**: No manual triage needed for obvious issues
- **Consistency**: Uses same classification logic for all issues
- **Transparency**: Low-confidence classifications skip auto-labeling
- **Adaptable**: Learns project-specific label patterns over time

## Customization

You can adjust the confidence threshold in the configuration:
- Lower threshold (e.g., 0.6): More aggressive auto-labeling
- Higher threshold (e.g., 0.9): Only label when very certain
- Default: 0.8 (good balance)
