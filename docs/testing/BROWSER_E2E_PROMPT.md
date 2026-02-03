# Browser E2E Test - AI Agent Prompt

## Purpose
This prompt instructs an AI agent to run a complete browser-based end-to-end test of the Pay402 payment flow, measuring timing at each step.

## Prerequisites

**Services Running:**
- Localnet: `sui start` on port 9000
- Facilitator: `npm run dev` on port 3001
- Merchant: `npm run dev` on port 3002
- Widget: `npm run dev` on port 5173

**Verify before starting:**
```bash
curl -s http://localhost:3001/health
curl -s http://localhost:3002/health
curl -s http://localhost:5173 | head -5
```

---

## 🤖 AI AGENT PROMPT (Copy & Paste)

```
Run a complete browser-based end-to-end test of the Pay402 payment flow.

OBJECTIVE:
Measure the full user journey from "Get Premium Data" to content delivery, testing BOTH optimistic and pessimistic settlement modes.

STEPS:

1. SETUP & TIMING
   - Create timing log: echo "TEST_START=$(date +%s%3N)" > /tmp/e2e-timing.txt
   - Record all timestamps in this file

2. NAVIGATE TO MERCHANT
   - browser_navigate to http://localhost:3002 (newTab: true, position: "side")
   - browser_lock
   - browser_snapshot to verify page loaded

3. REQUEST PREMIUM DATA
   - Record: echo "CLICK_GET_DATA=$(date +%s%3N)" >> /tmp/e2e-timing.txt
   - browser_click on "Get Premium Data" button
   - Wait 2 seconds
   - browser_snapshot to verify invoice appeared
   - Record: echo "INVOICE_RECEIVED=$(date +%s%3N)" >> /tmp/e2e-timing.txt

4. OPEN WIDGET
   - Get invoice JWT via: curl -s http://localhost:3002/api/premium-data | jq -r '.invoice'
   - Save to variable: INVOICE_JWT=<result>
   - browser_scroll to "Open Payment Page" link
   - browser_click the link
   - Record: echo "WIDGET_OPENED=$(date +%s%3N)" >> /tmp/e2e-timing.txt
   - browser_tabs list to find widget tab
   - browser_tabs select widget tab

5. SIGN IN
   - browser_lock on widget tab
   - browser_snapshot (interactive: true)
   - browser_click "Sign In with Demo Keypair" button
   - Record: echo "SIGNED_IN=$(date +%s%3N)" >> /tmp/e2e-timing.txt

6. ENTER INVOICE
   - browser_snapshot to find textbox ref
   - browser_fill the invoice JWT textbox with $INVOICE_JWT
   - browser_click "Continue" button
   - Record: echo "INVOICE_ENTERED=$(date +%s%3N)" >> /tmp/e2e-timing.txt

7. FUND ACCOUNT
   - Wait 2 seconds
   - browser_snapshot
   - If "Get Test SUI" button exists:
     - browser_click it
     - Wait 5 seconds for funding
     - Record: echo "ACCOUNT_FUNDED=$(date +%s%3N)" >> /tmp/e2e-timing.txt

8. CONTINUE TO PAYMENT
   - browser_snapshot to verify "Continue to Payment" enabled
   - Record: echo "PAYMENT_CLICK=$(date +%s%3N)" >> /tmp/e2e-timing.txt
   - browser_click "Continue to Payment" button

9. WAIT FOR PAYMENT RESULT
   - Wait 3 seconds
   - browser_snapshot
   - Record: echo "PAYMENT_RESULT=$(date +%s%3N)" >> /tmp/e2e-timing.txt
   - Check for success or failure message

10. CALCULATE RESULTS
    - cat /tmp/e2e-timing.txt
    - Calculate deltas:
      * Data Request → Invoice: INVOICE_RECEIVED - CLICK_GET_DATA
      * Invoice → Widget Open: WIDGET_OPENED - INVOICE_RECEIVED
      * Widget → Sign In: SIGNED_IN - WIDGET_OPENED
      * Sign In → Invoice Enter: INVOICE_ENTERED - SIGNED_IN
      * Invoice → Funding: ACCOUNT_FUNDED - INVOICE_ENTERED
      * Funding → Payment: PAYMENT_CLICK - ACCOUNT_FUNDED
      * Payment → Result: PAYMENT_RESULT - PAYMENT_CLICK
      * TOTAL: PAYMENT_RESULT - CLICK_GET_DATA

11. CLEANUP
    - browser_console_messages to check for errors
    - browser_unlock
    - Display summary with all timing deltas

12. REPORT
    - Create markdown report with:
      * Success/Failure status
      * Timing breakdown
      * Screenshots of key steps
      * Any errors encountered

IMPORTANT NOTES:
- Use explicit waits (sleep) after actions that trigger async operations
- Always browser_snapshot before clicking to verify element exists
- Record EVERY timestamp for accurate measurements
- If payment fails, capture console logs and page snapshot
- Test should be fully automated - no manual intervention

OUTPUT FORMAT:
```markdown
# E2E Test Results

