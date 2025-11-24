# Slack Integration for Smykowski

## Overview

Smykowski now supports bidirectional integration with Slack, enabling teams to coordinate directly from their Slack workspace while maintaining all state in GitHub.

**Key Features:**
- Send messages and notifications to Slack channels
- Create GitHub issues from Slack conversations
- Link Slack threads to GitHub issues/PRs
- Sync team activity between Slack and GitHub
- Natural language commands in Slack
- Automatic notifications for GitHub events

## Architecture

The Slack integration is implemented as an **MCP (Model Context Protocol) server**, providing clean separation and reusability:

```
Slack Events → Lambda Webhook → DynamoDB Queue
                                      ↓
                                Processor Lambda
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
              Slack MCP Server                    GitHub API
              - Send messages                     - Create issues
              - Read threads                      - Update PRs
              - Manage channels                   - Post comments
              - Link to GitHub
```

### Components

1. **Slack MCP Server** (`src/mcp-servers/slack/`)
   - Provides 20+ tools for Slack operations
   - Manages channel/user/thread mappings
   - Handles message formatting (Slack ↔ Markdown)
   - State stored in JSON file

2. **Webhook Lambda** (`lambdas/slack-webhook/`)
   - Receives Slack events via HTTPS
   - Verifies webhook signatures
   - Stores events in DynamoDB queue
   - Returns 200 immediately (Slack requirement)

3. **Processor Lambda** (`lambdas/slack-processor/`)
   - Runs every 5 minutes (EventBridge)
   - Processes queued Slack events
   - Uses Slack MCP server for operations
   - Executes coordination workflows

## Setup

### 1. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name: "Smykowski" (or your preference)
4. Select your workspace

### 2. Configure OAuth Scopes

Under "OAuth & Permissions", add these Bot Token Scopes:

**Channels:**
- `channels:history` - Read public channel messages
- `channels:read` - View channel information
- `channels:write` - Create/manage channels

**Chat:**
- `chat:write` - Send messages
- `chat:write.public` - Send to channels without joining

**Reactions:**
- `reactions:write` - Add emoji reactions

**Users:**
- `users:read` - View user information
- `users:read.email` - Read user email addresses

### 3. Enable Event Subscriptions

Under "Event Subscriptions":

1. Enable Events: **On**
2. Request URL: (deploy first, then add the URL from stack outputs)
3. Subscribe to bot events:
   - `message.channels` - Messages in public channels
   - `message.groups` - Messages in private channels
   - `app_mention` - When app is @mentioned

### 4. Deploy Smykowski with Slack Support

```bash
cd examples/smykowski

# Build
npm run build:lambda

# Deploy with Slack parameters
sam deploy \
  --parameter-overrides \
    GitHubRepository=owner/repo \
    GitHubToken=ghp_xxx \
    GitHubWebhookSecret=xxx \
    ClaudeAPIKey=sk-ant-xxx \
    TeamLeadEmail=lead@example.com \
    SlackBotToken=xoxb-your-bot-token \
    SlackSigningSecret=your-signing-secret
```

**Get Slack tokens from:**
- **Bot Token**: OAuth & Permissions → Bot User OAuth Token (starts with `xoxb-`)
- **Signing Secret**: Basic Information → App Credentials → Signing Secret

### 5. Configure Slack App Event URL

After deployment, get the webhook URL:

```bash
aws cloudformation describe-stacks \
  --stack-name smykowski \
  --query 'Stacks[0].Outputs[?OutputKey==`SlackWebhookUrl`].OutputValue' \
  --output text
```

Add this URL to Slack app settings under "Event Subscriptions" → "Request URL"

### 6. Install App to Workspace

Under "Install App":
1. Click "Install to Workspace"
2. Review permissions
3. Click "Allow"

### 7. Configure Channel Mappings

Map Slack channels to GitHub repos using the Slack MCP server:

```bash
# Connect to Slack MCP server
export SLACK_BOT_TOKEN=xoxb-xxx
node dist/mcp-servers/slack/server.js

# In MCP client, map channels:
{
  "tool": "map_channel_to_repo",
  "arguments": {
    "slack_channel_id": "C1234567890",
    "github_repo": "owner/repo",
    "notify_on_issues": true,
    "notify_on_prs": true
  }
}
```

### 8. Configure User Mappings

Link Slack users to GitHub usernames:

```bash
{
  "tool": "map_user_to_github",
  "arguments": {
    "slack_user_id": "U1234567890",
    "github_username": "octocat",
    "email": "octocat@github.com",
    "notify_direct_messages": true,
    "notify_mentions": true,
    "notify_assignments": true
  }
}
```

## Usage

### Create GitHub Issues from Slack

Simply mention your intent in any Slack channel:

```
Hey Tom, create an issue for fixing the login bug
```

Tom will:
1. Extract the issue title and context
2. Create a GitHub issue
3. Link the Slack thread to the issue
4. Reply with confirmation and issue link

### Check Project Status

```
@tom what's the status of the auth refactor?
```

Tom will:
1. Query GitHub for relevant issues/PRs
2. Summarize completion status
3. List blockers and at-risk items
4. Post formatted report in thread

### Get Help

```
@tom help
```

Tom explains available commands and how to use them.

### Link Existing Threads

Link a Slack discussion to an existing GitHub issue:

```
@tom link this thread to issue #123
```

## MCP Tools Available

### Messaging Tools

