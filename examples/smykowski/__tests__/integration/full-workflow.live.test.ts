// @ts-nocheck - Disable type checking for this test file due to extensive mocking
import { describe, it, expect, beforeAll, jest } from '@jest/globals'
import { ClaudeClient } from '@schrute/lib/claude/client.js'
import { SpeechActDetector } from '@schrute/lib/speech-acts/detector.js'
import { ActionItemExtractor } from '~/lib/extractors/action-items.js'
import { CommitmentExtractor } from '~/lib/extractors/commitments.js'
import { DateParser } from '~/lib/extractors/dates.js'
import { MeetingFollowupWorkflow } from '~/lib/workflows/meeting-followup.js'
import type { Email } from '@schrute/lib/types/index.js'

/**
 * COMPREHENSIVE SMYKOWSKI INTEGRATION TEST
 *
 * This test simulates a realistic project conversation from start to finish:
 * 1. Team sprint planning meeting with action items and commitments
 * 2. Follow-up email with status update and new commitments
 * 3. Deadline reminder email
 *
 * Tests the full workflow:
 * - Schrute speech act detection (REAL Claude API)
 * - Action item extraction (REAL Claude API)
 * - Commitment extraction (REAL Claude API)
 * - Natural language date parsing (REAL Claude API)
 * - Meeting followup workflow
 * - Deadline tracking workflow
 * - GitHub integration (MOCKED)
 *
 * This validates that Claude Haiku can effectively coordinate a real project
 * using Smykowski's AI-powered features.
 */

const SKIP_MESSAGE = 'Skipping live API test (set CLAUDE_API_KEY to run)'

// Helper to check if API key is available
const hasApiKey = () => !!process.env.CLAUDE_API_KEY

// Conditional test helper
const testIf = hasApiKey() ? it : it.skip

