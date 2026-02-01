#!/bin/bash
# Pay402 Quick Reference - Display this in a tmux pane or terminal
# Usage: ./pay402-ref.sh

cat << 'EOF'
╔════════════════════════════════════════════════════════════════════════════╗
║                       PAY402 DEVELOPMENT QUICK REFERENCE                   ║
╠════════════════════════════════════════════════════════════════════════════╣
║ TMUX SESSION                                                               ║
║  ~/pay402-tmux.sh              Launch/attach Pay402 tmux session           ║
║  Ctrl-b + arrow keys           Navigate between panes                      ║
║  Ctrl-b + z                    Zoom/unzoom current pane                    ║
║  Ctrl-b + [                    Scroll mode (q to exit)                     ║
║  Ctrl-b + d                    Detach (keep running)                       ║
║  tmux attach -t pay402         Re-attach to session                        ║
╠════════════════════════════════════════════════════════════════════════════╣
║ SUIBASE LOCALNET (Pane 4)                                                  ║
║  localnet start                Start local network (daemon)                ║
║  localnet status               Check all services                          ║
║  localnet stop                 Stop network                                ║
║  localnet regen                Reset network (wipes all data!)             ║
║  lsui client addresses         List all addresses                          ║
║  lsui client gas               Check gas balances                          ║
║  lsui client faucet            Get test SUI for active address             ║
╠════════════════════════════════════════════════════════════════════════════╣
║ MOVE DEVELOPMENT (Pane 2)                                                  ║
║  lsui move test                Run Move unit tests                         ║
║  lsui move build               Compile contracts                           ║
║  lsui client publish \                                                     ║
║    --gas-budget 100000000      Deploy package to localnet                  ║
║  cat Move.lock                 View deployed package IDs                   ║
║  cat Publications.toml         View deployment history                     ║
╠════════════════════════════════════════════════════════════════════════════╣
║ FACILITATOR BACKEND (Pane 1)                                               ║
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
║ TESTING (Pane 3)                                                           ║
║  # Health check                                                            ║
║  curl http://localhost:3001/health | jq .                                  ║
║                                                                             ║
║  # Check balance                                                           ║
║  curl -X POST http://localhost:3001/check-balance \                        ║
║    -H "Content-Type: application/json" \                                   ║
║    -d '{"address":"0xf7ae...","network":"localnet"}' | jq .                ║
║                                                                             ║
║  # View logs                                                               ║
║  tail -f ~/suibase/workdirs/localnet/.state/sui-node.log                   ║
╠════════════════════════════════════════════════════════════════════════════╣
║ NETWORK PORTS                                                              ║
║  9000        SUI RPC (direct)                                              ║
║  44340       SUI RPC (via proxy)                                           ║
║  9123        Faucet                                                        ║
║  44380       Local Explorer (browser)                                      ║
║  3001        Facilitator API                                               ║
╠════════════════════════════════════════════════════════════════════════════╣
║ COMMON WORKFLOWS                                                           ║
║                                                                             ║
║  🌅 Morning Startup:                                                       ║
║    1. ~/pay402-tmux.sh                                                     ║
║    2. Pane 4: localnet status (check if running)                           ║
║    3. Pane 1: npm run dev                                                  ║
║    4. Pane 3: curl http://localhost:3001/health | jq .                     ║
║                                                                             ║
║  🔄 Redeploy Contract:                                                     ║
║    1. Pane 2: cd ~/Projects/.../Pay402/move/payment                        ║
║    2. Pane 2: lsui move test                                               ║
║    3. Pane 2: lsui client publish --gas-budget 100000000                   ║
║    4. Copy Package ID: 0x...                                               ║
║    5. Pane 1: Ctrl-C, nano .env (update PACKAGE_ID), npm run dev           ║
║                                                                             ║
║  🧪 Test Payment Flow:                                                     ║
║    1. Pane 4: lsui client addresses (get test address)                     ║
║    2. Pane 3: curl POST /check-balance                                     ║
║    3. Pane 3: curl POST /settle-payment                                    ║
║    4. Pane 4: lsui client gas (verify gas spent)                           ║
║                                                                             ║
║  🌙 End of Day:                                                            ║
║    1. Pane 1: Ctrl-C (stop facilitator)                                    ║
║    2. Ctrl-b + d (detach tmux, or just close terminal)                     ║
║    3. Localnet keeps running! (or: localnet stop)                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║ TROUBLESHOOTING                                                            ║
║  Connection refused           → localnet start                             ║
║  Package ID mismatch          → Update .env, restart facilitator           ║
║  Out of gas                   → lsui client faucet                         ║
║  Network state corrupted      → localnet regen (nuclear option)            ║
║  Tmux pane frozen             → Ctrl-b + q [number] to jump                ║
║  Need fresh start             → tmux kill-session -t pay402                ║
╠════════════════════════════════════════════════════════════════════════════╣
║ USEFUL ADDRESSES (Localnet)                                                ║
║  sb-1-ed25519: 0xf7ae71f84fabc58662bd4209a8893f462c60f247095bb35b19ff659ad0081462
║  Facilitator:  0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995
║  (Get current: lsui client addresses)                                      ║
╠════════════════════════════════════════════════════════════════════════════╣
║ DOCUMENTATION                                                              ║
║  Suibase Guide:     ~/Projects/.../HackMoney_Research/SUI_Dev_Setup/      ║
║                     SUIBASE_GUIDE.md                                       ║
║  Project Docs:      ~/Projects/.../Pay402/docs/DEVELOPMENT_GUIDE.md       ║
║  Token Policy:      ~/Projects/.../Pay402/TOKEN_POLICY.md                 ║
║  Architecture:      ~/Projects/.../Pay402/docs/ARCHITECTURE.md            ║
║                                                                             ║
║  Suibase Docs:      https://suibase.io/                                    ║
║  SUI Docs:          https://docs.sui.io/                                   ║
╚════════════════════════════════════════════════════════════════════════════╝

💡 Tip: Keep this open in a separate terminal or pin it in your notes!
🔗 Quick access: ~/pay402-ref.sh

EOF
