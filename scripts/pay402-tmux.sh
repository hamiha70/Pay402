#!/bin/bash
# Pay402 Development Environment Setup with tmux
# Enhanced with auto-start, browser opening, and convenience commands
#
# Usage: 
#   ./pay402-tmux.sh           # Start/attach to session
#   ./pay402-tmux.sh --kill    # Kill session and all servers
#   ./pay402-tmux.sh --help    # Show help

SESSION_NAME="pay402"
PROJECT_DIR="$HOME/Projects/ETHGlobal/HackMoney_Jan26/Pay402"

# Parse arguments
if [ "$1" = "--kill" ]; then
  echo "🛑 Killing Pay402 tmux session and all servers..."
  
  # Kill any running node/npm processes from our ports
  lsof -ti:3001,3002,5173 | xargs kill -9 2>/dev/null || true
  
  # Kill tmux session
  tmux kill-session -t $SESSION_NAME 2>/dev/null
  
  echo "✅ All servers stopped and session killed"
  exit 0
fi

if [ "$1" = "--help" ]; then
  cat << EOF
Pay402 Development Environment

Usage:
  ./pay402-tmux.sh           Start/attach to development session
  ./pay402-tmux.sh --kill    Kill session and all servers
  ./pay402-tmux.sh --help    Show this help

