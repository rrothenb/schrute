import type { SQSEvent } from 'aws-lambda'
import { SchruteBridge } from '~/lib/integrations/schrute-bridge.js'
import { GitHubService } from '~/lib/github/index.js'
import { ActionItemExtractor } from '~/lib/extractors/index.js'
import { MeetingFollowupWorkflow } from '~/lib/workflows/index.js'
import { getSecret } from '../utils/secrets.js'
import type { Email } from '@schrute/lib/types/index.js'

export async function handler(event: SQSEvent) {
  const githubToken = await getSecret(process.env.GITHUB_TOKEN_SECRET!)
  const claudeApiKey = await getSecret(process.env.CLAUDE_API_KEY_SECRET!)

  const github = new GitHubService(
    githubToken,
    process.env.GITHUB_REPOSITORY!,
    ''
  )

  const schrute = new SchruteBridge({ claudeApiKey })
  const extractor = new ActionItemExtractor(schrute.getClaudeClient())
  const workflow = new MeetingFollowupWorkflow(github, extractor, schrute)

  for (const record of event.Records) {
    const email: Email = JSON.parse(record.body)

    try {
      const result = await workflow.execute(email)
      console.log(`Processed email ${email.message_id}: ${result.createdIssues.length} issues created`)
    } catch (error: any) {
      console.error(`Failed to process email ${email.message_id}:`, error.message)
    }
  }

  return { statusCode: 200, body: 'Processed' }
}
