# Testing Guide - Pay402

## Testing Framework: Vitest Only

**We use Vitest everywhere.** No Jest, no Mocha, no other frameworks.

### Why Vitest?

- ⚡ **Fast** - Uses Vite's dev server, instant HMR
- 🔧 **Modern** - Native ESM support, no complex config
- 🎯 **Jest-compatible API** - Same `describe`, `it`, `expect`
- 📊 **Great DX** - UI mode, watch mode, coverage
- 🔗 **Consistent** - Same tool for frontend and backend

---

## Test Structure

```
Pay402/
├── facilitator/
│   ├── vitest.config.ts              ← Vitest config (Node.js)
│   └── src/__tests__/
│       ├── setup.ts                  ← Test setup
│       ├── sponsored-transactions.test.ts
│       └── api-integration.test.ts
├── widget/
│   ├── vitest.config.ts              ← Vitest config (jsdom)
│   └── src/__tests__/
│       ├── setup.ts                  ← Test setup
│       └── PaymentPage.test.ts
└── move/payment/
    └── tests/
        └── payment_tests.move        ← Move tests
```

---

## Running Tests

### Quick Reference

```bash
# Run all tests (once)
npm test

# Watch mode (TDD)
npm run test:watch

# Visual UI (debugging)
npm run test:ui

# Coverage report
npm run test:coverage
```

### Facilitator Tests

```bash
cd facilitator

# Run all facilitator tests
npm test

# Watch mode (re-run on file change)
npm run test:watch

# UI mode (visual debugging)
npm run test:ui

# Coverage (70% minimum required)
npm run test:coverage
```

### Widget Tests

```bash
cd widget

# Run all widget tests
npm test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui

# Coverage
npm run test:coverage
```

### Move Tests

```bash
cd move/payment

# Run Move tests
sui move test

# With verbose output
sui move test --verbose

# Specific test
sui move test test_settle_payment
```

---

## Test Types

### 1. Unit Tests

Test individual functions in isolation.

**Example:**

```typescript
import { describe, it, expect } from "vitest";

describe("Transaction Kind Build", () => {
  it("should build transaction kind without gas data", async () => {
    const tx = new Transaction();
    // ... add transaction logic

    const kindBytes = await tx.build({
      client,
      onlyTransactionKind: true,
    });

    expect(kindBytes).toBeInstanceOf(Uint8Array);
    expect(kindBytes.length).toBeGreaterThan(0);
  });
});
```

### 2. Integration Tests

Test API endpoints and multi-component flows.

**Example:**

```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

describe("POST /build-ptb", () => {
  it("should return transaction kind bytes", async () => {
    const response = await request(app).post("/build-ptb").send({
      buyerAddress: "0x123...",
      invoiceJWT: "eyJ...",
    });

    expect(response.status).toBe(200);
    expect(response.body.transactionKindBytes).toBeTruthy();
  });
});
```

### 3. E2E Tests

Test complete user journeys (shell scripts with browser automation).

**Example:**

```bash
# scripts/test-ptb-build.sh
bash scripts/test-ptb-build.sh  # Fast (~150ms)

# scripts/test-browser-e2e.sh
bash scripts/test-browser-e2e.sh  # Slower (~5-10s)
```

---

## Writing Tests

### Test File Naming

✅ **Good:**

- `sponsored-transactions.test.ts`
- `api-integration.test.ts`
- `PaymentPage.test.ts`

❌ **Bad:**

- `sponsored-transactions.spec.ts` (use `.test.ts`)
- `test-api.ts` (wrong naming pattern)
- `SponsoredTransactions.test.ts` (no PascalCase for test files)

### Import Pattern

✅ **Always use Vitest:**

```typescript
import { describe, it, expect, beforeAll, afterEach } from "vitest";
```

❌ **Never use Jest:**

```typescript
import { describe, it, expect } from "@jest/globals"; // WRONG!
```

### Test Structure

```typescript
describe("Feature Name", () => {
  // Setup
  beforeAll(async () => {
    // Runs once before all tests
  });

  afterEach(() => {
    // Runs after each test (cleanup)
  });

  // Test suites
  describe("Specific Functionality", () => {
    it("should do something specific", () => {
      // Arrange
      const input = "test";

      // Act
      const result = doSomething(input);

      // Assert
      expect(result).toBe("expected");
    });

    it("should handle error cases", () => {
      expect(() => {
        doSomethingThatThrows();
      }).toThrow("Expected error message");
    });
  });
});
```

