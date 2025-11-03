#!/usr/bin/env node

import 'dotenv/config'
import { createInterface } from 'readline'
import { resolve } from 'path'
import { loadEmailsFromYaml, buildThreads } from '~/lib/email/index.js'
import { createSpeechActDetector, createSpeechActStore } from '~/lib/speech-acts/index.js'
import { createPrivacyTracker } from '~/lib/privacy/index.js'
import { createQueryHandler } from '~/lib/query/index.js'
import { createPersonalityLoader } from '~/lib/personality/index.js'
import { createActivationDecider } from '~/lib/activation/index.js'
import {
  Email,
  EmailThread,
  SpeechActType,
  SchruteConfig,
  PersonalityConfig,
} from '~/lib/types/index.js'

class SchruteCLI {
  private emails: Email[] = []
  private threads: EmailThread[] = []
  private speechActDetector = createSpeechActDetector()
  private speechActStore = createSpeechActStore()
  private privacyTracker = createPrivacyTracker()
  private queryHandler = createQueryHandler()
  private personalityLoader = createPersonalityLoader()
  private activationDecider = createActivationDecider()
  private currentPersonality: PersonalityConfig | null = null
  private schruteConfig: SchruteConfig = {
    name: 'Schrute',
    aliases: ['schrute'],
    email: { email: 'schrute@company.com', name: 'Schrute' },
    personality: 'default',
    areas_of_responsibility: [
      'tracking decisions',
      'tracking commitments',
      'coordinating meetings',
      'answering questions about email history',
    ],
    expertise_keywords: ['decision', 'commitment', 'meeting', 'schedule', 'tracking'],
  }

  async initialize() {
    console.log('🤖 Schrute - AI Coordination Assistant')
    console.log('=====================================\n')

    // Load personalities
    try {
      const personalitiesDir = resolve(process.cwd(), 'personalities')
      await this.personalityLoader.loadFromDirectory(personalitiesDir)
      this.currentPersonality = this.personalityLoader.getDefault()
      console.log(
        `Loaded personalities: ${this.personalityLoader.getAvailablePersonalities().join(', ')}`
      )
      console.log(`Current personality: ${this.currentPersonality.name}\n`)
    } catch (error) {
      console.warn('Warning: Could not load personalities:', error)
    }

    this.showHelp()
  }

  showHelp() {
    console.log('Commands:')
    console.log('  load <file>         - Load and process email YAML file')
    console.log('  query <question>    - Ask a question about the emails')
    console.log('  acts [type]         - List speech acts (optional: filter by type)')
    console.log('  threads             - Show email threads')
    console.log('  personality <name>  - Switch personality')
    console.log('  personalities       - List available personalities')
    console.log('  status              - Show current status')
    console.log('  help                - Show this help')
    console.log('  exit                - Exit the CLI')
    console.log()
  }

