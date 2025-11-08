# Schrute Phase 2 - Deployment Guide

## 🚀 Overview

This guide covers deploying Schrute to AWS using AWS SAM (Serverless Application Model). After deployment, Schrute will:
- Receive emails via Amazon SES
- Process emails through Lambda functions
- Detect speech acts using Claude AI
- Decide when to respond intelligently
- Send responses via SES

## 📋 Prerequisites

### 1. AWS Account & CLI

```bash
# Install AWS CLI (if not already installed)
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region (e.g., us-east-1)
```

### 2. AWS SAM CLI

```bash
# Install SAM CLI
# macOS
brew tap aws/tap
brew install aws-sam-cli

# Linux/Windows: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html

# Verify installation
sam --version
```

### 3. Node.js & Dependencies

```bash
# Ensure Node.js 18+ is installed
node --version  # Should be >= 18.0.0

# Install project dependencies
npm install
```

### 4. Anthropic API Key

Get your API key from: https://console.anthropic.com/

### 5. Verified SES Domain

You need a verified domain in Amazon SES:

```bash
# Check SES verification status
aws ses list-identities

# If not verified, verify your domain
aws ses verify-domain-identity --domain yourdomain.com
# Follow DNS verification steps in SES console
```

## 🔧 Configuration

### 1. Environment Setup

Create a `.env` file for local development:

```bash
cp .env.example .env
```

Edit `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
AWS_REGION=us-east-1
```

### 2. Deployment Parameters

Edit deployment parameters in `samconfig.toml` (created during first deployment) or pass via CLI:

- `SchruteEmail`: Email address for Schrute (e.g., `schrute@yourdomain.com`)
- `SenderDomain`: Your verified SES domain (e.g., `yourdomain.com`)
- `AnthropicApiKey`: Your Anthropic API key
- `ContextWindowSize`: Number of recent messages to keep in full (default: 10)

## 📦 Build & Deploy

### First-Time Deployment (Guided)

```bash
# Build TypeScript and prepare Lambda package
npm run build:lambda

# Build SAM application
sam build

# Deploy with guided prompts
sam deploy --guided
```

You'll be prompted for:
- Stack name (e.g., `schrute-prod`)
- AWS Region (e.g., `us-east-1`)
- Parameter values (SchruteEmail, AnthropicApiKey, etc.)
- Confirm changes before deploy: Y
- Allow SAM CLI IAM role creation: Y
- Save arguments to configuration file: Y

### Subsequent Deployments

After first deployment, use:

```bash
# Quick redeploy with saved configuration
npm run deploy:quick
```

Or explicitly:

```bash
npm run build:lambda
sam build
sam deploy
```

## 📧 Post-Deployment Configuration

### 1. Configure SES Email Receiving

SAM creates the S3 bucket but you need to configure SES receipt rules manually:

```bash
# Get the raw emails bucket name from stack outputs
aws cloudformation describe-stacks \
  --stack-name schrute-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`RawEmailsBucketName`].OutputValue' \
  --output text

# Create SES receipt rule set (if not exists)
aws ses create-receipt-rule-set --rule-set-name schrute-rules

# Set as active
aws ses set-active-receipt-rule-set --rule-set-name schrute-rules

# Create receipt rule
aws ses create-receipt-rule \
  --rule-set-name schrute-rules \
  --rule '{
    "Name": "schrute-ingest",
    "Enabled": true,
    "Recipients": ["schrute@yourdomain.com"],
    "Actions": [
      {
        "S3Action": {
          "BucketName": "YOUR-RAW-EMAILS-BUCKET-NAME",
          "ObjectKeyPrefix": ""
        }
      }
    ],
    "ScanEnabled": true
  }'
```

**Alternative:** Configure via AWS Console:
1. Go to Amazon SES → Email Receiving → Receipt Rules
2. Create new rule set (if needed) and set as active
3. Add rule for `schrute@yourdomain.com`
4. Add S3 action to store in RawEmailsBucket

### 2. Upload Personality Configurations

