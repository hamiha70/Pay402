#!/bin/bash
# Pay402 Quick Reference - Display this in a tmux pane or terminal
# Usage: ./pay402-ref.sh

cat << 'EOF'
╔════════════════════════════════════════════════════════════════════════════╗
║                       PAY402 DEVELOPMENT QUICK REFERENCE                   ║
╠════════════════════════════════════════════════════════════════════════════╣
║ TMUX SESSION MANAGEMENT                                                    ║
║  ./scripts/pay402-tmux.sh      Launch/attach session (auto-starts all!)   ║
║  ./scripts/pay402-tmux.sh --kill   Stop all servers & kill session        ║
║  ./scripts/pay402-tmux.sh --help   Show full help                         ║
║  tmux attach -t pay402         Re-attach to session                        ║
╠════════════════════════════════════════════════════════════════════════════╣
║ TMUX NAVIGATION                                                            ║
║  Ctrl-b + arrow keys           Navigate between panes                      ║
║  Ctrl-b + z                    Zoom/unzoom pane (FULL SCREEN) ⭐          ║
║  Ctrl-b + d                    Detach (keep running)                       ║
║  Ctrl-b + [                    Enter copy mode (q to exit)                 ║
║  Ctrl-b + ]                    Paste copied text                           ║
║  Ctrl-b + s                    Save current pane to file ⭐                ║
║  Ctrl-b + o                    Open browsers (merchant + widget)           ║
║  Ctrl-b + ?                    Show all keybindings                        ║
║  Ctrl-b :kill-session          Kill entire session                         ║
╠════════════════════════════════════════════════════════════════════════════╣
║ PANE LAYOUT (6 panes)                                                      ║
║  ┌──────────────┬──────────────┬──────────────┐                           ║
║  │ 0: Facilitator│ 1: Merchant  │ 2: Widget    │                           ║
║  │    :3001     │    :3002     │    :5173     │                           ║
║  ├──────────────┼──────────────┼──────────────┤                           ║
║  │ 3: Move Dev  │ 4: Testing   │ 5: Suibase   │                           ║
║  │    (lsui)    │    (curl)    │  (localnet)  │                           ║
║  └──────────────┴──────────────┴──────────────┘                           ║
╠════════════════════════════════════════════════════════════════════════════╣
║ COPY FROM SINGLE PANE (Your Main Concern!) ⭐                             ║
║  Method 1: Zoom (BEST)                                                     ║
║    1. Navigate to pane: Ctrl-b + arrow                                     ║
║    2. Zoom it: Ctrl-b + z                                                  ║
║    3. Select with mouse freely!                                            ║
║    4. Copy: Ctrl+Shift+C                                                   ║
║    5. Unzoom: Ctrl-b + z                                                   ║
║                                                                             ║
║  Method 2: Save to File                                                    ║
║    1. Navigate to pane: Ctrl-b + arrow                                     ║
║    2. Save: Ctrl-b + s                                                     ║
║    3. Open: ~/pay402-pane-TIMESTAMP.txt                                    ║
║                                                                             ║
║  Method 3: tmux Copy Mode                                                  ║
║    1. Enter: Ctrl-b + [                                                    ║
║    2. Navigate with arrows                                                 ║
║    3. Start selection: Space                                               ║
║    4. Copy: Enter                                                          ║
║    5. Paste: Ctrl-b + ]                                                    ║
╠════════════════════════════════════════════════════════════════════════════╣
║ SUIBASE LOCALNET (Pane 5)                                                  ║
║  localnet start                Start local network (daemon)                ║
║  localnet status               Check all services                          ║
║  localnet stop                 Stop network                                ║
║  localnet regen                Reset network (wipes all data!)             ║
║  lsui client addresses         List all addresses                          ║
║  lsui client active-address    Show current active address                 ║
║  lsui client gas               Check gas balances                          ║
║  lsui client faucet            Get test SUI for active address             ║
╠════════════════════════════════════════════════════════════════════════════╣
║ MOVE DEVELOPMENT (Pane 3)                                                  ║
║  cd ~/Projects/.../Pay402/contract                                         ║
║  lsui move test                Run Move unit tests                         ║
║  lsui move build               Compile contracts                           ║
║  lsui client publish \                                                     ║
║    --gas-budget 100000000      Deploy package to localnet                  ║
║  cat Move.lock                 View deployed package IDs                   ║
║  cat Publications.toml         View deployment history                     ║
╠════════════════════════════════════════════════════════════════════════════╣
║ FACILITATOR BACKEND (Pane 0 - Auto-started)                                ║
║  Port: 3001                                                                ║
║  npm run dev                   Start dev server (tsx watch)                ║
║  npm test                      Run Vitest tests                            ║
║  npm run build                 Compile TypeScript                          ║
║  npm run lint                  Run ESLint                                  ║
║                                                                             ║
║  After redeploying Move contract:                                          ║
║    1. Copy Package ID from deploy output                                   ║
║    2. nano .env → Update PACKAGE_ID                                        ║
║    3. Restart: Ctrl-C, npm run dev                                         ║
╠════════════════════════════════════════════════════════════════════════════╣
║ MERCHANT BACKEND (Pane 1 - Auto-started)                                   ║
║  Port: 3002                                                                ║
║  node src/index.js             Start merchant server                       ║
║  node setup-keys.js            Generate new merchant keypair               ║
║                                                                             ║
║  Config: merchant/.env                                                     ║
║    MERCHANT_ADDRESS            Ed25519 address                             ║
║    MERCHANT_PRIVATE_KEY        Bech32 format (suiprivkey1...)              ║
║    FACILITATOR_ADDRESS         From facilitator/.env                       ║
╠════════════════════════════════════════════════════════════════════════════╣
║ PAYMENT PAGE (Pane 2 - Auto-started)                                       ║
║  Port: 5173                                                                ║
║  npm run dev                   Start Vite dev server                       ║
║  npm run build                 Build for production                        ║
║  npm test                      Run widget tests                            ║
║                                                                             ║
║  Config: widget/.env                                                       ║
║    VITE_ENOKI_API_KEY          (optional - enables zkLogin)                ║
║    VITE_SUI_NETWORK            localnet/testnet/mainnet                    ║
╠════════════════════════════════════════════════════════════════════════════╣
║ TESTING (Pane 4)                                                           ║
║  # Health checks (wait 10 sec after startup)                               ║
║  curl http://localhost:3001/health | jq .                                  ║
║  curl http://localhost:3002/health | jq .                                  ║
║  curl http://localhost:5173 > /dev/null && echo "OK"                       ║
║                                                                             ║
║  # Get invoice from merchant                                               ║
║  curl http://localhost:3002/api/premium-data | jq .                        ║
║                                                                             ║
║  # Check balance                                                           ║
║  curl -X POST http://localhost:3001/check-balance \                        ║
║    -H "Content-Type: application/json" \                                   ║
║    -d '{"address":"0xf7ae...","network":"localnet"}' | jq .                ║
║                                                                             ║
║  # View Move contract tests                                                ║
║  cd ~/Projects/.../Pay402/contract && lsui move test                       ║
║                                                                             ║
║  # View PTB Verifier tests                                                 ║
║  cd ~/Projects/.../Pay402/widget && npm test verifier                      ║
╠════════════════════════════════════════════════════════════════════════════╣
║ NETWORK PORTS                                                              ║
║  9000        SUI RPC (direct)                                              ║
║  44340       SUI RPC (via proxy)                                           ║
║  9123        Faucet                                                        ║
║  44380       Local Explorer (browser)                                      ║
║  3001        Facilitator API                                               ║
║  3002        Merchant API                                                  ║
║  5173        Payment Page (Vite)                                           ║
╠════════════════════════════════════════════════════════════════════════════╣
║ COMMON WORKFLOWS                                                           ║
║                                                                             ║
║  🌅 Morning Startup:                                                       ║
║    1. cd ~/Projects/.../Pay402                                             ║
║    2. ./scripts/pay402-tmux.sh                                             ║
║    3. Wait 10 seconds → all servers auto-start!                            ║
║    4. Browsers open automatically (merchant + payment page)                ║
║    5. Start testing! 🚀                                                    ║
║                                                                             ║
║  🔄 Redeploy Contract:                                                     ║
║    1. Pane 3: cd ~/Projects/.../Pay402/contract                            ║
║    2. Pane 3: lsui move test                                               ║
║    3. Pane 3: lsui client publish --gas-budget 100000000                   ║
║    4. Copy Package ID: 0x...                                               ║
║    5. Pane 0: Ctrl-C, nano .env (update PACKAGE_ID), npm run dev           ║
║                                                                             ║
║  🧪 Test Full Payment Flow (End-to-End):                                   ║
║    1. Visit merchant: http://localhost:3002                                ║
║    2. Click "Get Premium Data" → Copy invoice JWT                          ║
║    3. Visit payment page: http://localhost:5173                            ║
║    4. Paste invoice JWT                                                    ║
║    5. Sign in (zkLogin or fallback)                                        ║
║    6. Fund wallet if needed (10 SUI + 100 USDC)                            ║
║    7. Review invoice details                                               ║
║    8. Client-side PTB verification (watch console!)                        ║
║    9. Sign & submit transaction                                            ║
║    10. See success + receipt with on-chain event!                          ║
║                                                                             ║
║  📋 Copy Server Logs to Share:                                             ║
║    1. Navigate to pane (e.g., Pane 0 for facilitator)                      ║
║    2. Zoom it: Ctrl-b + z                                                  ║
║    3. Scroll with Shift+PageUp/PageDown                                    ║
║    4. Select text with mouse                                               ║
║    5. Copy: Ctrl+Shift+C                                                   ║
║    6. Unzoom: Ctrl-b + z                                                   ║
║    OR: Ctrl-b + s (saves to ~/pay402-pane-*.txt)                           ║
║                                                                             ║
║  🌙 End of Day:                                                            ║
║    Method 1: Just close terminal (tmux keeps running)                      ║
║    Method 2: ./scripts/pay402-tmux.sh --kill (clean shutdown)              ║
║    Method 3: Ctrl-b :kill-session (from inside tmux)                       ║
╠════════════════════════════════════════════════════════════════════════════╣
║ TROUBLESHOOTING                                                            ║
║  Connection refused           → localnet start (Pane 5)                    ║
║  Package ID mismatch          → Update .env, restart facilitator           ║
║  Out of gas                   → lsui client faucet (Pane 5)                ║
║  Out of USDC                  → Fund via facilitator /fund-wallet          ║
║  Network state corrupted      → localnet regen (nuclear option)            ║
║  Servers won't start          → ./scripts/pay402-tmux.sh --kill, retry     ║
║  Port already in use          → lsof -ti:3001,3002,5173 | xargs kill -9    ║
║  Tmux pane frozen             → Ctrl-b + q [number] to jump                ║
║  Can't copy text              → Ctrl-b + z (zoom pane first!) ⭐           ║
║  Browser won't open           → Manually visit localhost:3002 & :5173      ║
║  PTB verification fails       → Check amounts, recipients in console       ║
║  zkLogin not working          → Check VITE_ENOKI_API_KEY or use fallback   ║
╠════════════════════════════════════════════════════════════════════════════╣
║ BROWSER URLs (Auto-opened after 8 seconds)                                 ║
║  http://localhost:3002         Merchant demo page                          ║
║  http://localhost:5173         Payment page (widget)                       ║
║  http://localhost:3001/health  Facilitator health check                    ║
║  http://localhost:44380        Local SUI Explorer                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║ KEY COMPONENTS                                                             ║
║  ✅ Move Contract:      On-chain payment settlement                        ║
║  ✅ Facilitator:        PTB construction, gas sponsorship                  ║
║  ✅ Merchant:           Invoice generation (EdDSA JWT)                     ║
║  ✅ Payment Page:       7-step payment wizard                              ║
║  ✅ PTB Verifier:       Client-side security (amount verification!)        ║
║  ✅ Dual Auth System:   zkLogin/Enoki + keypair fallback                   ║
╠════════════════════════════════════════════════════════════════════════════╣
║ SECURITY HIGHLIGHTS                                                        ║
║  🔒 Client-side PTB verification (buyer protects themselves)               ║
║  🔒 Exact amount matching (merchant amount + facilitator fee)              ║
║  🔒 Recipient address validation                                           ║
║  🔒 Invoice hash stored on-chain for audit trail                           ║
║  🔒 EdDSA-signed JWTs from merchant                                        ║
║  🔒 22/22 verifier tests passing (including attack scenarios)              ║
║                                                                             ║
║  See: Pay402/docs/PTB_VERIFIER_SECURITY.md                                 ║
╠════════════════════════════════════════════════════════════════════════════╣
║ DOCUMENTATION                                                              ║
║  Tmux Quick Ref:    ~/Projects/.../Pay402/scripts/TMUX_QUICKREF.md        ║
║  Project Status:    ~/Projects/.../Pay402/STATUS.md                        ║
║  Architecture:      ~/Projects/.../Pay402/docs/ARCHITECTURE.md            ║
║  Facilitator Setup: ~/Projects/.../Pay402/facilitator/SETUP.md            ║
║  Verifier Security: ~/Projects/.../Pay402/docs/PTB_VERIFIER_SECURITY.md   ║
║  Verifier Explainer:~/Projects/.../Pay402/docs/VERIFIER_EXPLAINER.md      ║
║  Suibase Guide:     ~/Projects/.../HackMoney_Research/SUI_Dev_Setup/      ║
║                     SUIBASE_GUIDE.md                                       ║
║                                                                             ║
║  External Links:                                                           ║
║    Suibase:         https://suibase.io/                                    ║
║    SUI Docs:        https://docs.sui.io/                                   ║
║    Enoki SDK:       https://docs.enoki.mystenlabs.com/                     ║
╠════════════════════════════════════════════════════════════════════════════╣
║ PROJECT STATS                                                              ║
║  Lines of Code:     ~3,500+ (contract, facilitator, merchant, widget)     ║
║  Test Coverage:     22 PTB verifier tests, Move unit tests                ║
║  Components:        6 (contract, facilitator, merchant, widget, auth, PTB)║
║  Networks:          localnet ✅ (testnet & mainnet ready)                 ║
║  Demo Ready:        YES! Full end-to-end flow working 🎉                  ║
╚════════════════════════════════════════════════════════════════════════════╝

💡 Tip: Keep this open in a separate terminal or pin it in your notes!
🔗 Quick access: ./scripts/pay402-ref.sh
📖 Detailed help: ./scripts/TMUX_QUICKREF.md

EOF