---

## Coverage Requirements

**Minimum: 70% for all metrics**

- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

### Check Coverage

```bash
npm run test:coverage
```

### View Coverage Report

After running coverage:

```bash
# Open HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

---

## Vitest Configuration

### Facilitator (Node.js)

```typescript
// facilitator/vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "node", // Node.js environment
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

### Widget (Browser)

```typescript
// widget/vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom", // Browser environment
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

---

## Common Patterns

### Testing Async Functions

```typescript
it("should handle async operations", async () => {
  const result = await asyncFunction();
  expect(result).toBe("success");
});
```

### Testing Errors

```typescript
it("should throw on invalid input", () => {
  expect(() => {
    validateInput("");
  }).toThrow("Input required");
});

// For async errors
it("should reject promise on error", async () => {
  await expect(async () => {
    await asyncFunctionThatFails();
  }).rejects.toThrow("Error message");
});
```

### Mocking

```typescript
import { vi } from "vitest";

it("should call dependency", () => {
  const mockFn = vi.fn();
  doSomething(mockFn);

  expect(mockFn).toHaveBeenCalledWith("expected-arg");
  expect(mockFn).toHaveBeenCalledTimes(1);
});
```

### Testing API Endpoints

```typescript
import request from "supertest";

it("should return 400 on missing fields", async () => {
  const response = await request(app)
    .post("/endpoint")
    .send({ incomplete: "data" });

  expect(response.status).toBe(400);
  expect(response.body.error).toContain("Missing required fields");
});
```

---

## Debugging Tests

### 1. Run Single Test File

```bash
npm test sponsored-transactions.test.ts
```

### 2. Run Single Test Case

```bash
npm test -t "should build transaction kind"
```

### 3. Use UI Mode

```bash
npm run test:ui
```

Opens browser interface with:

- Test results
- Console logs
- Stack traces
- File inspection

### 4. Add Debug Logs

```typescript
it("should process correctly", () => {
  const data = processData(input);
  console.log("Processed:", data); // Visible in test output
  expect(data).toBeTruthy();
});
```

---

## CI/CD Integration

### GitHub Actions (Example)

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

---

## Best Practices

### ✅ DO

- Use Vitest for all TypeScript tests
- Write descriptive test names
- Test edge cases and errors
- Aim for 70%+ coverage
- Use `beforeAll` for expensive setup
- Mock external dependencies
- Test behavior, not implementation

### ❌ DON'T

- Use Jest or other frameworks
- Test implementation details
- Write brittle tests (too many mocks)
- Skip error cases
- Ignore failing tests
- Commit commented-out tests
- Hard-code environment-specific values

---

## Quick Checklist

Before committing:

- [ ] All tests pass: `npm test`
- [ ] Coverage meets 70%: `npm run test:coverage`
- [ ] No console errors in test output
- [ ] Test names are descriptive
- [ ] Edge cases are covered
- [ ] Using Vitest (not Jest)
- [ ] Setup/teardown is clean

---

## Troubleshooting

### Tests Fail on Import

**Error:** `Cannot find module '@mysten/sui'`

**Fix:** Add to vitest.config.ts:

```typescript
test: {
  deps: {
    inline: ['@mysten/sui'],
  },
}
```

### Tests Timeout

**Error:** Test timeout after 5000ms

**Fix:** Increase timeout:

```typescript
it("slow test", async () => {
  // Do slow thing
}, 10000); // 10 second timeout
```

### Coverage Not Generated

**Fix:** Install coverage provider:

```bash
npm install -D @vitest/coverage-v8
```

### Mock Not Working

**Fix:** Ensure using Vitest's `vi`:

```typescript
import { vi } from "vitest";

const mockFn = vi.fn();
```

---

## Resources

- Vitest Docs: https://vitest.dev/
- API Reference: https://vitest.dev/api/
- Config Options: https://vitest.dev/config/
- Coverage: https://vitest.dev/guide/coverage.html
