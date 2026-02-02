# Pay402 Port Status & Endpoint Reference

## Quick Status Check

```bash
# Test all services:
curl http://localhost:3001/        # Facilitator API info
curl http://localhost:3001/health  # Facilitator health
curl http://localhost:3002/        # Merchant demo page
curl http://localhost:5173/        # Payment page (React app)
```

---

## Port 3001: Facilitator API ✅

**Status:** Running  
**Type:** REST API (JSON responses)  
**Purpose:** Backend service for PTB construction and gas sponsorship

### Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info & endpoint list |
| GET | `/health` | Health check |
| POST | `/check-balance` | Check buyer's USDC balance |
| POST | `/settle-payment` | Construct PTB for payment |
| POST | `/fund` | Fund wallet with test USDC (dev only) |

### Expected Behavior:

- **Root (`/`)**: Returns JSON with service info ✅
- **Not a web page**: This is an API, use curl/fetch to interact
- **CORS enabled**: Can be called from widget

### Example Usage:

```bash
# Get service info:
curl http://localhost:3001/

# Check health:
curl http://localhost:3001/health | jq .

# Check balance:
curl -X POST http://localhost:3001/check-balance \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","network":"localnet"}' | jq .
```

---

## Port 3002: Merchant Demo ✅

**Status:** Running  
**Type:** Web Server (HTML + API)  
**Purpose:** Demo merchant that sells protected content

### Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Merchant demo page (HTML) |
| GET | `/health` | Health check |
| GET | `/api/premium-data` | Get invoice JWT (returns 402) |
| GET | `/api/verify-payment?paymentId=...` | Verify payment & return content |

### Expected Behavior:

- **Root (`/`)**: Shows interactive demo page ✅
- **Browser-friendly**: Visit in browser to test
- **Click "Get Premium Data"**: Returns 402 with invoice JWT

### Browser Access:

```
http://localhost:3002/
```

You should see:
- 🏪 Pay402 Demo Merchant heading
- "Protected Content" section
- "Get Premium Data" button
- Invoice JWT in response box after clicking

---

## Port 5173: Payment Page (Widget) ✅

**Status:** Running  
**Type:** Vite Dev Server (React SPA)  
**Purpose:** User-facing payment interface

### Routes:

| Path | Description |
|------|-------------|
| `/` | Payment page (React app) |
| `/?invoice=JWT` | Payment page with pre-filled invoice |

### Expected Behavior:

- **Root (`/`)**: Shows React payment page ✅
- **Interactive UI**: 7-step payment wizard
- **Toggle mode**: Switch between Payment and Auth Test

### Browser Access:

```
http://localhost:5173/
```

You should see:
- Toggle button (Payment / Auth Test)
- Invoice input field (in Payment mode)
- Sign-in button
- Modern UI with cards and buttons

### URL Parameters:

```
http://localhost:5173/?invoice=eyJhbG...
```

Pre-fills the invoice JWT from merchant.

---

## Port 3000: NOT USED ⚠️

**Status:** Not part of Pay402  
**Possible Causes:**
- Leftover from another project
- Different application running
- Port conflict

**Action:** If you see something on port 3000, it's not related to Pay402.

---

## Troubleshooting

### "Port already in use"

```bash
# Find what's using a port:
lsof -i :3001
lsof -i :3002
lsof -i :5173

# Kill all Pay402 services:
./scripts/pay402-tmux.sh --kill
```

### "Connection refused"

```bash
# Check if localnet is running:
localnet status

# Start if not running:
localnet start

# Restart all services:
./scripts/pay402-tmux.sh --kill
./scripts/pay402-tmux.sh
```

### "404 Not Found"

**If on port 3001 (`/`)**: This was expected behavior (API only), now fixed!  
**If on port 3001 (`/health`)**: Facilitator is not running properly  
**If on port 3002**: Merchant is not running properly  
**If on port 5173**: Widget is not running properly

Check the tmux panes for error messages.

### "Nothing visible in browser"

**Facilitator (3001):**
- ✅ **Now shows**: JSON service info
- ❌ **Will not show**: HTML page (it's an API!)
- Use: `curl http://localhost:3001/` to see JSON

**Merchant (3002):**
- ✅ **Should show**: HTML demo page
- If blank: Check tmux pane 1 for errors

**Widget (5173):**
- ✅ **Should show**: React payment page
- If blank: Check tmux pane 2 for errors
- Check browser console for JS errors

---

## Testing the Full Flow

### 1. Verify All Services Running:

```bash
curl http://localhost:3001/health | jq .status
curl http://localhost:3002/health | jq .status
curl -s http://localhost:5173/ | grep -q "Pay402" && echo "OK"
```

### 2. Get Invoice from Merchant:

```bash
# Via API:
curl http://localhost:3002/api/premium-data | jq .

# Or visit in browser:
# http://localhost:3002/
# Click "Get Premium Data"
```

### 3. Test Payment Page:

```bash
# Visit with invoice:
# http://localhost:5173/?invoice=<JWT_FROM_STEP_2>

# Or paste invoice manually in the UI
```

### 4. Complete Payment:

1. Sign in (zkLogin or fallback)
2. Fund wallet if needed
3. Review invoice
4. PTB verification (watch console!)
5. Sign & submit
6. See success + receipt

---

## Port Summary

| Port | Service | Browser? | Status |
|------|---------|----------|--------|
| 3001 | Facilitator API | No (API) | ✅ |
| 3002 | Merchant Demo | Yes | ✅ |
| 5173 | Payment Page | Yes | ✅ |
| 9000 | SUI RPC (direct) | No | ✅ (Suibase) |
| 44340 | SUI RPC (proxy) | No | ✅ (Suibase) |
| 44380 | Local Explorer | Yes | ✅ (Suibase) |

---

## Need Help?

- **See logs**: Navigate to tmux pane, press `Ctrl-b z` to zoom
- **Save logs**: `Ctrl-b s` saves pane to `~/pay402-pane-*.txt`
- **Restart service**: In tmux pane, `Ctrl-C` then re-run start command
- **Full restart**: `./scripts/pay402-tmux.sh --kill && ./scripts/pay402-tmux.sh`

---

**Last Updated:** 2026-02-02  
**All services:** ✅ Working correctly
