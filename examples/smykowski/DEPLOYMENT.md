# Smykowski Deployment Guide

## Prerequisites

1. **AWS Account** with CLI configured
2. **AWS SAM CLI** installed ([Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
3. **Node.js 18+** and npm
4. **GitHub Personal Access Token** with repo permissions
5. **Anthropic Claude API Key**

## Quick Start

```bash
cd examples/smykowski

# Install dependencies
npm install

# Build TypeScript
npm run build:lambda

# Deploy to AWS
npm run deploy
```

## Detailed Deployment Steps

### 1. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
CLAUDE_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
GITHUB_REPOSITORY=owner/repo
GITHUB_WEBHOOK_SECRET=your-secret-here
TEAM_LEAD_EMAIL=lead@team.com
```

### 2. Build Application

```bash
npm run build:lambda
```

This command:
- Compiles TypeScript to JavaScript
- Copies package.json to dist/
- Installs production dependencies in dist/

### 3. Deploy with SAM

First-time deployment (guided):

```bash
sam build
sam deploy --guided
```

Follow prompts:
- **Stack Name**: `smykowski-prod`
- **AWS Region**: `us-east-1` (or your preference)
- **GitHub Repository**: `owner/repo`
- **GitHub Token**: Your PAT (will be stored in Secrets Manager)
- **GitHub Webhook Secret**: Generate with `openssl rand -hex 32`
- **Claude API Key**: Your Anthropic API key
- **Team Lead Email**: Escalation email address

Subsequent deployments:

```bash
npm run deploy:quick
```

### 4. Configure GitHub Webhook

After deployment, SAM outputs the webhook URL:

```
WebhookUrl: https://xxx.execute-api.us-east-1.amazonaws.com/Prod/webhook
```

In your GitHub repository:
1. Go to Settings → Webhooks → Add webhook
2. **Payload URL**: Use the WebhookUrl from SAM output
3. **Content type**: `application/json`
4. **Secret**: Use the same webhook secret from deployment
5. **Events**: Select:
   - Issues
   - Pull requests
   - Discussions
   - Projects

### 5. Configure Schrute Integration

Smykowski extends Schrute's email processing. Ensure Schrute is deployed and configured to:

1. Forward emails to Smykowski's email-processor Lambda
2. Share DynamoDB tables (if using shared tables)

Or run Smykowski standalone with its own email ingestion.

### 6. Initialize Team State

Create initial team members in DynamoDB:

```bash
aws dynamodb put-item \
  --table-name smykowski-prod-team-state \
  --item file://team-member.json
```

Example `team-member.json`:

```json
{
  "email": {"S": "alice@team.com"},
  "name": {"S": "Alice Johnson"},
  "github_username": {"S": "alice"},
  "expertise_areas": {"L": []},
  "current_workload": {"N": "0"},
  "assigned_issues": {"L": []},
  "review_stats": {"M": {
    "total_reviews": {"N": "0"},
    "avg_review_time_hours": {"N": "0"},
    "recent_reviews": {"L": []}
  }},
  "updated_at": {"S": "2025-11-10T00:00:00Z"}
}
```

### 7. Test Deployment

Send a test email to Tom:

```
To: tom@smykowski.work
Subject: Test Meeting Notes

Hi Tom,

From today's meeting:
- Alice will implement the new feature by Friday
- Bob needs to review the PR by Wednesday

Thanks!
```

Tom should:
1. Create GitHub issues for both action items
2. Assign them appropriately
3. Set deadlines
4. Create a Discussion post
5. Send confirmation email

Check:
- GitHub issues created
- DynamoDB commitments stored
- CloudWatch logs for processing

### 8. Monitor

**CloudWatch Logs**:
```bash
aws logs tail /aws/lambda/smykowski-prod-EmailProcessorFunction --follow
aws logs tail /aws/lambda/smykowski-prod-GitHubWebhookFunction --follow
aws logs tail /aws/lambda/smykowski-prod-SchedulerFunction --follow
```

**DynamoDB Tables**:
```bash
aws dynamodb scan --table-name smykowski-prod-commitments
aws dynamodb scan --table-name smykowski-prod-team-state
```

**Lambda Metrics**:
- AWS Console → Lambda → Functions
- Check invocations, errors, duration

## Configuration

### Adjusting Reminder Schedules

Edit `template.yaml`:

```yaml
SchedulerFunction:
  Events:
    ScheduledEvent:
      Schedule: rate(15 minutes)  # Change frequency here
```

### Changing SLA Thresholds

Set environment variables in Lambda configuration or pass to workflow constructors.

### Adding Team Members

Use AWS CLI or Console to add to `team-state` table.

## Troubleshooting

### Issue: Webhook Returns 401

**Cause**: Invalid webhook signature

**Fix**:
1. Verify webhook secret matches in GitHub and Secrets Manager
2. Check CloudWatch logs for signature verification errors

### Issue: No Issues Created

**Cause**: Extraction failure or GitHub permissions

**Fix**:
1. Check CloudWatch logs for errors
2. Verify GitHub token has `repo` scope
3. Test action item extractor manually

### Issue: Lambda Timeout

**Cause**: Claude API slow or complex email

**Fix**:
1. Increase timeout in `template.yaml`
2. Check Claude API status
3. Simplify email content

### Issue: DynamoDB Throttling

**Cause**: Too many requests

**Fix**:
1. Tables use on-demand billing, shouldn't throttle
2. Check for excessive writes
3. Consider batch operations

## Updating Deployment

```bash
# Make code changes
npm run build:lambda

# Deploy updates
sam build
sam deploy
```

SAM performs rolling updates with zero downtime.

## Cleanup

To delete all resources:

```bash
sam delete --stack-name smykowski-prod
```

This removes:
- All Lambda functions
- DynamoDB tables (data loss!)
- API Gateway
- IAM roles
- Secrets Manager secrets

**Note**: Backup DynamoDB tables before deleting if you need the data.

## Production Considerations

1. **Monitoring**: Set up CloudWatch alarms for errors
2. **Backup**: Enable DynamoDB point-in-time recovery
3. **Logging**: Increase log retention for audit trail
4. **Secrets Rotation**: Rotate GitHub token and webhook secret periodically
5. **Cost Monitoring**: Set up AWS Budget alerts
6. **Multi-Region**: Deploy to multiple regions for HA
7. **Testing**: Deploy to staging environment first

## Cost Optimization

1. **Lambda Memory**: Reduce if not needed (currently 1024MB)
2. **Scheduler Frequency**: Increase interval if acceptable
3. **Log Retention**: Reduce from default 30 days
4. **DynamoDB**: Tables already use on-demand billing
5. **Secrets Manager**: Consolidate secrets if possible

## Next Steps

1. Test all workflows with real data
2. Monitor for a week
3. Tune SLA thresholds based on team preferences
4. Add more team members to DynamoDB
5. Customize Tom's personality
6. Add more workflows as needed