Tmux Key Bindings:
  Ctrl-b + arrow keys   Navigate between panes
  Ctrl-b + z            Zoom/unzoom current pane (full screen)
  Ctrl-b + d            Detach from session
  Ctrl-b + [            Enter copy mode (navigate with arrows)
  Ctrl-b + s            Save current pane to file (custom)
  Ctrl-b + :kill-session   Kill entire session

Pane Layout (Option C: Testing-Heavy):
  ┌──────────┬─────────────────────────────┐
  │  0: Fac  │                             │
  │  :3001   │  4: Testing (MAIN)          │
  ├──────────┤     Easy to copy & share    │
  │  1: Mer  │                             │
  │  :3002   ├─────────────────────────────┤
  ├──────────┤  3: Move Dev                │
  │  2: Wid  │     (lsui commands)         │
  │  :5173   │                             │
  ├──────────┤                             │
  │  5: Sui  │                             │
  └──────────┴─────────────────────────────┘

Browser URLs:
  - Facilitator:    http://localhost:3001/health
  - Merchant:       http://localhost:3002
  - Payment Page:   http://localhost:5173

EOF
  exit 0
fi

# Check if session exists
tmux has-session -t $SESSION_NAME 2>/dev/null

if [ $? != 0 ]; then
  echo "🚀 Creating new tmux session: $SESSION_NAME"
  echo "📦 Starting all services..."
  echo ""
  
  # Ensure localnet is running
  echo "🔍 Checking Suibase localnet..."
  if ! localnet status | grep -q "running"; then
    echo "⚠️  Localnet not running. Starting it..."
    localnet start
    sleep 2
  fi
  
  # Create new session with 6 panes
  tmux new-session -d -s $SESSION_NAME -n "pay402-dev" -c "$PROJECT_DIR"
  
  # ========================================
  # TOP ROW: 3 SERVERS
  # ========================================
  
  # Pane 0: Facilitator (top-left)
  tmux send-keys -t $SESSION_NAME:0.0 "cd $PROJECT_DIR/facilitator" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo '🚀 FACILITATOR (Port 3001)'" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo 'Starting in 2 seconds...'" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "sleep 2 && npm run dev" C-m
  
  # Split horizontally (create pane 1: top-middle)
  tmux split-window -h -t $SESSION_NAME:0.0 -c "$PROJECT_DIR/merchant"
  tmux send-keys -t $SESSION_NAME:0.1 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo '🏪 MERCHANT (Port 3002)'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo 'Starting in 3 seconds...'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "sleep 3 && node src/index.js" C-m
  
  # Split horizontally (create pane 2: top-right)
  tmux split-window -h -t $SESSION_NAME:0.1 -c "$PROJECT_DIR/widget"
  tmux send-keys -t $SESSION_NAME:0.2 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo '💳 PAYMENT PAGE (Port 5173)'" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo 'Starting in 4 seconds...'" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "sleep 4 && npm run dev" C-m
  
  # ========================================
  # BOTTOM ROW: 3 TOOLS
  # ========================================
  
  # Split pane 0 vertically (create pane 3: bottom-left - Move Dev)
  tmux split-window -v -t $SESSION_NAME:0.0 -c "$PROJECT_DIR/contract"
  tmux send-keys -t $SESSION_NAME:0.3 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '📦 MOVE DEVELOPMENT'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo 'Commands:'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  lsui move test           # Run tests'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  lsui move build          # Build contract'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  lsui client publish      # Deploy to localnet'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  lsui client gas          # Check gas balance'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo ''" C-m
  
  # Split pane 1 vertically (create pane 4: bottom-middle - Testing)
  tmux split-window -v -t $SESSION_NAME:0.1 -c "$PROJECT_DIR"
  tmux send-keys -t $SESSION_NAME:0.4 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '🧪 TESTING & MONITORING'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo 'Waiting for servers to start...'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "sleep 8" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '✅ Quick Health Checks:'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "curl -s http://localhost:3001/health | jq -r '.status' | xargs -I {} echo '  Facilitator: {}'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "curl -s http://localhost:3002/health | jq -r '.status' | xargs -I {} echo '  Merchant: {}'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "curl -s http://localhost:5173 > /dev/null 2>&1 && echo '  Widget: OK' || echo '  Widget: Starting...'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '📋 Test Commands:'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '  # Get invoice from merchant'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '  curl http://localhost:3002/api/premium-data | jq .'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '  # Check facilitator health'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '  curl http://localhost:3001/health | jq .'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '🌐 Browser URLs:'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '  Merchant Demo:    http://localhost:3002'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo '  Payment Page:     http://localhost:5173'" C-m
  tmux send-keys -t $SESSION_NAME:0.4 "echo ''" C-m
  
  # Split pane 2 vertically (create pane 5: bottom-right - Suibase)
  tmux split-window -v -t $SESSION_NAME:0.2 -c "$PROJECT_DIR"
  tmux send-keys -t $SESSION_NAME:0.5 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '⚡ SUIBASE & NETWORK'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "localnet status" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo 'Commands:'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '  localnet start/stop/status'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '  lsui client addresses'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '  lsui client gas'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '  lsui client faucet  # Get test SUI'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '📍 Active Address:'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "lsui client active-address" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo ''" C-m
  
  # Custom layout: Testing-heavy (Option C)
  # Strategy: Use main-vertical (left column + right main), then split right side
  
  # Step 1: Start with tiled for now
  tmux select-layout -t $SESSION_NAME:0 tiled
  
  # Step 2: Select pane 4 (Testing) and make it larger
  tmux select-pane -t $SESSION_NAME:0.4
  tmux resize-pane -t $SESSION_NAME:0.4 -Z  # Temporarily zoom
  tmux resize-pane -t $SESSION_NAME:0.4 -Z  # Unzoom to apply
  
  # Step 3: Make left column (panes 0,1,2,5) narrower - 25 columns wide
  tmux resize-pane -t $SESSION_NAME:0.0 -x 25 2>/dev/null || true
  tmux resize-pane -t $SESSION_NAME:0.1 -x 25 2>/dev/null || true
  tmux resize-pane -t $SESSION_NAME:0.2 -x 25 2>/dev/null || true
  tmux resize-pane -t $SESSION_NAME:0.5 -x 25 2>/dev/null || true
  
  # Step 4: Make pane 4 (Testing) taller - give it more lines
  tmux resize-pane -t $SESSION_NAME:0.4 -y 35 2>/dev/null || true
  
  # Configure custom key bindings
  # Ctrl-b s: Save current pane to file
  tmux bind-key -T prefix s run-shell "tmux capture-pane -p -S -3000 > ~/pay402-pane-\$(date +%Y%m%d-%H%M%S).txt && tmux display-message 'Pane saved to ~/pay402-pane-*.txt'"
  
  # Ctrl-b o: Open browsers
  tmux bind-key -T prefix o run-shell "
    (command -v xdg-open >/dev/null && xdg-open http://localhost:3002 && xdg-open http://localhost:5173) || \
    (command -v open >/dev/null && open http://localhost:3002 && open http://localhost:5173) || \
    echo 'Could not detect browser opener (xdg-open/open)'
  "
  
  # Focus on testing pane (where instructions are)
  tmux select-pane -t $SESSION_NAME:0.4
  
  # Wait for servers to stabilize
  sleep 6
  
  echo "✅ Created tmux session: $SESSION_NAME"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 PANE LAYOUT (Option C: Testing-Heavy)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ┌──────────┬─────────────────────────────┐"
  echo "  │  0: Fac  │                             │"
  echo "  │  :3001   │                             │"
  echo "  ├──────────┤  4: Testing (MAIN)          │"
  echo "  │  1: Mer  │     Easy to copy & share    │"
  echo "  │  :3002   │                             │"
  echo "  ├──────────┤                             │"
  echo "  │  2: Wid  │                             │"
  echo "  │  :5173   ├─────────────────────────────┤"
  echo "  ├──────────┤  3: Move Dev                │"
  echo "  │  5: Sui  │     (lsui commands)         │"
  echo "  │  (logs)  │                             │"
  echo "  └──────────┴─────────────────────────────┘"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🌐 BROWSER URLs"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Merchant Demo:    http://localhost:3002"
  echo "  Payment Page:     http://localhost:5173"
  echo "  Facilitator API:  http://localhost:3001/health"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⌨️  TMUX SHORTCUTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Navigation:"
  echo "    Ctrl-b + arrow     Navigate between panes"
  echo "    Ctrl-b + z         Zoom/unzoom current pane (FULL SCREEN)"
  echo "    Ctrl-b + d         Detach from session"
  echo ""
  echo "  Copy from Single Pane:"
  echo "    Ctrl-b + [         Enter copy mode"
  echo "    Ctrl-b + s         Save current pane to ~/pay402-pane-*.txt"
  echo "    Ctrl-b + ]         Paste copied text"
  echo ""
  echo "  Other:"
  echo "    Ctrl-b + o         Open browsers (merchant + widget)"
  echo "    Ctrl-b + ?         Show all keybindings"
  echo "    Ctrl-b :kill-session   Kill entire session"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 QUICK START"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  1. All servers are auto-starting (wait ~10 seconds)"
  echo "  2. Press Ctrl-b + o to open browsers"
  echo "  3. Visit merchant demo, copy invoice JWT"
  echo "  4. Paste into payment page"
  echo "  5. Complete payment flow!"
  echo ""
  echo "  To kill everything:  ./pay402-tmux.sh --kill"
  echo "  To see this help:    ./pay402-tmux.sh --help"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Auto-open browsers after a delay
  echo "🌐 Auto-opening browsers in 8 seconds..."
  echo "   (Press Ctrl-C to skip)"
  sleep 8 && {
    if command -v xdg-open >/dev/null; then
      xdg-open http://localhost:3002 2>/dev/null &
      sleep 1
      xdg-open http://localhost:5173 2>/dev/null &
    elif command -v open >/dev/null; then
      open http://localhost:3002 2>/dev/null &
      sleep 1
      open http://localhost:5173 2>/dev/null &
    fi
  } &
  
else
  echo "✅ Session $SESSION_NAME already exists"
  echo "📌 Attaching to existing session..."
  echo ""
  echo "💡 Tip: Use 'Ctrl-b z' to zoom current pane"
  echo "💡 Tip: Use 'Ctrl-b s' to save current pane to file"
  echo "💡 Tip: Use './pay402-tmux.sh --kill' to stop everything"
  echo ""
fi

# Attach to session
tmux attach-session -t $SESSION_NAME
