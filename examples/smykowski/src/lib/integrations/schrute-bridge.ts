/**
 * SchruteBridge provides Smykowski with access to Schrute's core functionality
 *
 * This module bridges Smykowski to Schrute without modifying Schrute's code.
 * It imports and uses Schrute's existing classes and provides a clean interface.
 */

import type {
  Email,
  SpeechAct,
  QueryRequest,
  QueryResponse,
  PersonalityConfig,
} from '@schrute/lib/types/index.js'
import type { SchruteBridgeContext } from '~/lib/types/index.js'

// Import Schrute core components
// Note: These imports use @schrute/* alias which maps to ../../src/*
import { SpeechActDetector } from '@schrute/lib/speech-acts/detector.js'
import { SpeechActStore } from '@schrute/lib/speech-acts/store.js'
import { PrivacyTracker } from '@schrute/lib/privacy/tracker.js'
import { QueryHandler } from '@schrute/lib/query/handler.js'
import { ContextAssembler } from '@schrute/lib/query/context-assembler.js'
import { ActivationDecider } from '@schrute/lib/activation/decider.js'
import { MemorySummarizer } from '@schrute/lib/memory/summarizer.js'
import { PersonalityLoader } from '@schrute/lib/personality/loader.js'
import { ClaudeClient } from '@schrute/lib/claude/client.js'

/**
 * Configuration for Schrute bridge
 */
export interface SchruteBridgeConfig {
  claudeApiKey: string
  personalitiesPath?: string
  contextWindowSize?: number
}

/**
 * SchruteBridge provides a clean interface to Schrute's core functionality
 */
export class SchruteBridge {
  private detector: SpeechActDetector
  private speechActStore: SpeechActStore
  private privacyTracker: PrivacyTracker
  private queryHandler: QueryHandler
  private contextAssembler: ContextAssembler
  private activationDecider: ActivationDecider
  private memorySummarizer: MemorySummarizer
  private personalityLoader: PersonalityLoader
  private claudeClient: ClaudeClient

  constructor(private config: SchruteBridgeConfig) {
    // Initialize Schrute components
    this.claudeClient = new ClaudeClient(config.claudeApiKey)
    this.detector = new SpeechActDetector(this.claudeClient)
    this.speechActStore = new SpeechActStore()
    this.privacyTracker = new PrivacyTracker()
    this.memorySummarizer = new MemorySummarizer(this.claudeClient)
    this.personalityLoader = new PersonalityLoader(
      config.personalitiesPath || 'personalities'
    )

    // Context assembler needs speech acts and privacy tracker
    this.contextAssembler = new ContextAssembler(
      this.speechActStore,
      this.privacyTracker,
      this.memorySummarizer,
      config.contextWindowSize || 10
    )

    // Query handler needs context assembler and personality
    this.queryHandler = new QueryHandler(
      this.claudeClient,
      this.contextAssembler,
      this.personalityLoader
    )

    // Activation decider
    this.activationDecider = new ActivationDecider(this.claudeClient)
  }

  /**
   * Detect speech acts in an email
   */
  async detectSpeechActs(email: Email): Promise<SpeechAct[]> {
    const speechActs = await this.detector.detect(email)

    // Store detected speech acts
    for (const act of speechActs) {
      this.speechActStore.store(act)
    }

    // Track participants for privacy
    this.privacyTracker.trackMessage(email)

    return speechActs
  }

  /**
   * Get speech acts for a thread
   */
  getSpeechActsByThread(threadId: string): SpeechAct[] {
    return this.speechActStore.getByThread(threadId)
  }

  /**
   * Get speech acts by type
   */
  getSpeechActsByType(type: string): SpeechAct[] {
    return this.speechActStore.getByType(type as any)
  }

  /**
   * Check if Schrute should respond to an email
   */
  async shouldRespond(email: Email, config: any): Promise<{
    should_respond: boolean
    confidence: number
    reasons: string[]
  }> {
    const decision = await this.activationDecider.decide(email, config)
    return decision
  }

  /**
   * Handle a query using Schrute's query system
   */
  async handleQuery(request: QueryRequest): Promise<QueryResponse> {
    return this.queryHandler.handle(request)
  }

  /**
   * Assemble context for a thread with privacy filtering
   */
  async assembleContext(
    threadId: string,
    participants: string[]
  ): Promise<SchruteBridgeContext> {
    const speechActs = this.getSpeechActsByThread(threadId)

    // Apply privacy filtering
    const filteredActs = speechActs.filter(act => {
      const allowed = this.privacyTracker.canAccess(
        act.participants.map(p => p.email),
        participants
      )
      return allowed.allowed
    })

    return {
      speech_acts: filteredActs,
      privacy_filtered: filteredActs.length < speechActs.length,
      memory_context: null, // Can be enhanced
      personality: 'tom-smykowski',
    }
  }

  /**
   * Load a personality configuration
   */
  async loadPersonality(name: string): Promise<PersonalityConfig> {
    return this.personalityLoader.load(name)
  }

  /**
   * Generate a response using Claude with personality
   */
  async generateResponse(
    prompt: string,
    personality: string
  ): Promise<string> {
    const personalityConfig = await this.loadPersonality(personality)

    // Build system prompt with personality
    let systemPrompt = 'You are a helpful AI coordination assistant.'
    if (personalityConfig.system_prompt_additions) {
      systemPrompt += '\n\n' + personalityConfig.system_prompt_additions
    }

    const response = await this.claudeClient.generateResponse({
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    })

    return response.content
  }

  /**
   * Summarize email thread for memory
   */
  async summarizeThread(emails: Email[]): Promise<string> {
    return this.memorySummarizer.summarize(emails)
  }

  /**
   * Check if participants can access information
   */
  canAccess(
    sourceParticipants: string[],
    requestingParticipants: string[]
  ): { allowed: boolean; reason?: string } {
    return this.privacyTracker.canAccess(sourceParticipants, requestingParticipants)
  }

  /**
   * Track message for privacy
   */
  trackMessage(email: Email): void {
    this.privacyTracker.trackMessage(email)
  }

  /**
   * Get Claude client for direct API calls
   */
  getClaudeClient(): ClaudeClient {
    return this.claudeClient
  }

  /**
   * Get speech act store for direct access
   */
  getSpeechActStore(): SpeechActStore {
    return this.speechActStore
  }

  /**
   * Get privacy tracker for direct access
   */
  getPrivacyTracker(): PrivacyTracker {
    return this.privacyTracker
  }
}
