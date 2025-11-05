# Testing Guide for Schrute

This document explains the testing strategy for the Schrute project, including how to run tests, what's covered, and expected API costs.

## Test Structure

The test suite is organized into three categories:

### 1. Unit Tests (37 tests)
Fast, isolated tests that don't require external dependencies. Run without API key.

**Location:** `src/lib/*/tests/*.test.ts`

**Coverage:**
- **Email Parser** (4 tests): Thread building, participant extraction, subject handling
- **Speech Act Store** (9 tests): CRUD operations, queries by type/thread/participant
- **Privacy Tracker** (8 tests): Participant tracking, access control, filtering
- **Personality Loader** (5 tests): Loading and validating personality configurations
- **MCP Types** (11 tests): Zod schema validation for MCP protocol types

### 2. Integration Tests (8 tests)
Tests that verify components work together. Some require API key.

**Location:** `src/__tests__/integration.test.ts`

**Coverage:**
- Load and process all 4 sample email scenarios
- Privacy filtering enforcement
- Speech act detection workflow (requires API key)
- End-to-end workflow: load → detect → store → query (requires API key)
- Multi-thread handling

### 3. Live API Tests (48 tests)
Comprehensive tests that exercise the Anthropic Claude API. **Requires API key.**

**Locations:**
- `src/lib/query/__tests__/handler.live.test.ts` (8 tests)
- `src/lib/activation/__tests__/decider.live.test.ts` (10 tests)
- `src/lib/memory/__tests__/summarizer.live.test.ts` (11 tests)
- `src/mcp-servers/dynamic-skills/__tests__/invoker.live.test.ts` (10 tests)

## Running Tests

### Run All Tests
```bash
# Run complete test suite
npm test

# Run with coverage report
npm test -- --coverage

# Run in watch mode (auto-rerun on changes)
npm test -- --watch
```

### Run Specific Test Suites

```bash
# Unit tests only (fast, no API key needed)
npm test -- parser.test.ts
npm test -- store.test.ts
npm test -- tracker.test.ts

# Integration tests
npm test -- integration.test.ts

# Live API tests (requires API key)
npm test -- handler.live.test.ts
npm test -- decider.live.test.ts
npm test -- summarizer.live.test.ts
npm test -- invoker.live.test.ts
```

### Running Without API Key

If `ANTHROPIC_API_KEY` is not set, live API tests will be skipped automatically:

```bash
# This will run unit tests and basic integration tests
# Live API tests will show "Skipped" status
npm test
```

Output will show:
```
⚠️  Skipping Query Handler live API tests - ANTHROPIC_API_KEY not set
⚠️  Skipping Activation Decider live API tests - ANTHROPIC_API_KEY not set
⚠️  Skipping Memory Summarizer live API tests - ANTHROPIC_API_KEY not set
⚠️  Skipping Dynamic Skills Invoker live API tests - ANTHROPIC_API_KEY not set
```

### Running With API Key

Set your API key to run the full test suite:

```bash
# Set API key for current session
export ANTHROPIC_API_KEY=sk-ant-your-key-here

# Run full test suite including live API tests
npm test
```

## API Costs

### Cost Estimates per Test Run

Live API tests make actual calls to Claude. Here are approximate costs:

| Test Suite | Tests | Est. Tokens | Est. Cost |
|------------|-------|-------------|-----------|
| Query Handler | 8 | ~15,000 | $0.05-0.10 |
| Activation Decider | 10 | ~10,000 | $0.03-0.05 |
| Memory Summarizer | 11 | ~12,000 | $0.03-0.05 |
| Dynamic Skills Invoker | 10 | ~18,000 | $0.05-0.10 |
| Integration (API tests) | 2 | ~5,000 | $0.01-0.02 |
| **Total per run** | **41** | **~60,000** | **$0.17-0.32** |

**Note:** Costs are estimates based on typical usage. Actual costs vary based on:
- Email content length
- Model response length
- Claude API pricing (currently ~$3 per million input tokens, ~$15 per million output tokens for claude-3-5-sonnet-20241022)

### Minimizing API Costs

1. **Run unit tests frequently** (free, fast)
2. **Run integration tests periodically** (minimal API usage)
3. **Run live API tests before commits** (full validation)
4. **Use test filters** to run specific suites:
   ```bash
   # Only test query handler changes
   npm test -- handler.live.test.ts
   ```

## Test Organization

