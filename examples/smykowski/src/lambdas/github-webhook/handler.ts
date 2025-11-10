import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { GitHubService } from '~/lib/github/index.js'
import { getSecret } from '../utils/secrets.js'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const githubToken = await getSecret(process.env.GITHUB_TOKEN_SECRET!)
  const webhookSecret = await getSecret(process.env.GITHUB_WEBHOOK_SECRET!)

  const github = new GitHubService(
    githubToken,
    process.env.GITHUB_REPOSITORY!,
    webhookSecret
  )

  // Verify webhook signature
  const signature = event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256']
  if (!signature || !github.webhooks.verifySignature(event.body!, signature)) {
    return { statusCode: 401, body: 'Invalid signature' }
  }

  // Get event type
  const eventType = github.webhooks.getEventType(event.headers)
  if (!eventType) {
    return { statusCode: 400, body: 'Missing event type' }
  }

  // Handle event
  console.log(`Received ${eventType} webhook`)

  // Process based on event type
  // (Full implementation would route to specific handlers)

  return { statusCode: 200, body: 'OK' }
}
