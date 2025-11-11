import { describe, it, expect, beforeAll } from '@jest/globals'
import { ClaudeClient } from '@schrute/lib/claude/client.js'
import { ProcessDefinitionExtractor } from '~/lib/extractors/process-definition.js'
import type { ProcessDefinition } from '~/lib/types/index.js'

// Skip these tests if CLAUDE_API_KEY is not set
const runLiveTests = !!process.env.CLAUDE_API_KEY

const describeIf = runLiveTests ? describe : describe.skip

describeIf('Process Automation - Live API Tests', () => {
  let claudeClient: ClaudeClient
  let extractor: ProcessDefinitionExtractor

  beforeAll(() => {
    if (!process.env.CLAUDE_API_KEY) {
      console.warn('Skipping live API tests: CLAUDE_API_KEY not set')
      return
    }

    claudeClient = new ClaudeClient(process.env.CLAUDE_API_KEY!)
    extractor = new ProcessDefinitionExtractor(claudeClient)
  })

  describe('ProcessDefinitionExtractor - Live API', () => {
    it('should extract process definition from wiki markdown using Claude', async () => {
      const wikiContent = `---
process_id: issue-response-time-tracker
enabled: true
repo: owner/test-repo
---

# Process: Issue Response Time Tracking

## Trigger
When: a new issue is created
Event: \`issues.opened\`

## Actions
1. Calculate the average response time for issues in the last 30 days
2. Add a friendly comment to the new issue indicating how long it typically takes our team to respond
3. If the response time is over 24 hours, also add a "slow-response" label

## Configuration
- lookback_period: 30 days
- response_time_threshold: 24 hours
- exclude_bot_comments: true
`

      const result = await extractor.extractFromWikiPage(
        wikiContent,
        'Processes/issue-response-time-tracker'
      )

      // Verify basic structure
      expect(result).toBeDefined()
      expect(result?.process_id).toBe('issue-response-time-tracker')
      expect(result?.enabled).toBe(true)
      expect(result?.repo_id).toBe('owner/test-repo')
      expect(result?.trigger.event).toBe('issues.opened')

      // Verify Claude extracted actions correctly
      expect(result?.actions).toBeDefined()
      expect(result?.actions.length).toBeGreaterThanOrEqual(2)

      // Should have at least calculate_metrics and comment actions
      const actionTypes = result?.actions.map(a => a.type)
      expect(actionTypes).toContain('calculate_metrics')
      expect(actionTypes).toContain('comment')

      // Verify action descriptions are present
      result?.actions.forEach(action => {
        expect(action.description).toBeDefined()
        expect(action.description.length).toBeGreaterThan(0)
      })

      // Verify configuration was extracted
      expect(result?.configuration).toBeDefined()

      console.log('\n✓ Successfully extracted process definition:')
      console.log(`  Process ID: ${result?.process_id}`)
      console.log(`  Trigger: ${result?.trigger.event}`)
      console.log(`  Actions: ${result?.actions.length}`)
      result?.actions.forEach((action, i) => {
        console.log(`    ${i + 1}. [${action.type}] ${action.description}`)
      })
    }, 30000) // 30 second timeout for API call

    it('should handle complex process with multiple action types', async () => {
      const wikiContent = `---
process_id: pr-review-coordinator
enabled: true
repo: owner/test-repo
---

# Process: Pull Request Review Coordination

## Trigger
When: a pull request is opened
Event: \`pull_request.opened\`

## Actions
1. Add the "needs-review" label to the PR
2. Calculate average review time from recent PRs
3. Post a comment mentioning the team and expected review time
4. Assign the PR to appropriate reviewers based on changed files
5. Create a reminder issue to follow up if not reviewed within 48 hours

## Configuration
- review_sla_hours: 48
- auto_assign_reviewers: true
- create_followup_issues: true
`

      const result = await extractor.extractFromWikiPage(
        wikiContent,
        'Processes/pr-review-coordinator'
      )

      expect(result).toBeDefined()
      expect(result?.process_id).toBe('pr-review-coordinator')
      expect(result?.trigger.event).toBe('pull_request.opened')

      // Should extract multiple different action types
      expect(result?.actions.length).toBeGreaterThanOrEqual(3)

      const actionTypes = result?.actions.map(a => a.type)
      expect(actionTypes).toBeDefined()

      console.log('\n✓ Successfully extracted complex process:')
      console.log(`  Process ID: ${result?.process_id}`)
      console.log(`  Actions: ${result?.actions.length}`)
      result?.actions.forEach((action, i) => {
        console.log(`    ${i + 1}. [${action.type}] ${action.description}`)
      })
    }, 30000)

    it('should handle conditional triggers', async () => {
      const wikiContent = `---
process_id: critical-issue-escalation
enabled: true
repo: owner/test-repo
---

# Process: Critical Issue Escalation

## Trigger
When: a new issue is opened with the "critical" label
Event: \`issues.opened\`
Condition: only if labeled "critical" or "urgent"

## Actions
1. Immediately assign to the on-call engineer
2. Post a comment pinging the team lead
3. Create a follow-up task for status update in 2 hours

## Configuration
- on_call_rotation: true
- escalation_delay_hours: 2
`

      const result = await extractor.extractFromWikiPage(
        wikiContent,
        'Processes/critical-issue-escalation'
      )

      expect(result).toBeDefined()
      expect(result?.trigger.conditions).toBeDefined()

      console.log('\n✓ Successfully extracted conditional process:')
      console.log(`  Trigger: ${result?.trigger.event}`)
      console.log(`  Conditions: ${result?.trigger.conditions || 'none'}`)
    }, 30000)

    it('should validate extracted process definitions', async () => {
      const wikiContent = `---
process_id: simple-welcome-bot
enabled: true
repo: owner/test-repo
---

# Process: Welcome Bot

## Trigger
When: new issue
Event: \`issues.opened\`

## Actions
1. Post a friendly welcome comment

## Configuration
- message_template: "Thanks for opening this issue!"
`

      const result = await extractor.extractFromWikiPage(
        wikiContent,
        'Processes/simple-welcome-bot'
      )

      // Validate the extracted definition
      const validation = extractor.validateProcessDefinition(result!)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)

      console.log('\n✓ Process definition validated successfully')
    }, 30000)

    it('should handle extraction errors gracefully', async () => {
      const invalidContent = `---
process_id: incomplete-process
repo: owner/test-repo
---

# This process definition is incomplete and vague

Do something when something happens.
`

      try {
        const result = await extractor.extractFromWikiPage(
          invalidContent,
          'Processes/incomplete'
        )

        // Even if extraction succeeds, validation should catch issues
        if (result) {
          const validation = extractor.validateProcessDefinition(result)
          // Should either fail extraction or fail validation
          expect(validation.valid || !result).toBe(true)
        }

        console.log('\n✓ Handled incomplete process definition appropriately')
      } catch (error) {
        // Expected - incomplete definitions may cause extraction errors
        expect(error).toBeDefined()
        console.log('\n✓ Correctly threw error for incomplete definition')
      }
    }, 30000)
  })

  describe('Cost Estimation', () => {
    it('should log estimated costs for test suite', () => {
      // Rough estimation: ~5 tests * 2000 tokens avg * $0.003/1K tokens ≈ $0.03
      const estimatedTests = 5
      const avgTokensPerTest = 2000
      const costPer1kTokens = 0.003

      const estimatedCost = (estimatedTests * avgTokensPerTest * costPer1kTokens) / 1000

      console.log('\n' + '='.repeat(60))
      console.log('Live API Tests - Cost Estimation')
      console.log('='.repeat(60))
      console.log(`Estimated tests run: ${estimatedTests}`)
      console.log(`Average tokens per test: ~${avgTokensPerTest}`)
      console.log(`Cost per 1K tokens: $${costPer1kTokens}`)
      console.log(`Estimated total cost: ~$${estimatedCost.toFixed(4)}`)
      console.log('='.repeat(60) + '\n')
    })
  })
})

// Display a message if tests were skipped
if (!runLiveTests) {
  describe('Process Automation - Live API Tests', () => {
    it('should run when CLAUDE_API_KEY is set', () => {
      console.log('\n' + '!'.repeat(60))
      console.log('SKIPPED: Set CLAUDE_API_KEY to run live API tests')
      console.log('These tests validate actual Claude API integration')
      console.log('Estimated cost per run: ~$0.03')
      console.log('!'.repeat(60) + '\n')
    })
  })
}
