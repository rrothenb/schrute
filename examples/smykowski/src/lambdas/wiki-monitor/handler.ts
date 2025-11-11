import type { ScheduledEvent } from 'aws-lambda'
import { ClaudeClient } from '@schrute/lib/claude/client.js'
import { GitHubService } from '~/lib/github/index.js'
import { ProcessStorage } from '~/lib/storage/index.js'
import { ProcessDefinitionExtractor } from '~/lib/extractors/index.js'
import { getSecret } from '../utils/secrets.js'

/**
 * WikiMonitorLambda scans wiki pages for process definitions
 * and registers them in DynamoDB for execution
 *
 * Runs every 15 minutes to detect changes in wiki-based process definitions
 */
export async function handler(event: ScheduledEvent) {
  console.log('Wiki monitor starting...', event)

  const githubToken = await getSecret(process.env.GITHUB_TOKEN_SECRET!)
  const claudeApiKey = await getSecret(process.env.CLAUDE_API_KEY_SECRET!)

  const github = new GitHubService(
    githubToken,
    process.env.GITHUB_REPOSITORY!,
    '' // No webhook secret needed for this lambda
  )

  const claudeClient = new ClaudeClient(claudeApiKey)
  const processStore = new ProcessStorage(process.env.PROCESSES_TABLE!)
  const extractor = new ProcessDefinitionExtractor(claudeClient)

  try {
    // List all wiki pages
    const allPages = await github.wiki.listPages()

    // Filter for process definition pages (in "Processes/" directory)
    const processPages = allPages.filter(pageName =>
      pageName.startsWith('Processes/') || pageName.startsWith('processes/')
    )

    console.log(`Found ${processPages.length} process pages:`, processPages)

    let registered = 0
    let updated = 0
    let errors = 0

    // Process each page
    for (const pageName of processPages) {
      try {
        console.log(`Processing wiki page: ${pageName}`)

        // Fetch page content
        const page = await github.wiki.getPage(pageName)

        if (!page) {
          console.log(`Page ${pageName} not found, skipping`)
          continue
        }

        // Extract process definition
        const processDefinition = await extractor.extractFromWikiPage(
          page.content,
          pageName
        )

        if (!processDefinition) {
          console.log(`No valid process definition in ${pageName}`)
          continue
        }

        // Validate the process definition
        const validation = extractor.validateProcessDefinition(processDefinition)
        if (!validation.valid) {
          console.error(`Invalid process definition in ${pageName}:`, validation.errors)
          errors++
          continue
        }

        // Check if process already exists
        const existing = await processStore.get(processDefinition.process_id)

        if (existing) {
          // Update existing process
          await processStore.update(processDefinition)
          updated++
          console.log(`Updated process: ${processDefinition.process_id}`)
        } else {
          // Register new process
          await processStore.save(processDefinition)
          registered++
          console.log(`Registered new process: ${processDefinition.process_id}`)
        }
      } catch (error: any) {
        console.error(`Error processing page ${pageName}:`, error)
        errors++
      }
    }

    const summary = {
      total_pages: processPages.length,
      registered,
      updated,
      errors,
      timestamp: new Date().toISOString(),
    }

    console.log('Wiki monitor complete:', summary)

    return {
      statusCode: 200,
      body: JSON.stringify(summary),
    }
  } catch (error: any) {
    console.error('Wiki monitor failed:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    }
  }
}