```bash
# Get personalities bucket name
PERSONALITIES_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name schrute-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`PersonalitiesBucketName`].OutputValue' \
  --output text)

# Upload personality configs
aws s3 cp personalities/default.yaml s3://${PERSONALITIES_BUCKET}/default.yaml
aws s3 cp personalities/dwight-schrute.yaml s3://${PERSONALITIES_BUCKET}/dwight-schrute.yaml
aws s3 cp personalities/louie-de-palma.yaml s3://${PERSONALITIES_BUCKET}/louie-de-palma.yaml
aws s3 cp personalities/tom-smykowski.yaml s3://${PERSONALITIES_BUCKET}/tom-smykowski.yaml
```

### 3. Upload Initial Knowledge (Optional)

```bash
# Get knowledge bucket name
KNOWLEDGE_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name schrute-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBucketName`].OutputValue' \
  --output text)

# Upload knowledge entries (if any)
aws s3 sync knowledge/ s3://${KNOWLEDGE_BUCKET}/
```

### 4. Verify SES Sending

If your SES account is in sandbox mode, you need to:

1. **Verify recipient emails** for testing:
```bash
aws ses verify-email-identity --email-address yourtest@email.com
```

2. **OR Request production access**:
   - Go to SES console → Account Dashboard
   - Click "Request production access"
   - Fill out the request form

## 🧪 Testing the Deployment

### 1. Send a Test Email

Send an email to `schrute@yourdomain.com` that explicitly addresses Schrute:

```
To: schrute@yourdomain.com
From: yourtest@email.com
Subject: Test - Project Alpha Status

Hi Schrute,

Can you summarize the status of Project Alpha?
What decisions have been made so far?

Thanks!
```

### 2. Monitor Logs

Watch Lambda logs in real-time:

```bash
# Ingest function logs
sam logs -n SchruteIngestFunction --stack-name schrute-prod --tail

# Processor function logs
sam logs -n SchruteProcessorFunction --stack-name schrute-prod --tail

# Responder function logs
sam logs -n SchruteResponderFunction --stack-name schrute-prod --tail
```

Or use AWS Console:
- CloudWatch → Log Groups → `/aws/lambda/schrute-prod-*`

### 3. Check DynamoDB

Verify data is being stored:

```bash
# List threads
aws dynamodb scan \
  --table-name schrute-prod-threads \
  --max-items 10

# List messages
aws dynamodb scan \
  --table-name schrute-prod-messages \
  --max-items 10

# List speech acts
aws dynamodb scan \
  --table-name schrute-prod-speech-acts \
  --max-items 10
```

### 4. Check S3

Verify emails are being stored:

```bash
# List raw emails
aws s3 ls s3://schrute-prod-emails-raw/ --recursive

# List processed emails
aws s3 ls s3://schrute-prod-emails-processed/ --recursive
```

## 🔍 Troubleshooting

### Email Not Received

1. **Check SES Receipt Rule:**
   ```bash
   aws ses describe-receipt-rule-set --rule-set-name schrute-rules
   ```

2. **Verify S3 Permissions:**
   - SES needs permission to write to the S3 bucket
   - SAM template should configure this automatically

3. **Check SES Email Receiving is enabled:**
   - Some regions don't support SES receiving (must be us-east-1, us-west-2, or eu-west-1)

### Lambda Errors

1. **Check CloudWatch Logs:**
   ```bash
   sam logs -n SchruteIngestFunction --stack-name schrute-prod
   ```

2. **Common Issues:**
   - API key not set correctly in Secrets Manager
   - DynamoDB table permissions
   - S3 bucket permissions
   - Timeout (increase in template.yaml if needed)

### Response Not Sent

1. **Check Activation Log:**
   ```bash
   aws dynamodb scan --table-name schrute-prod-activation-log
   ```
   Look for `shouldRespond: false` and check `reason`

2. **Verify SES Sending:**
   - Check SES console for bounces/complaints
   - Verify sender email is in verified identities
   - Check SES sending quota

3. **Check Responder Logs:**
   ```bash
   sam logs -n SchruteResponderFunction --stack-name schrute-prod
   ```

## 🧹 Cleanup / Uninstall

To remove all resources:

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name schrute-prod

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name schrute-prod

# Manually delete S3 buckets (must be empty first)
aws s3 rm s3://schrute-prod-emails-raw --recursive
aws s3 rb s3://schrute-prod-emails-raw

aws s3 rm s3://schrute-prod-emails-processed --recursive
aws s3 rb s3://schrute-prod-emails-processed

aws s3 rm s3://schrute-prod-knowledge --recursive
aws s3 rb s3://schrute-prod-knowledge

aws s3 rm s3://schrute-prod-personalities --recursive
aws s3 rb s3://schrute-prod-personalities

aws s3 rm s3://schrute-prod-skills --recursive
aws s3 rb s3://schrute-prod-skills

# Delete SES receipt rule
aws ses delete-receipt-rule --rule-set-name schrute-rules --rule-name schrute-ingest
```

