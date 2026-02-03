# Development Guide - Best Practices

**Project:** Pay402  
**Purpose:** General development practices, tooling, and workflows  
**Date:** February 1, 2026

**For Architecture:** See `ARCHITECTURE.md`  
**For Design Decisions:** See `DESIGN_RATIONALE.md`

---

## 🎯 Development Philosophy

### Anti-Bloat Principles

**We actively fight documentation bloat:**
1. **One source of truth** - Avoid duplicate docs
2. **Just-in-time docs** - Document when needed, not "just in case"
3. **Delete ruthlessly** - Remove outdated content immediately
4. **Commit messages > comments** - Code explains what, commits explain why
5. **Examples > explanations** - Show, don't tell

**Red flags of bloat:**
- Multiple "getting started" guides
- Outdated deployment instructions
- Conflicting README files
- "Architecture v1", "Architecture v2" coexisting
- Long tutorial walkthroughs

**When in doubt:** Delete and let git history preserve it.

---

## 🛠️ Tech Stack

### Core Technologies

```
┌─────────────────────────────────────────────┐
│ Blockchain        │ SUI (Move language)     │
│ Backend           │ Node.js 20+ + TypeScript│
│ Frontend          │ React 18 + TypeScript   │
│ Testing           │ Vitest + Move tests     │
│ Development       │ tsx, vite, suibase      │
└─────────────────────────────────────────────┘
```

### Local Development Tools

- **Suibase:** Local SUI network manager (see `HackMoney_Research/SUI_Dev_Setup/SUIBASE_GUIDE.md`)
- **tmux:** Terminal multiplexer for parallel processes
- **tsx:** TypeScript execution (no build step needed)
- **vite:** Fast frontend dev server

---

## 🧪 Testing Strategy

### Test Pyramid

```
     /\
    /  \     E2E Tests (few)
   /────\    - Full payment flow
  / Integration \ - API + blockchain
 /──────────────\  - Widget + facilitator
/  Unit Tests    \ - Move functions
───────────────────  - TypeScript utils
   (most tests)      - PTB verifier
```

### Move Contract Testing

**Philosophy:** Test everything in Move, minimize integration tests.

```bash
# Run all Move tests
lsui move test

# Run specific test
lsui move test test_settle_payment

# Run with coverage
lsui move test --coverage

# Run with gas profiling
lsui move test --gas-profile
```

**Best Practices:**
- Test each function in isolation
- Use `test_scenario` for multi-step flows
- Test edge cases (zero amounts, insufficient balance)
- Use `#[expected_failure]` for error cases
- Keep tests fast (<100ms each)

**Example:**
```move
#[test]
fun test_settle_payment() {
    let user = @0xA;
    let merchant = @0xB;
    
    let mut scenario = test_scenario::begin(user);
    {
        let mut coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
        let receipt = payment::settle_payment(&mut coin, 100, merchant, scenario.ctx());
        // Assertions...
        coin::burn_for_testing(coin);
    };
    scenario.end();
}
```

### Backend Testing (Facilitator)

```bash
# Run API tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test balance.test.ts

# Watch mode
npm test -- --watch
```

**Structure:**
```typescript
// facilitator/tests/facilitator.test.ts
describe('POST /check-balance', () => {
  it('returns balance for valid address', async () => {
    const response = await request(app)
      .post('/check-balance')
      .send({ address: testAddress, network: 'localnet' });
    
    expect(response.status).toBe(200);
    expect(response.body.balance).toBeDefined();
  });
});
```

### Frontend Testing (Widget)

```bash
# Unit tests
npm test

# Component tests
npm test PaymentPage.test.tsx

# Verifier tests (critical!)
npm test verifier.test.ts
```

**Verifier Test Coverage:**
```typescript
describe('PTB Template Verifier', () => {
  it('accepts valid payment PTB', () => {
    const result = verifyPaymentPTB(validPTB, invoice);
    expect(result.pass).toBe(true);
  });
  
  it('rejects PTB with wrong amount', () => {
    const result = verifyPaymentPTB(wrongAmountPTB, invoice);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('amount mismatch');
  });
  
  it('rejects PTB with unauthorized transfer', () => {
    const result = verifyPaymentPTB(extraTransferPTB, invoice);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('unauthorized transfer');
  });
});
```

### Integration Testing

**Manual Flow Test:**
```bash
# 1. Start localnet
localnet start

# 2. Start facilitator
cd facilitator && npm run dev

# 3. Fund test address
curl -X POST http://localhost:3001/fund \
  -H "Content-Type: application/json" \
  -d '{"address":"0xtest...","sessionId":"test"}'

# 4. Check balance
curl -X POST http://localhost:3001/check-balance \
  -H "Content-Type: application/json" \
  -d '{"address":"0xtest...","network":"localnet"}' | jq .

# 5. Simulate payment (see ARCHITECTURE.md for full flow)
```

