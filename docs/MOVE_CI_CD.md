# Move Contract CI/CD Pipeline

## Overview

Ensure Move contracts are always deployed and tested before running TypeScript tests.

## Architecture

```
┌─────────────────┐
│  Move Contract  │
│   Changed?      │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  sui move test  │  ← Run Move tests
└────────┬────────┘
         │ Pass
         v
┌─────────────────┐
│ sui client      │  ← Deploy to localnet
│   publish       │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Update .env     │  ← Save Package ID
│  PACKAGE_ID=... │
└────────┬────────┘
         │
         v
┌─────────────────┐
│   npm test      │  ← Run TypeScript tests
│  (facilitator)  │
└─────────────────┘
```

## Implementation

### 1. Deployment Script

**`scripts/deploy-move-contracts.sh`:**
```bash
#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOVE_DIR="$PROJECT_ROOT/move/payment"
ENV_FILE="$PROJECT_ROOT/facilitator/.env"

echo "🔨 Building Move contracts..."
cd "$MOVE_DIR"
sui move build

echo "🧪 Running Move tests..."
sui move test

echo "📦 Publishing to localnet..."
PUBLISH_OUTPUT=$(sui client publish --gas-budget 100000000 --json 2>&1)

if echo "$PUBLISH_OUTPUT" | grep -q "error"; then
    echo "❌ Publish failed:"
    echo "$PUBLISH_OUTPUT"
    exit 1
fi

# Extract package ID
PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.objectChanges[] | select(.type=="published") | .packageId')

if [ -z "$PACKAGE_ID" ] || [ "$PACKAGE_ID" == "null" ]; then
    echo "❌ Failed to extract Package ID"
    echo "$PUBLISH_OUTPUT"
    exit 1
fi

echo "✅ Deployed package: $PACKAGE_ID"

# Update .env
if grep -q "^PACKAGE_ID=" "$ENV_FILE"; then
    sed -i "s/^PACKAGE_ID=.*/PACKAGE_ID=$PACKAGE_ID/" "$ENV_FILE"
else
    echo "PACKAGE_ID=$PACKAGE_ID" >> "$ENV_FILE"
fi

echo "📝 Updated facilitator/.env with PACKAGE_ID=$PACKAGE_ID"
echo "✅ Move contracts deployed and ready!"
```

### 2. Vitest Global Setup

**`facilitator/src/__tests__/global-setup.ts`:**
```typescript
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function setup() {
  console.log('🔧 Validating Move contracts...');
  
  const projectRoot = path.resolve(__dirname, '../../..');
  const envFile = path.join(projectRoot, 'facilitator/.env');
  
  // Check if .env exists
  if (!fs.existsSync(envFile)) {
    throw new Error('.env file not found. Run: npm run deploy:contracts');
  }
  
  // Check if Package ID is set
  const envContent = fs.readFileSync(envFile, 'utf-8');
  const packageIdMatch = envContent.match(/PACKAGE_ID=(.+)/);
  
  if (!packageIdMatch || 
      packageIdMatch[1] === 'YOUR_PACKAGE_ID_HERE' ||
      packageIdMatch[1].trim() === '') {
    throw new Error(
      'Move contracts not deployed. Run: npm run deploy:contracts'
    );
  }
  
  const packageId = packageIdMatch[1].trim();
  console.log(`✅ Package ID found: ${packageId}`);
  
  // Verify Move tests pass
  console.log('🧪 Running Move tests...');
  try {
    execSync('cd ../move/payment && sui move test', { 
      stdio: 'inherit',
      cwd: projectRoot 
    });
    console.log('✅ Move tests passed');
  } catch (error) {
    console.error('❌ Move tests failed');
    throw error;
  }
}

export async function teardown() {
  // Cleanup if needed
}
```

**`facilitator/vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    globalSetup: './src/__tests__/global-setup.ts', // ← Add this
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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

### 3. NPM Scripts

**`facilitator/package.json`:**
```json
{
  "scripts": {
    "deploy:contracts": "bash ../../scripts/deploy-move-contracts.sh",
    "pretest": "npm run check:contracts",
    "check:contracts": "node -e \"const fs=require('fs');const env=fs.readFileSync('.env','utf-8');if(!env.includes('PACKAGE_ID=')||env.includes('YOUR_PACKAGE_ID_HERE')){console.error('❌ Move contracts not deployed. Run: npm run deploy:contracts');process.exit(1);}console.log('✅ Contracts OK');\"",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:with-deploy": "npm run deploy:contracts && npm test"
  }
}
```

**`package.json` (root):**
```json
{
  "scripts": {
    "deploy": "bash scripts/deploy-move-contracts.sh",
    "test:all": "npm run deploy && cd facilitator && npm test && cd ../widget && npm test"
  }
}
```

## Usage

### First Time Setup
```bash
# From project root
npm run deploy

# Or from facilitator
cd facilitator
npm run deploy:contracts
```

### Regular Development
```bash
# Contracts are checked automatically
npm test

# Force redeploy + test
npm run test:with-deploy
```

### CI/CD
```bash
# In GitHub Actions / CI
npm run deploy
npm run test:all
```

## Benefits

1. ✅ **Never forget to deploy** - Tests check automatically
2. ✅ **Always latest version** - Redeploy updates .env
3. ✅ **Type-safe** - TypeScript sees correct Package ID
4. ✅ **Fast feedback** - Move tests run before TS tests
5. ✅ **CI-ready** - One command deploys & tests everything

## Troubleshooting

### "PACKAGE_ID not set"
```bash
npm run deploy:contracts
```

### "Move tests failed"
```bash
cd move/payment
sui move test  # See specific error
```

### "sui CLI environment error"
```bash
sui client active-env  # Should show: localnet
sui client switch --env local  # Try switching
```

## Next Steps

1. Create `scripts/deploy-move-contracts.sh`
2. Add `global-setup.ts` to facilitator
3. Update `package.json` scripts
4. Test the pipeline
5. Add to `.cursorrules` and `TESTING.md`

---

**Status:** Documented - Ready to implement