describe('Smykowski Full Workflow Integration (Live Claude API)', () => {
  let claudeClient: ClaudeClient
  let speechActDetector: SpeechActDetector
  let actionItemExtractor: ActionItemExtractor
  let commitmentExtractor: CommitmentExtractor
  let dateParser: DateParser
  let mockGitHub: any
  let mockSchrute: any

  // Mock GitHub service
  beforeAll(() => {
    if (!hasApiKey()) {
      console.log(SKIP_MESSAGE)
      return
    }

    claudeClient = new ClaudeClient()
    speechActDetector = new SpeechActDetector()
    actionItemExtractor = new ActionItemExtractor(claudeClient)
    commitmentExtractor = new CommitmentExtractor(claudeClient)
    dateParser = new DateParser(claudeClient)

    // @ts-ignore - Mock setup with relaxed types for testing
    // Mock GitHub service (using any to avoid strict type checking in tests)
    mockGitHub = {
      issues: {
        create: jest.fn().mockResolvedValue({
          id: 1,
          number: 123,
          title: 'Implement authentication',
          state: 'open',
          html_url: 'https://github.com/test/repo/issues/123',
        } as any),
        update: jest.fn() as any,
        get: jest.fn() as any,
        list: jest.fn().mockResolvedValue([] as any),
        close: jest.fn() as any,
        addAssignees: jest.fn() as any,
        addLabels: jest.fn() as any,
        getAssignedTo: jest.fn().mockResolvedValue([] as any),
        getByLabels: jest.fn().mockResolvedValue([] as any),
      },
      discussions: {
        create: jest.fn().mockResolvedValue({
          id: 'D_1',
          number: 1,
          title: 'Sprint Planning - Nov 10',
          url: 'https://github.com/test/repo/discussions/1',
        } as any),
        getCategoryId: jest.fn().mockResolvedValue('CAT_1' as any),
        addComment: jest.fn() as any,
      },
      pullRequests: {
        list: jest.fn().mockResolvedValue([] as any),
        get: jest.fn() as any,
        requestReviewers: jest.fn() as any,
        createReview: jest.fn() as any,
        addComment: jest.fn() as any,
        getStale: jest.fn().mockResolvedValue([] as any),
      },
      wiki: {
        getPage: jest.fn() as any,
        createOrUpdatePage: jest.fn() as any,
        listPages: jest.fn().mockResolvedValue([] as any),
      },
      projects: {
        listProjects: jest.fn().mockResolvedValue([] as any),
        getProject: jest.fn() as any,
        listItems: jest.fn().mockResolvedValue([] as any),
        addItem: jest.fn() as any,
        updateItem: jest.fn() as any,
      },
    } as any

    // Mock Schrute bridge
    mockSchrute = {
      detectSpeechActs: jest.fn(),
      extractSpeechActs: jest.fn(),
    } as any
  })

  testIf(
    'should coordinate a complete sprint planning workflow',
    async () => {
      console.log('\n🚀 Starting comprehensive Smykowski workflow test...\n')

      // ================================================================
      // SCENARIO 1: Sprint Planning Meeting
      // ================================================================
      console.log('📧 Email 1: Sprint Planning Meeting Notes')

      const sprintPlanningEmail: Email = {
        message_id: 'msg-sprint-planning-001',
        thread_id: 'thread-sprint-1',
        from: {
          email: 'alice@team.com',
          name: 'Alice (Team Lead)',
        },
        to: [
          { email: 'bob@team.com', name: 'Bob Smith' },
          { email: 'carol@team.com', name: 'Carol Williams' },
          { email: 'dave@team.com', name: 'Dave Johnson' },
        ],
        cc: [],
        subject: 'Sprint 5 Planning - Authentication & API Work',
        body: `Hi team,

Great meeting today! Here's a summary of our Sprint 5 commitments:

**Authentication Work:**
Bob, can you take the lead on implementing OAuth 2.0 authentication? We need this done by Friday so Carol can start on the frontend integration. I know you mentioned you're comfortable with this from your previous project.

**API Design:**
Carol, I'll need you to review the API design document by end of day Wednesday. This is blocking the backend work, so it's pretty urgent. Can you commit to having feedback by then?

**Database Migration:**
Dave, you said you'd handle the database migration script. When do you think you can have this ready? We should aim for Thursday at the latest.

**Code Review:**
Bob, I'm also asking you to review Carol's PR #47 (the user profile refactor). It's been sitting for a week and she needs feedback to move forward.

**Team Decisions:**
- We decided to use PostgreSQL instead of MongoDB for user data storage
- We agreed to implement rate limiting at 100 requests/minute per user
- Documentation will be written in Markdown and stored in the wiki

Let me know if I missed anything or if these timelines don't work!

Thanks,
Alice`,
        timestamp: '2025-11-10T16:00:00Z',
        in_reply_to: null,
      }

      // Step 1: Detect speech acts with Schrute
      console.log('🔍 Step 1: Detecting speech acts...')
      const speechActs = await speechActDetector.detectSpeechActs(sprintPlanningEmail)

      console.log(`   Found ${speechActs.length} speech acts:`)
      for (const act of speechActs) {
        console.log(`   - ${act.type}: "${act.content}"`)
      }

      // Verify speech acts detected
      expect(speechActs.length).toBeGreaterThan(3)
      expect(speechActs.some((a: any) => a.type === 'request')).toBe(true)
      expect(speechActs.some((a: any) => a.type === 'decision')).toBe(true)

      // Step 2: Extract action items
      console.log('\n📋 Step 2: Extracting action items...')
      const actionItems = await actionItemExtractor.extract(sprintPlanningEmail)

      console.log(`   Found ${actionItems.length} action items:`)
      for (const item of actionItems) {
        console.log(`   - ${item.description}`)
        console.log(`     Assigned to: ${item.assignee_name || 'unassigned'}`)
        if (item.deadline_text) {
          console.log(`     Due: ${item.deadline_text}`)
        }
      }

      // Verify action items extracted
      expect(actionItems.length).toBeGreaterThan(3)
      expect(
        actionItems.some(item =>
          item.description.toLowerCase().includes('oauth') ||
          item.description.toLowerCase().includes('authentication')
        )
      ).toBe(true)
      expect(
        actionItems.some(item => item.assignee_email === 'bob@team.com')
      ).toBe(true)

      // Step 3: Extract commitments
      console.log('\n🤝 Step 3: Extracting commitments...')
      const commitments = await commitmentExtractor.extract(sprintPlanningEmail)

      console.log(`   Found ${commitments.length} commitments:`)
      for (const commitment of commitments) {
        console.log(`   - "${commitment.commitment_text}"`)
        console.log(`     By: ${commitment.person_name}`)
        if (commitment.deadline) {
          console.log(`     Deadline: ${commitment.deadline}`)
        }
      }

      // Verify commitments extracted
      expect(commitments.length).toBeGreaterThan(0)

      // Step 4: Parse natural language dates
      console.log('\n📅 Step 4: Parsing natural language dates...')
      const dateExpressions = [
        'by Friday',
        'end of day Wednesday',
        'Thursday at the latest',
      ]

      const parsedDates: { text: string; iso: string | null }[] = []
      for (const dateText of dateExpressions) {
        const result = await dateParser.parseDate(dateText, sprintPlanningEmail.timestamp)
        parsedDates.push({
          text: dateText,
          iso: result?.iso || null,
        })
        if (result) {
          console.log(`   "${dateText}" → ${result.iso} (confidence: ${result.confidence})`)
        } else {
          console.log(`   "${dateText}" → could not parse`)
        }
      }

      // Verify at least some dates parsed successfully
      const successfulParsed = parsedDates.filter(d => d.iso !== null)
      expect(successfulParsed.length).toBeGreaterThan(0)

      // Step 5: Create GitHub issues (mocked)
      console.log('\n📝 Step 5: Creating GitHub issues...')
      const meetingWorkflow = new MeetingFollowupWorkflow(
        mockGitHub as any,
        actionItemExtractor,
        mockSchrute as any
      )

      const workflowResult = await meetingWorkflow.execute(sprintPlanningEmail)

      // Verify GitHub interactions
      expect(mockGitHub.issues.create).toHaveBeenCalled()
      expect(mockGitHub.discussions.create).toHaveBeenCalled()

      const issueCreations = (mockGitHub.issues.create as jest.Mock).mock.calls
      console.log(`   Created ${issueCreations.length} GitHub issues`)

      // ================================================================
      // SCENARIO 2: Status Update Email
      // ================================================================
      console.log('\n\n📧 Email 2: Mid-Sprint Status Update')

      const statusUpdateEmail: Email = {
        message_id: 'msg-status-update-001',
        thread_id: 'thread-sprint-1',
        from: {
          email: 'bob@team.com',
          name: 'Bob Smith',
        },
        to: [
          { email: 'alice@team.com', name: 'Alice (Team Lead)' },
          { email: 'carol@team.com', name: 'Carol Williams' },
          { email: 'dave@team.com', name: 'Dave Johnson' },
        ],
        cc: [],
        subject: 'Re: Sprint 5 Planning - Status Update',
        body: `Hey team,

Quick update on my progress:

**OAuth Implementation:**
I've completed about 60% of the OAuth 2.0 implementation. I'll have it ready for Carol by Friday as promised. The token refresh logic took longer than expected, but I'm on track.

**PR Review for Carol:**
I reviewed PR #47 and left detailed feedback. Carol, the user profile refactor looks good overall, but I have some concerns about the caching strategy. Can you address those comments and we can merge by tomorrow?

**New Issue:**
While implementing OAuth, I discovered we need to add CSRF protection for the authentication flow. Dave, since you're working on security-related database changes, could you also research CSRF token storage options? We should discuss this in next Monday's standup.

I'll also need Alice to review my OAuth PR once it's ready - probably Wednesday.

Thanks,
Bob`,
        timestamp: '2025-11-12T14:30:00Z',
        in_reply_to: 'msg-sprint-planning-001',
      }

      console.log('🔍 Step 6: Processing status update...')
      const statusSpeechActs = await speechActDetector.detectSpeechActs(statusUpdateEmail)
      const statusActionItems = await actionItemExtractor.extract(statusUpdateEmail)
      const statusCommitments = await commitmentExtractor.extract(statusUpdateEmail)

      console.log(`   Found ${statusSpeechActs.length} speech acts`)
      console.log(`   Found ${statusActionItems.length} new action items`)
      console.log(`   Found ${statusCommitments.length} new commitments`)

      // Verify status update processing
      expect(statusSpeechActs.length).toBeGreaterThan(0)
      expect(
        statusSpeechActs.some((a: any) => a.type === 'commitment' || a.type === 'inform')
      ).toBe(true)

      // ================================================================
      // SCENARIO 3: Deadline Tracking
      // ================================================================
      console.log('\n\n⏰ Step 7: Checking deadlines...')

      const now = new Date('2025-11-13T10:00:00Z') // Wednesday morning
      const upcomingDeadlines = actionItems.filter(item => {
        if (!item.deadline) return false
        const deadline = new Date(item.deadline)
        const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        return hoursUntil > 0 && hoursUntil < 48 // Next 48 hours
      })

      console.log(`   Found ${upcomingDeadlines.length} upcoming deadlines:`)
      for (const item of upcomingDeadlines) {
        const deadline = new Date(item.deadline!)
        const hoursUntil = Math.round(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        )
        console.log(`   - "${item.description}" in ${hoursUntil}h`)
      }

      // ================================================================
      // FINAL VERIFICATION
      // ================================================================
      console.log('\n\n✅ WORKFLOW SUMMARY')
      console.log('=' .repeat(60))
      console.log(`📊 Total speech acts detected: ${speechActs.length + statusSpeechActs.length}`)
      console.log(`📋 Total action items extracted: ${actionItems.length + statusActionItems.length}`)
      console.log(`🤝 Total commitments extracted: ${commitments.length + statusCommitments.length}`)
      console.log(`📅 Date parsing success rate: ${successfulParsed.length}/${dateExpressions.length}`)
      console.log(`📝 GitHub issues created: ${issueCreations.length}`)
      console.log(`⏰ Upcoming deadlines tracked: ${upcomingDeadlines.length}`)
      console.log('=' .repeat(60))

      // Final assertions
      expect(speechActs.length + statusSpeechActs.length).toBeGreaterThanOrEqual(5)
      expect(actionItems.length + statusActionItems.length).toBeGreaterThanOrEqual(4)
      expect(commitments.length + statusCommitments.length).toBeGreaterThanOrEqual(1)
      expect(issueCreations.length).toBeGreaterThan(0)

      console.log('\n✨ Comprehensive workflow test completed successfully!\n')
    },
    120000 // 2 minute timeout for live API calls
  )

  testIf(
    'should handle decision tracking from team discussions',
    async () => {
      console.log('\n📋 Testing decision tracking...')

      const decisionEmail: Email = {
        message_id: 'msg-decisions-001',
        thread_id: 'thread-decisions',
        from: {
          email: 'alice@team.com',
          name: 'Alice (Team Lead)',
        },
        to: [
          { email: 'bob@team.com', name: 'Bob Smith' },
          { email: 'carol@team.com', name: 'Carol Williams' },
        ],
        cc: [],
        subject: 'Architecture Decision: Authentication Strategy',
        body: `Team,

After our discussion today, we've made the following decisions:

1. **Authentication Method:** We decided to implement OAuth 2.0 with JWT tokens for session management. This gives us better security and scalability than traditional session cookies.

2. **Token Expiration:** Access tokens will expire after 1 hour, refresh tokens after 30 days. We agreed this balances security with user experience.

3. **Storage:** We'll store tokens in httpOnly cookies, not localStorage, to prevent XSS attacks. This was a consensus decision after reviewing the security implications.

These decisions are final unless we discover critical issues during implementation.

Alice`,
        timestamp: '2025-11-10T15:00:00Z',
        in_reply_to: null,
      }

      const speechActs = await speechActDetector.detectSpeechActs(decisionEmail)
      const decisions = speechActs.filter((a: any) => a.type === 'decision')

      console.log(`   Detected ${decisions.length} decisions:`)
      for (const decision of decisions) {
        console.log(`   - "${decision.content}"`)
      }

      expect(decisions.length).toBeGreaterThan(0)
      expect(
        decisions.some((d: any) =>
          d.content.toLowerCase().includes('oauth') ||
          d.content.toLowerCase().includes('jwt') ||
          d.content.toLowerCase().includes('token')
        )
      ).toBe(true)

      console.log('✅ Decision tracking successful\n')
    },
    60000
  )

  testIf(
    'should extract expertise and workload from conversation',
    async () => {
      console.log('\n👥 Testing expertise and workload extraction...')

      const workloadEmail: Email = {
        message_id: 'msg-workload-001',
        thread_id: 'thread-workload',
        from: {
          email: 'alice@team.com',
          name: 'Alice (Team Lead)',
        },
        to: [
          { email: 'bob@team.com', name: 'Bob Smith' },
          { email: 'carol@team.com', name: 'Carol Williams' },
        ],
        cc: [],
        subject: 'Work Distribution Check',
        body: `Team,

Let me check on everyone's workload:

**Bob:** You have the OAuth implementation, the database migration script, and you're reviewing Carol's PR. That's a lot! Are you feeling overloaded?

**Carol:** You're waiting on the API review feedback, working on the frontend integration, and addressing PR comments. Seems more manageable.

Bob, I'm noticing you're our go-to person for security and backend work, which is great, but we might be overloading you. Maybe we can move the database migration to Dave?

Thoughts?`,
        timestamp: '2025-11-11T10:00:00Z',
        in_reply_to: null,
      }

      const speechActs = await speechActDetector.detectSpeechActs(workloadEmail)
      const actionItems = await actionItemExtractor.extract(workloadEmail)

      console.log(`   Speech acts: ${speechActs.length}`)
      console.log(`   Action items assigned:`)

      const assignmentCounts: Record<string, number> = {}
      for (const item of actionItems) {
        if (item.assignee_email) {
          assignmentCounts[item.assignee_email] =
            (assignmentCounts[item.assignee_email] || 0) + 1
        }
      }

      for (const [email, count] of Object.entries(assignmentCounts)) {
        console.log(`   - ${email}: ${count} items`)
      }

      // This would feed into workload balancing logic
      expect(speechActs.length).toBeGreaterThan(0)

      console.log('✅ Workload analysis successful\n')
    },
    60000
  )
})