---

## 🔄 Development Workflow

### Incremental Development

**Golden Rule:** Commit after each working feature, not at end of day.

```bash
# Small, focused commits
git commit -m "feat(move): add settle_payment function"
git commit -m "test(move): add test for zero amount edge case"
git commit -m "fix(move): handle insufficient balance error"
```

**Commit Message Convention:**
```
type(scope): description

Types: feat, fix, refactor, test, docs, chore
Scopes: move, facilitator, widget, demo
```

### Branch Strategy

**Hackathon (simple):**
```bash
main              # Always deployable
├── feature/ptb-verifier
├── feature/zklogin-integration
└── fix/gas-estimation
```

**Post-Hackathon (GitFlow):**
```bash
main              # Production
├── develop       # Integration
│   ├── feature/cross-chain
│   └── feature/privacy-receipts
└── hotfix/critical-bug
```

### Code Review Checklist

Before merging:
- [ ] All tests pass
- [ ] No linter errors
- [ ] Updated relevant docs (if API changed)
- [ ] Committed `.env.example` (not `.env`!)
- [ ] No TODOs left uncommented
- [ ] Gas costs acceptable (if Move changes)

---

## 🐛 Debugging

### Move Contract Debugging

```bash
# Check transaction failure
sui client transaction 0xTX_DIGEST

# View events
sui client events --tx-digest 0xTX_DIGEST

# Inspect object
sui client object 0xOBJECT_ID

# Dry run transaction
sui client publish --dry-run
```

**Common Move Errors:**
```
Error: Insufficient gas
→ Increase --gas-budget

Error: Coin value mismatch
→ Check coin::value() before split

Error: Object not owned
→ Check transfer ownership

Error: Type mismatch
→ Check generic type parameters <T>
```

### Backend Debugging

```typescript
// Use debug package
import debug from 'debug';
const log = debug('pay402:facilitator');

log('Constructing PTB for %s', buyerAddress);
```

```bash
# Run with debug output
DEBUG=pay402:* npm run dev
```

**Common Backend Errors:**
```
Error: FACILITATOR_PRIVATE_KEY not set
→ Check .env file exists and is loaded

Error: Connection refused (RPC)
→ Check localnet is running: localnet status

Error: Package ID not found
→ Redeploy contract, update PACKAGE_ID in .env
```

### Frontend Debugging

```typescript
// Browser console
console.log('PTB bytes:', Array.from(ptbBytes));
console.log('Verification result:', verification);

// React DevTools
// Check component state, props
```

---

## 📦 Deployment

### Local Deployment

```bash
# 1. Deploy Move contract
cd move/payment
lsui client publish --gas-budget 100000000
# Copy Package ID

# 2. Update facilitator config
cd ../../facilitator
nano .env  # Update PACKAGE_ID

# 3. Restart facilitator
npm run dev
```

### Testnet Deployment

```bash
# 1. Switch to testnet
tsui client publish --gas-budget 100000000

# 2. Update config
# Use .env.testnet or update SUI_NETWORK=testnet

# 3. Deploy facilitator backend
# Railway, Fly.io, Vercel, etc.
```

### Production Checklist

Before mainnet:
- [ ] All tests passing (100% critical paths)
- [ ] Security audit (Move contract)
- [ ] Gas optimization (minimize SUI costs)
- [ ] Rate limiting (prevent abuse)
- [ ] Monitoring (Sentry, DataDog)
- [ ] Backup keys (facilitator private key)
- [ ] Incident response plan

---

## 🚀 Performance

### Move Contract Optimization

```move
// ❌ Bad: Multiple reads
let val1 = coin::value(&coin);
let val2 = coin::value(&coin);

// ✅ Good: Single read
let val = coin::value(&coin);
use val twice
```

```move
// ❌ Bad: Unnecessary object creation
let temp = Receipt { ... };
transfer::transfer(temp, addr);

// ✅ Good: Direct transfer
transfer::transfer(Receipt { ... }, addr);
```

### Backend Optimization

```typescript
// ❌ Bad: Sequential RPC calls
const coin1 = await suiClient.getObject(id1);
const coin2 = await suiClient.getObject(id2);

// ✅ Good: Parallel RPC calls
const [coin1, coin2] = await Promise.all([
  suiClient.getObject(id1),
  suiClient.getObject(id2)
]);
```

### Frontend Optimization