- **send_message**: Send message to channel/thread
- **read_channel**: Read channel history
- **get_thread**: Get all messages in thread
- **update_message**: Edit existing message
- **add_reaction**: Add emoji reaction

### Channel Tools

- **list_channels**: List all channels with mappings
- **get_channel**: Get channel information
- **map_channel_to_repo**: Map channel to GitHub repo
- **get_channel_for_repo**: Find channel for repo
- **list_channel_mappings**: List all mappings

### User Tools

- **get_user**: Get user information
- **map_user_to_github**: Map user to GitHub
- **get_user_for_github**: Find user for GitHub username
- **get_user_for_email**: Find user by email
- **list_user_mappings**: List all mappings

### Linking Tools

- **link_thread_to_issue**: Link thread to issue
- **link_thread_to_pr**: Link thread to PR
- **get_linked_issue**: Get issue for thread
- **get_linked_thread**: Get thread for issue/PR
- **list_thread_mappings**: List all links

### Formatting Tools

- **markdown_to_slack**: Convert markdown to Slack format
- **slack_to_markdown**: Convert Slack to markdown

## Workflows

### Meeting Follow-up (Slack Edition)

1. Hold meeting in Slack thread
2. Post summary with action items
3. Tom extracts commitments
4. Creates GitHub issues
5. Links thread to issues
6. Sends confirmations

### Deadline Reminders

1. Tom monitors commitments in DynamoDB
2. Checks deadlines every 15 minutes
3. Posts reminders to appropriate Slack channels
4. Tags users in their threads
5. Escalates overdue items

### PR Review Coordination

1. PR created on GitHub
2. Tom posts to mapped Slack channel
3. Suggests reviewers based on expertise
4. Tracks review status
5. Posts reminders in Slack thread
6. Celebrates completion

### Status Reports

1. Weekly/on-demand status generation
2. Queries GitHub for project data
3. Formats report for Slack
4. Posts to project channel
5. Links to full GitHub report

## Configuration

### Channel Mappings

Stored in `slack-mappings.json`:

```json
{
  "channels": [
    {
      "slackChannelId": "C1234567890",
      "slackChannelName": "project-alpha",
      "githubRepo": "owner/repo",
      "notifyOnIssues": true,
      "notifyOnPRs": true
    }
  ]
}
```

### User Mappings

```json
{
  "users": [
    {
      "slackUserId": "U1234567890",
      "slackUsername": "alice",
      "githubUsername": "alice-gh",
      "email": "alice@example.com",
      "notificationPreferences": {
        "directMessages": true,
        "mentions": true,
        "assignments": true
      }
    }
  ]
}
```

### Thread Mappings

```json
{
  "threads": [
    {
      "slackChannelId": "C1234567890",
      "slackThreadTs": "1234567890.123456",
      "githubRepo": "owner/repo",
      "githubIssueNumber": 123,
      "createdAt": "2025-11-24T10:00:00Z",
      "lastSyncedAt": "2025-11-24T10:30:00Z"
    }
  ]
}
```

## Cost Estimate

**Additional AWS costs for Slack integration:**

- **Lambda**: ~$0.50/month (1,000 events/day)
- **API Gateway**: ~$0.35/month
- **DynamoDB**: ~$0.25/month (event queue)
- **Secrets Manager**: ~$0.40/month (Slack tokens)

**Total additional: ~$1.50/month**

## Security

1. **Webhook Verification**: All Slack requests verified via HMAC signature
2. **Token Storage**: Bot token and signing secret in AWS Secrets Manager
3. **IAM Policies**: Least-privilege access for Lambda functions
4. **Encryption**: DynamoDB encryption at rest
5. **TTL**: Event queue auto-expires after 7 days

## Troubleshooting

### Slack events not being processed

1. Check Lambda logs: `aws logs tail /aws/lambda/smykowski-SlackProcessorFunction --follow`
2. Verify events in DynamoDB: Check `smykowski-slack-events` table
3. Ensure processor Lambda is running every 5 minutes

### Webhook verification failing

1. Check signing secret matches Slack app settings
2. Verify system clock is accurate (signature includes timestamp)
3. Check Lambda logs for signature mismatch errors

### Bot not responding

1. Verify bot token is valid
2. Check bot has necessary OAuth scopes
3. Ensure bot is invited to channel
4. Check processor Lambda has SLACK_BOT_TOKEN_SECRET environment variable

### MCP server connection issues

1. Verify `@slack/web-api` package is installed in `dist/`
2. Check Lambda has correct NODE_PATH
3. Ensure server.ts is compiled to dist/mcp-servers/slack/

## Extending

### Add Custom Workflows

1. Create workflow in `src/lib/workflows/`
2. Import in `slack-processor/handler.ts`
3. Add trigger logic based on message patterns
4. Deploy updated Lambda

### Add New MCP Tools

1. Create tool handler in `src/mcp-servers/slack/tools/`
2. Register in `server.ts` `getTools()` and `handleToolCall()`
3. Rebuild and redeploy

### Custom Notifications

1. Use `send_message` tool in your workflows
2. Use formatting utilities for rich messages
3. Leverage Slack Block Kit for interactive messages

## Future Enhancements

- Slash commands (`/tom status`)
- Interactive message buttons
- Scheduled digest messages
- Slack workflow integration
- Multi-workspace support
- Threaded status updates
- Reaction-based issue creation
- Slack Connect for external teams

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review DynamoDB tables for state
3. Test MCP server locally
4. File GitHub issue with logs

## References

- [Slack API Documentation](https://api.slack.com/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Smykowski Architecture](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