## 💰 Cost Estimate

Approximate monthly costs (varies by usage):

- **Lambda:**
  - Free tier: 1M requests/month, 400,000 GB-seconds
  - After free tier: ~$0.20 per 1M requests
  - Estimate: $0-5/month for moderate use

- **DynamoDB:**
  - On-demand pricing: $1.25 per million writes, $0.25 per million reads
  - Estimate: $1-10/month

- **S3:**
  - Storage: $0.023 per GB/month
  - Requests: $0.005 per 1,000 PUT, $0.0004 per 1,000 GET
  - Estimate: $1-5/month

- **SES:**
  - Receiving: $0.10 per 1,000 emails
  - Sending: $0.10 per 1,000 emails (after free tier: 3,000 emails/month if from EC2)
  - Estimate: $0.10-2/month

- **Secrets Manager:**
  - $0.40 per secret per month
  - $0.05 per 10,000 API calls

- **CloudWatch Logs:**
  - $0.50 per GB ingested
  - Estimate: $1-3/month

**Total Estimated Cost: $5-30/month** depending on email volume

## 🔐 Security Best Practices

1. **Use Strong IAM Policies:**
   - Review Lambda execution roles
   - Follow principle of least privilege

2. **Rotate API Keys:**
   - Regularly rotate Anthropic API key
   - Update in Secrets Manager

3. **Enable Encryption:**
   - S3 buckets use AES-256 encryption (configured in template)
   - DynamoDB tables use encryption at rest (configured in template)

4. **Monitor Access:**
   - Enable CloudTrail for API call logging
   - Set up CloudWatch alarms for unusual activity

5. **Secure SES:**
   - Use SPF, DKIM, and DMARC for your domain
   - Monitor bounce and complaint rates

## 📞 Support

For issues or questions:
- Check CloudWatch Logs first
- Review AWS SAM documentation: https://docs.aws.amazon.com/serverless-application-model/
- Review SES documentation: https://docs.aws.amazon.com/ses/
- Open an issue on the project repository

## 🔄 Updating the Deployment

To update after making code changes:

```bash
# 1. Make your code changes

# 2. Test locally (if applicable)
npm test

# 3. Rebuild and redeploy
npm run deploy:quick

# 4. Monitor logs to verify changes
sam logs -n SchruteResponderFunction --stack-name schrute-prod --tail
```

## 🎓 Advanced Configuration

### Custom Personality

1. Create new personality YAML in `personalities/`
2. Deploy: `aws s3 cp personalities/my-personality.yaml s3://${PERSONALITIES_BUCKET}/`
3. Update responder Lambda to use it (modify code or add parameter)

### Adjusting Context Window

Update the `ContextWindowSize` parameter:

```bash
sam deploy --parameter-overrides ContextWindowSize=20
```

### Adding Custom MCP Skills

1. Create skill definition JSON
2. Upload to skills bucket
3. Modify responder Lambda to load and use skills

### Multi-Region Deployment

Note: SES email receiving only works in us-east-1, us-west-2, and eu-west-1

```bash
# Deploy to different region
sam deploy --region us-west-2 --parameter-overrides SchruteEmail=schrute@west.example.com
```