## Status: [PASS/FAIL]

## Timing Breakdown:
- Data Request → Invoice: XXms
- Invoice → Widget: XXms
- Widget → Sign In: XXms
- Sign In → Invoice Enter: XXms
- Invoice → Funding: XXms
- Funding → Payment: XXms
- Payment → Result: XXms

**TOTAL USER JOURNEY: XXXms**

## Key Observations:
- [List any issues, errors, or notable behavior]

## Console Errors:
[Any JavaScript errors]
```

BEGIN TEST NOW.
```

---

## Usage

### One-Time Run
1. Copy the prompt above
2. Paste to AI agent
3. Agent executes full test
4. Review results

### Scheduled/Automated
Create a wrapper script that invokes the AI with this prompt:

```bash
#!/bin/bash
# scripts/run-browser-e2e.sh

# Start services if not running
# ...

# Invoke AI agent with prompt
cursor-ai "$(cat docs/testing/BROWSER_E2E_PROMPT.md)"

# Parse results
# ...
```

## Variations

### Test Optimistic Only
Add to prompt:
```
SETTLEMENT MODE: optimistic
(Skip pessimistic test)
```

### Test Pessimistic Only
Add to prompt:
```
SETTLEMENT MODE: pessimistic
(Skip optimistic test)
```

### Test Both Modes
Add to prompt:
```
RUN TWICE:
1. First run with optimistic mode
2. Second run with pessimistic mode
3. Compare timing results
```

### Test With Fresh Wallet
Add to prompt:
```
WALLET SETUP:
- Do NOT use demo keypair
- Generate new wallet
- Fund from faucet
- Complete payment
(Tests first-time user experience)
```

## Expected Results

### Successful Test (Optimistic)
```
TOTAL: ~150-250ms
- Data Request → Invoice: ~20ms
- Invoice → Widget: ~50ms
- Widget → Sign In: ~10ms
- Sign In → Invoice Enter: ~10ms
- Invoice → Funding: ~5000ms (one-time)
- Funding → Payment: ~10ms
- Payment → Result: ~50ms (no wait for finality!)
```

### Successful Test (Pessimistic)
```
TOTAL: ~300-400ms
- Data Request → Invoice: ~20ms
- Invoice → Widget: ~50ms
- Widget → Sign In: ~10ms
- Sign In → Invoice Enter: ~10ms
- Invoice → Funding: ~0ms (already funded)
- Funding → Payment: ~10ms
- Payment → Result: ~200ms (WAITS for finality)
```

## Troubleshooting

### Test Hangs
- Check services are running
- Verify ports 3001, 3002, 5173 accessible
- Check browser console for errors

### Payment Fails
- Verify buyer address in invoice matches wallet
- Check account has sufficient balance
- Verify invoice not expired

### Timing Inconsistent
- Run multiple times and average
- Localnet has variable latency
- Consider testnet for realistic timing

## Future Enhancements

1. **Parallel Mode Testing**
   - Run optimistic and pessimistic simultaneously
   - Compare side-by-side

2. **Video Recording**
   - Capture full browser session
   - Show in demo

3. **Performance Regression**
   - Run on every commit
   - Alert if latency increases

4. **Multi-Browser**
   - Test on Chrome, Firefox, Safari
   - Verify cross-browser compatibility
