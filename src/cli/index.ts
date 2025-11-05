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
import { getMCPClientManager } from '~/lib/mcp/index.js'
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
  private mcpClient = getMCPClientManager()
  private currentPersonality: PersonalityConfig | null = null
  private useMemorySystem = false
  private useTools = false // Toggle for automatic tool use
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
    console.log('  load <file>           - Load and process email YAML file')
    console.log('  query <question>      - Ask a question about the emails')
    console.log('  acts [type]           - List speech acts (optional: filter by type)')
    console.log('  threads               - Show email threads')
    console.log('  personality <name>    - Switch personality')
    console.log('  personalities         - List available personalities')
    console.log('  memory [on|off]       - Toggle hybrid memory system')
    console.log('  tools [on|off]        - Toggle automatic tool use with queries')
    console.log('  mcp connect <config>  - Connect to an MCP server')
    console.log('  mcp list              - List connected MCP servers')
    console.log('  mcp tools [server]    - List available MCP tools')
    console.log('  mcp invoke <tool>     - Invoke an MCP tool')
    console.log('  knowledge <cmd>       - Manage knowledge store (list|search|get)')
    console.log('  skills <cmd>          - Manage dynamic skills (list|create|invoke)')
    console.log('  status                - Show current status')
    console.log('  help                  - Show this help')
    console.log('  exit                  - Exit the CLI')
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
        case 'memory':
          this.toggleMemory(args)
          break
        case 'tools':
          this.toggleTools(args)
          break
        case 'mcp':
          await this.handleMCPCommand(args)
          break
        case 'knowledge':
          await this.handleKnowledgeCommand(args)
          break
        case 'skills':
          await this.handleSkillsCommand(args)
          break
        case 'status':
          this.showStatus()
          break
        case 'help':
          this.showHelp()
          break
        case 'exit':
          console.log('Goodbye!')
          await this.mcpClient.disconnectAll()
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

    // Determine thread ID (use first thread if available)
    const threadId = this.threads.length > 0 ? this.threads[0].thread_id : undefined

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
        threadId,
        useMemorySystem: this.useMemorySystem,
        mcpClient: this.mcpClient,
        useTools: this.useTools,
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

  toggleMemory(arg: string) {
    const command = arg.toLowerCase()

    if (command === 'on') {
      this.useMemorySystem = true
      console.log('✓ Hybrid memory system enabled')
      console.log('  Queries will use recent messages + summaries for older messages')
    } else if (command === 'off') {
      this.useMemorySystem = false
      console.log('✓ Hybrid memory system disabled')
      console.log('  Queries will use all messages directly (legacy mode)')
    } else {
      console.log(`Memory system is currently: ${this.useMemorySystem ? 'ON' : 'OFF'}`)
      console.log('Usage: memory [on|off]')
    }
  }

  toggleTools(arg: string) {
    const command = arg.toLowerCase()

    if (command === 'on') {
      this.useTools = true
      console.log('✓ Automatic tool use enabled')
      console.log('  Queries will automatically discover and use connected MCP tools')
      const connectedServers = this.mcpClient.getConnections().filter((c) => c.connected)
      if (connectedServers.length > 0) {
        console.log(`  Connected servers: ${connectedServers.map((s) => s.serverName).join(', ')}`)
        const toolCount = connectedServers.reduce((sum, s) => sum + s.tools.length, 0)
        console.log(`  Available tools: ${toolCount}`)
      } else {
        console.log('  ⚠️  No MCP servers connected. Use "mcp connect" to connect servers.')
      }
    } else if (command === 'off') {
      this.useTools = false
      console.log('✓ Automatic tool use disabled')
      console.log('  Queries will only use email content (default mode)')
    } else {
      console.log(`Automatic tool use is currently: ${this.useTools ? 'ON' : 'OFF'}`)
      console.log('Usage: tools [on|off]')
    }
  }

  showStatus() {
    console.log('Current Status:')
    console.log(`  Emails loaded: ${this.emails.length}`)
    console.log(`  Threads: ${this.threads.length}`)
    console.log(`  Speech acts detected: ${this.speechActStore.count()}`)
    console.log(`  Participants tracked: ${this.privacyTracker.getAllParticipants().length}`)
    console.log(`  Current personality: ${this.currentPersonality?.name || 'none'}`)
    console.log(`  Memory system: ${this.useMemorySystem ? 'ON (hybrid)' : 'OFF (legacy)'}`)
    console.log(`  Automatic tool use: ${this.useTools ? 'ON' : 'OFF'}`)
    const connections = this.mcpClient.getConnections()
    console.log(`  MCP servers connected: ${connections.filter((c) => c.connected).length}`)
    if (this.useTools) {
      const toolCount = connections
        .filter((c) => c.connected)
        .reduce((sum, c) => sum + c.tools.length, 0)
      console.log(`  Available tools: ${toolCount}`)
    }
    console.log()
    console.log('Schrute Config:')
    console.log(`  Name: ${this.schruteConfig.name}`)
    console.log(`  Email: ${this.schruteConfig.email.email}`)
    console.log(
      `  Responsibilities: ${this.schruteConfig.areas_of_responsibility?.join(', ') || 'none'}`
    )
  }

  async handleMCPCommand(args: string) {
    const parts = args.trim().split(/\s+/)
    const subcommand = parts[0]?.toLowerCase()

    switch (subcommand) {
      case 'connect':
        await this.mcpConnect(parts.slice(1).join(' '))
        break
      case 'list':
        this.mcpList()
        break
      case 'tools':
        this.mcpTools(parts[1])
        break
      case 'invoke':
        await this.mcpInvoke(parts.slice(1).join(' '))
        break
      default:
        console.log('MCP commands:')
        console.log('  mcp connect <config>  - Connect to MCP server')
        console.log('  mcp list              - List connected servers')
        console.log('  mcp tools [server]    - List available tools')
        console.log('  mcp invoke <tool>     - Invoke a tool')
    }
  }

  async mcpConnect(configStr: string) {
    if (!configStr) {
      console.log('Usage: mcp connect <name> <command> [args...]')
      console.log('Example: mcp connect knowledge-store node dist/mcp-servers/knowledge-store/server.js')
      return
    }

    const parts = configStr.split(/\s+/)
    if (parts.length < 2) {
      console.log('Usage: mcp connect <name> <command> [args...]')
      return
    }

    const [name, command, ...args] = parts

    console.log(`Connecting to ${name}...`)

    try {
      await this.mcpClient.connect({
        name,
        command,
        args,
      })

      console.log(`✓ Connected to ${name}`)

      const connection = this.mcpClient.getConnection(name.toLowerCase().replace(/\s+/g, '-'))
      if (connection && connection.tools.length > 0) {
        console.log(`  Tools available: ${connection.tools.length}`)
      }
    } catch (error) {
      console.error(`Failed to connect to ${name}:`, error instanceof Error ? error.message : error)
    }
  }

  mcpList() {
    const connections = this.mcpClient.getConnections()

    if (connections.length === 0) {
      console.log('No MCP servers connected.')
      console.log('Use "mcp connect <config>" to connect to a server.')
      return
    }

    console.log('Connected MCP Servers:')
    console.log()

    for (const conn of connections) {
      console.log(`${conn.serverName} [${conn.serverId}]`)
      console.log(`  Status: ${conn.connected ? '✓ Connected' : '✗ Disconnected'}`)
      console.log(`  Tools: ${conn.tools.length}`)
      if (conn.error) {
        console.log(`  Error: ${conn.error}`)
      }
      console.log()
    }
  }

  mcpTools(serverId?: string) {
    if (serverId) {
      const connection = this.mcpClient.getConnection(serverId)
      if (!connection) {
        console.log(`Server "${serverId}" not found.`)
        return
      }

      console.log(`Tools from ${connection.serverName}:`)
      console.log()

      for (const tool of connection.tools) {
        console.log(`${tool.name}`)
        if (tool.description) {
          console.log(`  ${tool.description}`)
        }
        console.log()
      }
    } else {
      const tools = this.mcpClient.getAllTools()

      if (tools.length === 0) {
        console.log('No tools available.')
        console.log('Connect to MCP servers using "mcp connect".')
        return
      }

      console.log('All Available Tools:')
      console.log()

      for (const tool of tools) {
        console.log(`${tool.name} [${tool.serverName}]`)
        if (tool.description) {
          console.log(`  ${tool.description}`)
        }
        console.log()
      }
    }
  }

  async mcpInvoke(argsStr: string) {
    if (!argsStr) {
      console.log('Usage: mcp invoke <tool-name> [JSON args]')
      console.log('Example: mcp invoke list_knowledge {"category":"decision"}')
      return
    }

    const firstSpace = argsStr.indexOf(' ')
    const toolName = firstSpace > 0 ? argsStr.substring(0, firstSpace) : argsStr
    const argsJson = firstSpace > 0 ? argsStr.substring(firstSpace + 1).trim() : '{}'

    let args: Record<string, unknown> = {}
    if (argsJson !== '{}') {
      try {
        args = JSON.parse(argsJson)
      } catch (error) {
        console.error('Invalid JSON arguments:', error instanceof Error ? error.message : error)
        return
      }
    }

    console.log(`Invoking ${toolName}...`)

    try {
      const result = await this.mcpClient.invokeToolByName(toolName, args)

      if (result.success) {
        console.log('Result:')
        console.log(JSON.stringify(result.result, null, 2))
      } else {
        console.error('Error:', result.error)
      }
    } catch (error) {
      console.error('Failed to invoke tool:', error instanceof Error ? error.message : error)
    }
  }

  async handleKnowledgeCommand(args: string) {
    const parts = args.trim().split(/\s+/)
    const subcommand = parts[0]?.toLowerCase()

    switch (subcommand) {
      case 'list':
        await this.knowledgeList(parts[1])
        break
      case 'search':
        await this.knowledgeSearch(parts.slice(1).join(' '))
        break
      case 'get':
        await this.knowledgeGet(parts[1])
        break
      default:
        console.log('Knowledge commands:')
        console.log('  knowledge list [category]  - List knowledge entries')
        console.log('  knowledge search <query>   - Search knowledge')
        console.log('  knowledge get <id>         - Get specific entry')
    }
  }

  async knowledgeList(category?: string) {
    const args = category ? { category } : {}

    const result = await this.mcpClient.invokeToolByName('list_knowledge', args)

    if (result.success) {
      const entries = JSON.parse(JSON.stringify(result.result))
      if (entries && entries.content && entries.content[0]) {
        const data = JSON.parse(entries.content[0].text)
        if (Array.isArray(data) && data.length > 0) {
          console.log('Knowledge Entries:')
          console.log()
          for (const entry of data.slice(0, 20)) {
            console.log(`[${entry.category}] ${entry.title}`)
            console.log(`  ID: ${entry.id}`)
            console.log(`  Updated: ${entry.updated_at}`)
            console.log()
          }
          if (data.length > 20) {
            console.log(`... and ${data.length - 20} more`)
          }
        } else {
          console.log('No knowledge entries found.')
        }
      }
    } else {
      console.error('Error:', result.error || 'Knowledge store not connected')
      console.log('Make sure to connect to the knowledge-store server first:')
      console.log('  mcp connect knowledge-store node dist/mcp-servers/knowledge-store/server.js')
    }
  }

  async knowledgeSearch(query: string) {
    if (!query) {
      console.log('Usage: knowledge search <query>')
      return
    }

    const result = await this.mcpClient.invokeToolByName('search_knowledge', { query })

    if (result.success) {
      const entries = JSON.parse(JSON.stringify(result.result))
      if (entries && entries.content && entries.content[0]) {
        const data = JSON.parse(entries.content[0].text)
        if (Array.isArray(data) && data.length > 0) {
          console.log(`Search results for "${query}":`)
          console.log()
          for (const entry of data) {
            console.log(`[${entry.category}] ${entry.title}`)
            console.log(`  ${entry.content.substring(0, 100)}...`)
            console.log()
          }
        } else {
          console.log('No results found.')
        }
      }
    } else {
      console.error('Error:', result.error)
    }
  }

  async knowledgeGet(id: string) {
    if (!id) {
      console.log('Usage: knowledge get <id>')
      return
    }

    const result = await this.mcpClient.invokeToolByName('retrieve_knowledge', { id })

    if (result.success) {
      const entry = JSON.parse(JSON.stringify(result.result))
      if (entry && entry.content && entry.content[0]) {
        const data = JSON.parse(entry.content[0].text)
        console.log(`Knowledge Entry: ${data.title}`)
        console.log(`Category: ${data.category}`)
        console.log(`ID: ${data.id}`)
        console.log()
        console.log(data.content)
        console.log()
        if (data.tags && data.tags.length > 0) {
          console.log(`Tags: ${data.tags.join(', ')}`)
        }
      }
    } else {
      console.error('Error:', result.error)
    }
  }

  async handleSkillsCommand(args: string) {
    const parts = args.trim().split(/\s+/)
    const subcommand = parts[0]?.toLowerCase()

    switch (subcommand) {
      case 'list':
        await this.skillsList()
        break
      case 'invoke':
        await this.skillsInvoke(parts.slice(1).join(' '))
        break
      default:
        console.log('Skills commands:')
        console.log('  skills list           - List available dynamic skills')
        console.log('  skills invoke <name>  - Invoke a skill')
    }
  }

  async skillsList() {
    const result = await this.mcpClient.invokeToolByName('list_skills', {})

    if (result.success) {
      const response = JSON.parse(JSON.stringify(result.result))
      if (response && response.content && response.content[0]) {
        const skills = JSON.parse(response.content[0].text)
        if (Array.isArray(skills) && skills.length > 0) {
          console.log('Dynamic Skills:')
          console.log()
          for (const skill of skills) {
            console.log(`${skill.name}`)
            console.log(`  ${skill.description}`)
            console.log(`  Placeholders: ${skill.input_placeholders.map((p: {name: string}) => p.name).join(', ')}`)
            console.log()
          }
        } else {
          console.log('No skills created yet.')
          console.log('Use the create_skill MCP tool to create new skills.')
        }
      }
    } else {
      console.error('Error:', result.error || 'Dynamic skills server not connected')
      console.log('Make sure to connect to the dynamic-skills server first:')
      console.log('  mcp connect dynamic-skills node dist/mcp-servers/dynamic-skills/server.js')
    }
  }

  async skillsInvoke(argsStr: string) {
    if (!argsStr) {
      console.log('Usage: skills invoke <skill-name> [JSON args]')
      return
    }

    const firstSpace = argsStr.indexOf(' ')
    const skillName = firstSpace > 0 ? argsStr.substring(0, firstSpace) : argsStr
    const argsJson = firstSpace > 0 ? argsStr.substring(firstSpace + 1).trim() : '{}'

    let args: Record<string, string> = {}
    if (argsJson !== '{}') {
      try {
        args = JSON.parse(argsJson)
      } catch (error) {
        console.error('Invalid JSON arguments:', error instanceof Error ? error.message : error)
        return
      }
    }

    console.log(`Invoking skill ${skillName}...`)

    const result = await this.mcpClient.invokeToolByName(skillName, args)

    if (result.success) {
      const response = JSON.parse(JSON.stringify(result.result))
      if (response && response.content && response.content[0]) {
        console.log('Result:')
        console.log(response.content[0].text)
      }
    } else {
      console.error('Error:', result.error)
    }
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
