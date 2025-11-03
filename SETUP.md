# Schrute Setup Guide

## Prerequisites

- Node.js 18+ (currently running on v16.16.0 - will work but shows warnings)
- Anthropic API key ([get one here](https://console.anthropic.com/))

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up API Key
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API key
# Replace 'your_api_key_here' with your actual key (starts with sk-ant-...)
```

Your `.env` file should look like:
```
ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here...
```

### 3. Run Schrute
```bash
npm run dev
```

You should see:
```
🤖 Schrute - AI Coordination Assistant
=====================================

Loaded personalities: default, dwight-schrute, louie-de-palma, tom-smykowski
Current personality: default

Commands:
  load <file>         - Load and process email YAML file
  query <question>    - Ask a question about the emails
  ...

schrute>
```

## Try It Out

Load a sample email thread and ask questions:

```
schrute> load events/thread-project-alpha.yaml
schrute> query What decisions were made?
schrute> acts decision
schrute> personality dwight-schrute
schrute> query What did Bob commit to?
```

Test the privacy system:
```
schrute> load events/thread-mixed-participants.yaml
schrute> query What is the raise budget?
```

## Available Commands

- `load <file>` - Load and process a YAML email file
- `query <question>` - Ask a question about loaded emails
- `acts [type]` - List all speech acts, or filter by type
- `threads` - Show all conversation threads
- `personality <name>` - Switch to a different personality
- `personalities` - List available personalities
- `status` - Show current system status
- `help` - Show help message
- `exit` - Exit the CLI

## Troubleshooting

### "Error: Invalid API key"
- Check that your `.env` file exists
- Verify the API key starts with `sk-ant-`
- Make sure there are no quotes around the key in `.env`

### "Cannot find module"
- Run `npm install` to ensure dependencies are installed
- Try `npm run build` to recompile

### Node version warnings
- The project requires Node 18+
- It will work on Node 16 but may show warnings
- Consider upgrading: `nvm install 18` (if using nvm)