```
schrute/
├── src/
│   ├── lib/
│   │   ├── email/__tests__/
│   │   │   └── parser.test.ts              # Unit tests
│   │   ├── speech-acts/__tests__/
│   │   │   └── store.test.ts               # Unit tests
│   │   ├── privacy/__tests__/
│   │   │   └── tracker.test.ts             # Unit tests
│   │   ├── personality/__tests__/
│   │   │   └── loader.test.ts              # Unit tests
│   │   ├── mcp/__tests__/
│   │   │   └── types.test.ts               # Unit tests
│   │   ├── query/__tests__/
│   │   │   └── handler.live.test.ts        # Live API tests
│   │   ├── activation/__tests__/
│   │   │   └── decider.live.test.ts        # Live API tests
│   │   └── memory/__tests__/
│   │       └── summarizer.live.test.ts     # Live API tests
│   ├── mcp-servers/
│   │   └── dynamic-skills/__tests__/
│   │       └── invoker.live.test.ts        # Live API tests
│   └── __tests__/
│       └── integration.test.ts             # Integration tests
└── jest.config.js                          # Jest configuration
```

## Test Configuration

### Jest Configuration

The project uses Jest with TypeScript and ESM support:

```javascript
// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^~/(.*)\.js$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
  ],
}
```

### TypeScript Considerations

Tests are written in TypeScript and use strict type checking:
- All test files use `.test.ts` extension
- Imports use `.js` extension (ESM requirement)
- Module resolution via `~/*` path alias

## Continuous Integration

While not yet configured, the test suite is designed for CI/CD:

### Recommended CI Strategy

```yaml
# Example GitHub Actions workflow
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
    - run: npm install
    - run: npm test              # Unit + integration tests (no API key)

test-with-api:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
    - run: npm install
    - run: npm test              # Full test suite including live API
      env:
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Best Practice:** Run unit/integration tests on every commit, run live API tests on:
- Pull requests
- Scheduled nightly builds
- Pre-release validation

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from '@jest/globals'
import { myFunction } from '../myModule.js'

describe('MyModule', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })
})
```

### Live API Test Example

```typescript
import { describe, it, expect } from '@jest/globals'
import { myApiFunction } from '../myModule.js'

const hasApiKey = !!process.env.ANTHROPIC_API_KEY
const describeIfApiKey = hasApiKey ? describe : describe.skip

describeIfApiKey('MyModule - Live API Tests', () => {
  it('should call Claude API', async () => {
    const result = await myApiFunction('input')
    expect(result.success).toBe(true)
    expect(result.response).toBeDefined()
  }, 30000) // 30 second timeout for API calls
})

if (!hasApiKey) {
  console.log('⚠️  Skipping MyModule live API tests - ANTHROPIC_API_KEY not set')
}
```

## Test Coverage Goals

Current coverage by component:

| Component | Unit Tests | Integration Tests | Live API Tests |
|-----------|------------|-------------------|----------------|
| Email Parser | ✅ (4) | ✅ (included) | N/A |
| Speech Act Store | ✅ (9) | ✅ (included) | N/A |
| Privacy Tracker | ✅ (8) | ✅ (2) | N/A |
| Personality Loader | ✅ (5) | N/A | N/A |
| MCP Types | ✅ (11) | N/A | N/A |
| Query Handler | ⏸️ | ✅ (1) | ✅ (8) |
| Activation Decider | ⏸️ | ⏸️ | ✅ (10) |
| Memory Summarizer | ⏸️ | ⏸️ | ✅ (11) |
| Dynamic Skills | ⏸️ | ⏸️ | ✅ (10) |
| Speech Act Detector | ⏸️ | ✅ (2) | ⏸️ |

**Legend:**
- ✅ = Complete coverage
- ⏸️ = Partial or planned coverage
- N/A = Not applicable

## Troubleshooting

### Common Issues

**Problem:** Tests fail with "Cannot find module" errors
```bash
# Solution: Rebuild the project
npm run build
npm test
```

**Problem:** Live API tests timeout
```bash
# Solution: Increase Jest timeout
npm test -- --testTimeout=60000
```

**Problem:** API rate limiting errors
```bash
# Solution: Run tests with smaller batches or add delays
# Currently, tests are designed to avoid rate limits
# If you encounter issues, run test suites individually
```

**Problem:** Jest experimental VM modules warning
```bash
# This is expected - Jest requires experimental modules for ESM
# The warning can be safely ignored
```

## Next Steps

Future testing improvements:
- [ ] Add performance benchmarks
- [ ] Add E2E tests with MCP servers
- [ ] Add CLI integration tests
- [ ] Increase coverage for edge cases
- [ ] Add mutation testing
- [ ] Set up CI/CD pipeline with automated test runs

## Summary

**Total Test Count:** 93 tests
- 37 unit tests (fast, no API key)
- 8 integration tests (5 fast, 3 require API key)
- 48 live API tests (require API key)

**Running Time:**
- Unit tests: ~5-10 seconds
- Integration tests: ~10-20 seconds (without API tests)
- Live API tests: ~3-5 minutes (with API tests)
- **Full suite: ~5-6 minutes**

**Cost per full test run:** ~$0.17-0.32