  async handleCommand(input: string) {
    const parts = input.trim().split(' ')
    const command = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')

    try {
      switch (command) {
        case 'load':
          await this.loadEmails(args)
          break
        case 'query':
          await this.handleQuery(args)
          break
        case 'acts':
          this.showSpeechActs(args)
          break
        case 'threads':
          this.showThreads()
          break
        case 'personality':
          this.switchPersonality(args)
          break
        case 'personalities':
          this.listPersonalities()
          break
        case 'status':
          this.showStatus()
          break
        case 'help':
          this.showHelp()
          break
        case 'exit':
          console.log('Goodbye!')
          process.exit(0)
          break
        default:
          console.log(`Unknown command: ${command}. Type 'help' for available commands.`)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
    }

    console.log() // Empty line after each command
  }

  async loadEmails(filePath: string) {
    if (!filePath) {
      console.log('Usage: load <file>')
      return
    }

    const resolvedPath = resolve(process.cwd(), filePath)
    console.log(`Loading emails from ${resolvedPath}...`)

    this.emails = await loadEmailsFromYaml(resolvedPath)
    this.threads = buildThreads(this.emails)

    console.log(`✓ Loaded ${this.emails.length} emails in ${this.threads.length} thread(s)`)

    // Track emails for privacy
    this.privacyTracker.trackEmails(this.emails)

    // Detect speech acts
    console.log('Detecting speech acts...')
    const acts = await this.speechActDetector.detectSpeechActsBatch(this.emails)
    this.speechActStore.addMany(acts)
    this.privacyTracker.trackSpeechActs(acts)

    console.log(`✓ Detected ${acts.length} speech acts`)

    // Check activation for each email
    console.log('Checking activation decisions...')
    const threadMap = new Map(this.threads.map((t) => [t.thread_id, t]))
    const decisions = await this.activationDecider.shouldRespondBatch(
      this.emails,
      this.schruteConfig,
      threadMap
    )

    const shouldRespond = Array.from(decisions.values()).filter((d) => d.should_respond).length
    console.log(`✓ Schrute should respond to ${shouldRespond}/${this.emails.length} emails`)
  }

  async handleQuery(question: string) {
    if (!question) {
      console.log('Usage: query <question>')
      return
    }

    if (this.emails.length === 0) {
      console.log('No emails loaded. Use "load <file>" first.')
      return
    }

    console.log(`Query: ${question}`)
    console.log('Processing...\n')

    const response = await this.queryHandler.handleQuery(
      {
        query: question,
        asker: this.schruteConfig.email,
        context_participants: this.privacyTracker.getAllParticipants(),
      },
      {
        emails: this.emails,
        speechActs: this.speechActStore.getAll(),
        privacyTracker: this.privacyTracker,
        personality: this.currentPersonality || undefined,
      }
    )

    console.log('Answer:')
    console.log(response.answer)

    if (response.privacy_restricted && response.restricted_info) {
      console.log(`\n⚠️  ${response.restricted_info}`)
    }
  }

  showSpeechActs(typeFilter?: string) {
    if (this.speechActStore.count() === 0) {
      console.log('No speech acts detected. Load emails first.')
      return
    }

    let acts = this.speechActStore.getAll()

    if (typeFilter) {
      const type = typeFilter.toUpperCase()
      if (type in SpeechActType) {
        acts = this.speechActStore.getByType(SpeechActType[type as keyof typeof SpeechActType])
        console.log(`Speech Acts (${type}):`)
      } else {
        console.log(`Unknown speech act type: ${typeFilter}`)
        console.log(
          `Valid types: ${Object.keys(SpeechActType).join(', ')}`
        )
        return
      }
    } else {
      console.log('All Speech Acts:')
    }

    console.log()

    for (const act of acts.slice(0, 20)) {
      // Limit to 20
      console.log(`[${act.type}] ${act.content}`)
      console.log(`  By: ${act.actor.name || act.actor.email}`)
      console.log(`  When: ${act.timestamp}`)
      console.log(`  Confidence: ${(act.confidence * 100).toFixed(0)}%`)
      console.log()
    }

    if (acts.length > 20) {
      console.log(`... and ${acts.length - 20} more`)
    }
  }

  showThreads() {
    if (this.threads.length === 0) {
      console.log('No threads loaded. Load emails first.')
      return
    }

    console.log('Email Threads:')
    console.log()

    for (const thread of this.threads) {
      console.log(`Thread: ${thread.subject}`)
      console.log(`  ID: ${thread.thread_id}`)
      console.log(`  Messages: ${thread.messages.length}`)
      console.log(`  Participants: ${thread.participants.map((p) => p.name || p.email).join(', ')}`)
      console.log()
    }
  }

  switchPersonality(name: string) {
    if (!name) {
      console.log('Usage: personality <name>')
      console.log(`Available: ${this.personalityLoader.getAvailablePersonalities().join(', ')}`)
      return
    }

    const personality = this.personalityLoader.get(name)
    if (!personality) {
      console.log(`Personality "${name}" not found.`)
      console.log(`Available: ${this.personalityLoader.getAvailablePersonalities().join(', ')}`)
      return
    }

    this.currentPersonality = personality
    console.log(`✓ Switched to personality: ${personality.name}`)
    console.log(`  Tone: ${personality.tone}`)
    console.log(`  Style: ${personality.speaking_style}`)
  }

  listPersonalities() {
    const personalities = this.personalityLoader.getAvailablePersonalities()
    console.log('Available Personalities:')
    console.log()

    for (const name of personalities) {
      const p = this.personalityLoader.get(name)
      if (p) {
        console.log(`${name}${name === this.currentPersonality?.name ? ' (current)' : ''}`)
        if (p.description) {
          console.log(`  ${p.description}`)
        }
        console.log()
      }
    }
  }

  showStatus() {
    console.log('Current Status:')
    console.log(`  Emails loaded: ${this.emails.length}`)
    console.log(`  Threads: ${this.threads.length}`)
    console.log(`  Speech acts detected: ${this.speechActStore.count()}`)
    console.log(`  Participants tracked: ${this.privacyTracker.getAllParticipants().length}`)
    console.log(`  Current personality: ${this.currentPersonality?.name || 'none'}`)
    console.log()
    console.log('Schrute Config:')
    console.log(`  Name: ${this.schruteConfig.name}`)
    console.log(`  Email: ${this.schruteConfig.email.email}`)
    console.log(
      `  Responsibilities: ${this.schruteConfig.areas_of_responsibility?.join(', ') || 'none'}`
    )
  }

  async start() {
    await this.initialize()

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'schrute> ',
    })

    rl.prompt()

    rl.on('line', async (line) => {
      const input = line.trim()
      if (input) {
        await this.handleCommand(input)
      }
      rl.prompt()
    })

    rl.on('close', () => {
      console.log('\nGoodbye!')
      process.exit(0)
    })
  }
}

// Start the CLI
const cli = new SchruteCLI()
cli.start().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
