# Schrute - AI Coordination Assistant Framework

## 🎯 Project Context
AI coordination assistant using email interface. Currently building Phase 1 prototype:
- Speech act detection from emails
- Natural language queries about detected speech acts
- Privacy-respecting information access
- Foundation for future action-taking capabilities

## 📚 Tech Stack
- Runtime: Node.js 18
- Language: TypeScript 5 (strict mode)
- Cloud: AWS (SES, DynamoDB) - deployment via SAM when ready
- LLM: Anthropic Claude API
- Testing: Jest (when tests are written)

## 📁 Project Structure
- `src/lib/` - Shared utilities, types, core logic
- `src/lambdas/` - Lambda functions (for future deployment)
- `template.yaml` - AWS SAM template (infrastructure as code)
- `events/` - Sample event payloads for testing

## 📝 TypeScript Standards
- Strict mode enabled (`tsconfig.json`)
- No `any` types - use proper types or `unknown`
- Path alias: `~/*` maps to `./src/*`
- Export shared types from `~/lib/types`

## 🎨 Code Style
- No semicolons (project standard)
- Prettier for formatting
- ESLint for linting
- Single quotes for strings

Phase 1 is purely prototyping: No lambdas, no SES, local execution only

## 🚫 Never Edit
- `LICENSE` file
- `.aws-sam/` directory (SAM build artifacts)
- `dist/` directory (build output)

## 💡 Development Approach
- This is exploratory/prototype phase
- Focus on modular, production-quality code where it makes sense
- Don't over-engineer early - iterate and learn
- Architecture may change as we discover what works