```typescript
// ❌ Bad: Re-parse PTB on every render
function PaymentPage() {
  const parsed = parsePTB(ptbBytes);  // Expensive!
  return <div>{parsed.amount}</div>;
}

// ✅ Good: Memoize parsing
function PaymentPage() {
  const parsed = useMemo(() => parsePTB(ptbBytes), [ptbBytes]);
  return <div>{parsed.amount}</div>;
}
```

---

## 🔐 Security Best Practices

### Environment Variables

```bash
# .env (NEVER commit!)
FACILITATOR_PRIVATE_KEY=suiprivkey1...
DATABASE_URL=postgres://...

# .env.example (DO commit!)
FACILITATOR_PRIVATE_KEY=suiprivkey1...your_key_here
DATABASE_URL=postgres://user:pass@localhost/db
```

### Private Key Management

```typescript
// ❌ Bad: Log private keys
console.log('Key:', privateKey);

// ✅ Good: Log only address
console.log('Address:', address);

// ❌ Bad: Hardcode keys
const key = 'suiprivkey1abc123...';

// ✅ Good: Environment variables
const key = process.env.FACILITATOR_PRIVATE_KEY;
if (!key) throw new Error('Key not set');
```

### Input Validation

```typescript
// ❌ Bad: Trust user input
const amount = req.body.amount;
ptb.splitCoins(coin, [amount]);

// ✅ Good: Validate first
const amount = parseInt(req.body.amount);
if (isNaN(amount) || amount <= 0 || amount > MAX_AMOUNT) {
  return res.status(400).json({ error: 'Invalid amount' });
}
```

---

## 📊 Monitoring

### Key Metrics

**Move Contract:**
- Gas used per transaction
- Event emission rate
- Failed transaction rate

**Facilitator:**
- Request latency (p50, p95, p99)
- RPC call success rate
- PTB construction time
- Active sessions (zkLogin)

**Frontend:**
- Verification pass rate
- Sign success rate
- Time to first payment

### Logging Strategy

```typescript
// Structured logging
log.info('Payment initiated', {
  paymentId,
  amount,
  buyerAddress,
  merchantAddress,
  timestamp: Date.now()
});

// Error logging
log.error('PTB construction failed', {
  error: err.message,
  buyerAddress,
  coinCount,
  stack: err.stack
});
```

---

## 🔧 Troubleshooting

### Common Issues

**Issue: "Tests pass locally but fail in CI"**
- Ensure deterministic test data (no random values)
- Check timezone differences (use UTC)
- Verify SUI version matches

**Issue: "Gas estimation too low"**
- Use `--gas-budget` with buffer (2x estimated)
- Check object count (more objects = more gas)
- Profile with `lsui move test --gas-profile`

**Issue: "Verifier rejects valid PTB"**
- Log PTB bytes and invoice for comparison
- Check byte parsing (endianness)
- Verify template rules match PTB structure

**Issue: "Address changes after browser clear"**
- Salt not persisting (Enoki issue?)
- Check Enoki session management
- Verify salt service availability

---

## 📚 Resources

### Official Documentation

- **SUI Docs:** https://docs.sui.io/
- **Move Book:** https://move-book.com/
- **Enoki SDK:** https://docs.enoki.mystenlabs.com/
- **Suibase:** https://suibase.io/

### Internal Documentation

- **Architecture:** `docs/ARCHITECTURE.md`
- **Design Rationale:** `docs/DESIGN_RATIONALE.md`
- **Suibase Setup:** `../HackMoney_Research/SUI_Dev_Setup/SUIBASE_GUIDE.md`
- **API Reference:** `facilitator/README.md`

### Quick Reference

- **tmux Cheat Sheet:** See `SUIBASE_GUIDE.md` - Daily Workflow section
- **Suibase Commands:** `./scripts/pay402-ref.sh`
- **Git Workflow:** This document - Branch Strategy section

---

## 🎓 Learning Path

### For New Developers

**Week 1: Setup & Basics**
1. Read `ARCHITECTURE.md` (understand the system)
2. Setup Suibase (see `SUIBASE_GUIDE.md`)
3. Run Move tests: `lsui move test`
4. Start facilitator: `npm run dev`
5. Test health endpoint: `curl http://localhost:3001/health`

**Week 2: Development**
1. Modify Move contract (add a field to receipt)
2. Add corresponding API endpoint
3. Write tests (Move + TypeScript)
4. Deploy to localnet
5. Integration test (full payment flow)

**Week 3: Deep Dive**
1. Implement PTB verifier enhancement
2. Add new payment template rule
3. Optimize gas costs
4. Add monitoring/logging
5. Security review (peer review checklist)

---

**Last Updated:** February 1, 2026  
**Version:** 2.0 (Simplified - removed implementation walkthroughs)  
**Companion to:** `ARCHITECTURE.md`, `DESIGN_RATIONALE.md`
