# Browser Automation Guide

## Overview

Pay402 uses the **cursor-ide-browser MCP server** for automated end-to-end testing of the full user journey.

## How It Works

```
User/AI Agent → MCP Tools → Playwright → Chrome → Your App
```

1. **AI Agent** (Claude) calls MCP tools with JSON parameters
2. **MCP Server** translates to Playwright commands
3. **Playwright** controls a real Chrome browser
4. **Browser** interacts with your running services (localhost)

## Available Tools

### Navigation

- `browser_navigate` - Go to URL
- `browser_tabs` - Manage tabs (list/create/select/close)

### Inspection

- `browser_snapshot` - Get page structure (accessibility tree)
- `browser_console_messages` - Read console logs
- `browser_network_requests` - See network calls

### Interaction

- `browser_click` - Click elements by reference
- `browser_fill` - Fill form inputs
- `browser_type` - Type text character-by-character
- `browser_press_key` - Press keyboard keys (e.g., Enter, Ctrl+V)
- `browser_scroll` - Scroll page or element into view

### Control

- `browser_lock` - Prevent user interaction during automation
- `browser_unlock` - Return control to user

## Example: Simple Flow

```typescript
// 1. Navigate to merchant page
browser_navigate({ url: "http://localhost:3002" });

// 2. Lock browser (prevent user interference)
browser_lock();

// 3. Get page snapshot to find elements
browser_snapshot({ interactive: true });
// Returns: { ref: "e0", name: "Get Premium Data", role: "button" }

// 4. Click button
browser_click({
  element: "Get Premium Data button",
  ref: "e0",
});

// 5. Wait for response
// (use browser_snapshot to check page changed)

// 6. Unlock when done
browser_unlock();
```

## Critical Concepts

### 1. **Element References (`ref`)**

Every interactive element gets a unique reference ID:

```yaml
- role: button
  name: "Pay Now"
  ref: e5 # ← Use this to click
```

### 2. **Page Snapshots**

Always take a snapshot BEFORE interacting:

```typescript
// WRONG:
browser_click({ ref: "e0" }); // Might not exist!

// RIGHT:
snapshot = browser_snapshot();
// Verify element exists in snapshot
browser_click({ ref: "e0" });
```

### 3. **Timing**

- Browser actions are NOT instant
- Use `Shell` with `sleep` to wait for responses
- Check snapshots to verify state changes

### 4. **Multiple Tabs**

```typescript
// Open new tab
browser_navigate({ url: "...", newTab: true });

// List tabs
browser_tabs({ action: "list" });
// Returns: [0] page1, [1] page2

// Switch to tab
browser_tabs({ action: "select", index: 1 });
```

## Full E2E Test Flow

### Prerequisites

All services must be running:

```bash
# Terminal 1: Localnet
cd pay402-contracts && sui start --epoch-duration-ms 60000

# Terminal 2: Facilitator
cd facilitator && npm run dev

# Terminal 3: Merchant
cd merchant && npm run dev

# Terminal 4: Widget
cd widget && npm run dev
```

### Test Steps

1. **Navigate to Merchant**

   ```typescript
   browser_navigate({
     url: "http://localhost:3002",
     newTab: true,
     position: "side", // Opens in side panel
   });
   ```

2. **Request Premium Data**

   ```typescript
   browser_lock();
   browser_snapshot({ interactive: true });
   browser_click({ element: "Get Premium Data button", ref: "e0" });
   // Wait 2s for invoice generation
   browser_snapshot(); // Verify invoice appeared
   ```

3. **Copy Invoice JWT**

   ```typescript
   browser_click({ element: "Copy Invoice JWT button", ref: "e8" });
   // JWT now in clipboard
   ```

4. **Navigate to Widget**

   ```typescript
   browser_click({ element: "Open Payment Page link", ref: "e9" });
   // Opens in new tab automatically (target="_blank")
   browser_tabs({ action: "select", index: 1 });
   ```

5. **Sign In**

   ```typescript
   browser_snapshot({ interactive: true });
   browser_click({ element: "Sign In with Demo Keypair button", ref: "e1" });
   ```

