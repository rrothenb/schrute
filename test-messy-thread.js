#!/usr/bin/env node

/**
 * Quick validation test for messy realistic email thread
 * Tests parsing, speech act detection, and basic queries
 */

import 'dotenv/config'
import { resolve } from 'path'
import { loadEmailsFromYaml, buildThreads } from './dist/lib/email/index.js'
import { createSpeechActDetector, createSpeechActStore } from './dist/lib/speech-acts/index.js'
import { createPrivacyTracker } from './dist/lib/privacy/index.js'
import { createQueryHandler } from './dist/lib/query/index.js'

const MESSY_THREAD = resolve(process.cwd(), 'events/thread-messy-realistic.yaml')

async function runTests() {
  console.log('🧪 Testing Messy Realistic Email Thread\n')
  console.log('=' .repeat(60))

  // Test 1: Load and parse emails
  console.log('\n📧 TEST 1: Email Parsing & Threading\n')

  const emails = await loadEmailsFromYaml(MESSY_THREAD)
  console.log(`✅ Loaded ${emails.length} emails`)

  if (emails.length !== 12) {
    console.log(`❌ Expected 12 emails, got ${emails.length}`)
  }

  const threads = buildThreads(emails)
  console.log(`✅ Built ${threads.length} thread(s)`)

  if (threads.length !== 1) {
    console.log(`❌ Expected 1 thread, got ${threads.length}`)
  }

  const thread = threads[0]
  console.log(`   Thread ID: ${thread.thread_id}`)
  console.log(`   Subject: ${thread.subject}`)
  console.log(`   Messages: ${thread.messages.length}`)
  console.log(`   Participants: ${thread.participants.map(p => p.name).join(', ')}`)

  // Test 2: Speech act detection
  console.log('\n🎯 TEST 2: Speech Act Detection\n')
  console.log('   (This will take ~30-60 seconds with Claude API...)\n')

  const detector = createSpeechActDetector()
  const store = createSpeechActStore()
  const privacyTracker = createPrivacyTracker()

  // Track participants
  for (const email of emails) {
    privacyTracker.trackEmail(email)
  }

  // Detect speech acts
  let detectedCount = 0
  for (const email of emails) {
    const acts = await detector.detectFromEmail(email)
    for (const act of acts) {
      store.add(act)
    }
    detectedCount += acts.length
    process.stdout.write(`   Processed ${store.count()} speech acts from ${emails.indexOf(email) + 1}/${emails.length} emails\r`)
  }
  console.log(`\n✅ Detected ${store.count()} total speech acts\n`)

  // Show breakdown by type
  const commitments = store.getByType('commitment')
  const decisions = store.getByType('decision')
  const requests = store.getByType('request')
  const questions = store.getByType('question')

  console.log(`   Commitments: ${commitments.length}`)
  console.log(`   Decisions: ${decisions.length}`)
  console.log(`   Requests: ${requests.length}`)
  console.log(`   Questions: ${questions.length}`)

  // Show some examples
  console.log('\n   Sample Commitments:')
  commitments.slice(0, 3).forEach(c => {
    console.log(`   - ${c.content} (${c.actor.name})`)
  })

  console.log('\n   Sample Decisions:')
  decisions.slice(0, 3).forEach(d => {
    console.log(`   - ${d.content} (${d.actor.name})`)
  })

  // Test 3: Basic queries
  console.log('\n❓ TEST 3: Basic Queries\n')
  console.log('   (Each query takes ~5-10 seconds with Claude API...)\n')

  const queryHandler = createQueryHandler()
  const schruteEmail = { email: 'schrute@company.com', name: 'Schrute' }
  const allParticipants = privacyTracker.getAllParticipants()

  // Query 1: Vendor decision
  console.log('   Query 1: "What vendor did we choose and why?"\n')
  const q1 = await queryHandler.handleQuery(
    {
      query: 'What vendor did we choose and why?',
      asker: schruteEmail,
      context_participants: allParticipants,
    },
    {
      emails,
      speechActs: store.getAll(),
      privacyTracker,
    }
  )
  console.log(`   Answer: ${q1.answer.substring(0, 200)}...\n`)

  // Query 2: Bobby's commitments
  console.log('   Query 2: "What did Bobby commit to?"\n')
  const q2 = await queryHandler.handleQuery(
    {
      query: 'What did Bobby commit to?',
      asker: schruteEmail,
      context_participants: allParticipants,
    },
    {
      emails,
      speechActs: store.getAll(),
      privacyTracker,
    }
  )
  console.log(`   Answer: ${q2.answer.substring(0, 200)}...\n`)

  // Query 3: Timeline compression
  console.log('   Query 3: "What happened with the timeline compression proposal?"\n')
  const q3 = await queryHandler.handleQuery(
    {
      query: 'What happened with the timeline compression proposal?',
      asker: schruteEmail,
      context_participants: allParticipants,
    },
    {
      emails,
      speechActs: store.getAll(),
      privacyTracker,
    }
  )
  console.log(`   Answer: ${q3.answer.substring(0, 200)}...\n`)

  // Query 4: Carol mention (not on thread)
  console.log('   Query 4: "What did Carol say about cloud migration?"\n')
  const q4 = await queryHandler.handleQuery(
    {
      query: 'What did Carol say about cloud migration?',
      asker: schruteEmail,
      context_participants: allParticipants,
    },
    {
      emails,
      speechActs: store.getAll(),
      privacyTracker,
    }
  )
  console.log(`   Answer: ${q4.answer.substring(0, 200)}...\n`)

  console.log('=' .repeat(60))
  console.log('\n✅ All tests completed!\n')
  console.log('Review the output above to validate:')
  console.log('  - All 12 emails parsed correctly')
  console.log('  - Speech acts detected across multiple types')
  console.log('  - Queries answered with relevant information')
  console.log('  - Nickname resolution (Bobby = Bob Smith)')
  console.log('  - Handling of non-participant mentions (Carol)\n')
}

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set. Please set it in .env file.')
  process.exit(1)
}

runTests().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