6. **Paste Invoice**

   ```typescript
   browser_snapshot(); // Find textbox ref
   browser_fill({
     element: "Invoice JWT textbox",
     ref: "e1",
     value: "<jwt-from-api>", // Get via curl
   });
   browser_click({ element: "Continue button", ref: "e2" });
   ```

7. **Fund Account (if needed)**

   ```typescript
   browser_snapshot();
   // If "Get Test SUI" button exists:
   browser_click({ element: "Get Test SUI button", ref: "e4" });
   // Wait 5s for funding
   ```

8. **Continue to Payment**

   ```typescript
   browser_snapshot(); // Verify button enabled
   browser_click({ element: "Continue to Payment button", ref: "e5" });
   ```

9. **Verify Result**

   ```typescript
   // Wait 3s for payment processing
   browser_snapshot();
   // Check for "Payment Successful" or "Payment Failed"
   ```

10. **Unlock Browser**
    ```typescript
    browser_unlock();
    ```

## Timing Measurements

Use Shell to record timestamps:

```bash
# Start of flow
echo "START=$(date +%s%3N)" > /tmp/timing.txt

# After key steps
echo "INVOICE_GEN=$(date +%s%3N)" >> /tmp/timing.txt
echo "PAYMENT_COMPLETE=$(date +%s%3N)" >> /tmp/timing.txt

# Calculate deltas
cat /tmp/timing.txt
```

## Debugging

### View Console Logs

```typescript
browser_console_messages({ viewId: "e04fe1" });
```

### View Network Requests

```typescript
browser_network_requests({ viewId: "e04fe1" });
```

### Take Screenshot

```typescript
browser_take_screenshot({ viewId: "e04fe1" });
```

### Check Current URL

```typescript
snapshot = browser_snapshot();
// Returns: { url: "http://localhost:5173/...", title: "..." }
```

## Common Issues

### Issue 1: Element Not Found

**Symptom:** `Click target intercepted` or `Element not found`

**Solution:**

```typescript
// Scroll element into view first
browser_scroll({ ref: "e9", scrollIntoView: true });
browser_click({ ref: "e9" });
```

### Issue 2: Element Not Enabled

**Symptom:** Button exists but disabled

**Solution:**

```typescript
snapshot = browser_snapshot();
// Check if states includes "disabled"
// If yes, wait or perform prerequisite action
```

### Issue 3: Timing Issues

**Symptom:** Action happens before page loads

**Solution:**

```bash
# Add explicit waits
sleep 2
browser_snapshot()  # Verify page changed
```

## Best Practices

1. **Always lock browser during automation**

   ```typescript
   browser_lock(); // Start
   // ... automation steps ...
   browser_unlock(); // End
   ```

2. **Snapshot before every interaction**

   ```typescript
   snapshot = browser_snapshot();
   // Verify element exists
   browser_click({ ref: "..." });
   ```

3. **Use descriptive element names**

   ```typescript
   // GOOD:
   browser_click({ element: "Continue to Payment button", ref: "e5" });

   // BAD:
   browser_click({ ref: "e5" }); // What is this?
   ```

4. **Handle multiple tabs explicitly**

   ```typescript
   browser_tabs({ action: "list" }); // Check which tab is active
   browser_tabs({ action: "select", index: 1 }); // Switch explicitly
   ```

5. **Clean up after tests**
   ```typescript
   browser_tabs({ action: "close" }); // Close test tabs
   browser_unlock(); // Return control to user
   ```

## Future Automation Ideas

1. **Compare Settlement Modes**

   - Run full flow twice (optimistic vs pessimistic)
   - Measure `START → CONTENT_DISPLAYED`
   - Show side-by-side timing

2. **First-Time User Flow**

   - No existing wallet
   - Generate new keypair
   - Fund from faucet
   - Complete payment

3. **Error Scenarios**

   - Insufficient balance
   - Expired invoice
   - Network timeout

4. **Multi-Purchase Flow**
   - Buy multiple items in sequence
   - Verify balance decreases correctly

## Resources

- MCP Browser Tools: `/home/hamiha70/.cursor/projects/.../mcps/cursor-ide-browser/tools/`
- Test Results: `/docs/testing/BROWSER_E2E_RESULTS.md`
- Full Flow Script: `/scripts/test-browser-e2e.sh`
