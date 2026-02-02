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
  
  Copy Mode (Ctrl-b + [):
    h,j,k,l or arrows   Navigate (vim style)
    Space or v          Start selection
    Enter or y          Copy selection to tmux buffer
    q                   Exit copy mode
  Ctrl-b + ]            Paste from tmux buffer
  Ctrl-b + s            Save current pane to file (custom)
  Ctrl-b + :kill-session   Kill entire session

Pane Layout (Testing-Heavy):
  ┌──────────┬─────────────────────────────┐
  │  0: Fac  │                             │
  │  :3001   │  4: Testing (MAIN)          │
  │  (small) │     ← HUGE (easy copy)      │
  ├──────────┤                             │
  │  1: Mer  ├─────────────────────────────┤
  │  :3002   │  5: Move Dev                │
  │  (small) │     ← Medium (lsui)         │
  ├──────────┤                             │
  │  2: Wid  │                             │
  │  :5173   │                             │
  │  (small) │                             │
  ├──────────┤                             │
  │  3: Sui  │                             │
  │  (small) │                             │
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
  # LAYOUT CREATION SEQUENCE
  # Following the exact split pattern requested:
  # 1. Vertical split (left | right)
  # 2. Left side splits into: Fac -> (Fac | Merchant) -> (Fac | Merchant | Widget | Sui)
  # 3. Right side splits into: (Testing | Move Dev)
  # ========================================
  
  # STEP 1: Split vertically (left | right)
  # Pane 0 is the initial pane, split it vertically to create pane 1 on the right
  tmux split-window -h -t $SESSION_NAME:0.0 -c "$PROJECT_DIR"
  
  # Now we have:
  # Pane 0 (left) | Pane 1 (right)
  
  # STEP 2: Work on LEFT side - select pane 0
  tmux select-pane -t $SESSION_NAME:0.0
  
  # Split pane 0 horizontally: top becomes Facilitator, bottom becomes Widget (temp)
  tmux split-window -v -t $SESSION_NAME:0.0 -c "$PROJECT_DIR/widget"
  
  # Now we have:
  # Pane 0 (Fac)     | Pane 2 (right - was pane 1, renumbered)
  # Pane 1 (Widget)  |
  
  # STEP 3: Split Facilitator pane horizontally: top stays Fac, bottom becomes Merchant
  tmux select-pane -t $SESSION_NAME:0.0
  tmux split-window -v -t $SESSION_NAME:0.0 -c "$PROJECT_DIR/merchant"
  
  # Now we have:
  # Pane 0 (Fac)     | Pane 3 (right - was pane 2, renumbered)
  # Pane 1 (Merchant)|
  # Pane 2 (Widget)  |
  
  # STEP 4: Split Widget pane horizontally: top stays Widget, bottom becomes SuiNetwork
  tmux select-pane -t $SESSION_NAME:0.2
  tmux split-window -v -t $SESSION_NAME:0.2 -c "$PROJECT_DIR"
  
  # Now we have:
  # Pane 0 (Fac)     | Pane 4 (right - was pane 3, renumbered)
  # Pane 1 (Merchant)|
  # Pane 2 (Widget)  |
  # Pane 3 (Sui)     |
  
  # STEP 5: Work on RIGHT side - select pane 4, split into Testing (top) and Move Dev (bottom)
  tmux select-pane -t $SESSION_NAME:0.4
  tmux split-window -v -t $SESSION_NAME:0.4 -c "$PROJECT_DIR/contract"
  
  # Final layout:
  # Pane 0 (Fac)     | Pane 4 (Testing/Main)
  # Pane 1 (Merchant)|
  # Pane 2 (Widget)  | Pane 5 (Move Dev)
  # Pane 3 (Sui)     |
  
  # ========================================
  # PANE SETUP & TITLES
  # ========================================
  
  # ========================================
  # STEP 0: Deploy Move Contract (if needed)
  # ========================================
  echo "📦 Deploying Move contract..."
  cd "$PROJECT_DIR/move/payment"
  ./deploy-local.sh
  echo ""
  
  # ========================================
  # START SERVICES
  # ========================================
  
  # Pane 0: Facilitator
  tmux select-pane -t $SESSION_NAME:0.0 -T "Fac :3001"
  tmux send-keys -t $SESSION_NAME:0.0 "cd $PROJECT_DIR/facilitator" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo '🚀 FACILITATOR (Port 3001)'" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo 'Starting in 2 seconds...'" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "sleep 2 && npm run dev" C-m
  
  # Pane 1: Merchant
  tmux select-pane -t $SESSION_NAME:0.1 -T "Mer :3002"
  tmux send-keys -t $SESSION_NAME:0.1 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo '🏪 MERCHANT (Port 3002)'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo 'Starting in 3 seconds...'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "sleep 3 && node src/index.js" C-m
  
  # Pane 2: Widget
  tmux select-pane -t $SESSION_NAME:0.2 -T "Wid :5173"
  tmux send-keys -t $SESSION_NAME:0.2 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo '💳 PAYMENT PAGE (Port 5173)'" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo 'Starting in 4 seconds...'" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "sleep 4 && npm run dev" C-m
  
  # Pane 3: SuiNetwork
  tmux select-pane -t $SESSION_NAME:0.3 -T "Sui"
  tmux send-keys -t $SESSION_NAME:0.3 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '⚡ SUIBASE & NETWORK'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "localnet status" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo 'Commands:'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  localnet start/stop/status'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  lsui client addresses'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  lsui client gas'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  lsui client faucet  # Get test SUI'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '📍 Active Address:'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "lsui client active-address" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo ''" C-m
  
  # Pane 4: Testing (MAIN)
  tmux select-pane -t $SESSION_NAME:0.4 -T "Testing (MAIN)"
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
  
  # Pane 5: Move Dev
  tmux select-pane -t $SESSION_NAME:0.5 -T "Move Dev"
  tmux send-keys -t $SESSION_NAME:0.5 "clear" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '📦 MOVE DEVELOPMENT'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo 'Commands:'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '  lsui move test           # Run tests'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '  lsui move build          # Build contract'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '  lsui client publish      # Deploy to localnet'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo '  lsui client gas          # Check gas balance'" C-m
  tmux send-keys -t $SESSION_NAME:0.5 "echo ''" C-m
  
  # Custom layout: Testing-heavy with narrow left column
  # Left column (panes 0,1,2,3): narrow, stacked vertically
  # Right side (panes 4,5): wide, with Testing (4) taking most space
  
  # Step 1: Get window dimensions
  WINDOW_INFO=$(tmux display-message -p -t $SESSION_NAME:0 "#{window_width},#{window_height}")
  WINDOW_WIDTH=$(echo $WINDOW_INFO | cut -d',' -f1)
  WINDOW_HEIGHT=$(echo $WINDOW_INFO | cut -d',' -f2)
  
  # Calculate target dimensions
  LEFT_COL_WIDTH=$((WINDOW_WIDTH / 5))           # 20% for left column (panes 0-3)
  RIGHT_COL_WIDTH=$((WINDOW_WIDTH - LEFT_COL_WIDTH))  # 80% for right side (panes 4-5)
  TESTING_HEIGHT=$((WINDOW_HEIGHT * 65 / 100))   # 65% for Testing pane (4)
  
  # Step 2: Resize the left column to be narrow
  tmux resize-pane -t $SESSION_NAME:0.0 -x $LEFT_COL_WIDTH 2>/dev/null || true
  
  # Step 3: Resize Testing pane (4) to take most of the height on the right
  tmux resize-pane -t $SESSION_NAME:0.4 -y $TESTING_HEIGHT 2>/dev/null || true
  
  # Step 4: Make left column panes roughly equal height (each gets 1/4 of window)
  LEFT_PANE_HEIGHT=$((WINDOW_HEIGHT / 4))
  tmux resize-pane -t $SESSION_NAME:0.0 -y $LEFT_PANE_HEIGHT 2>/dev/null || true
  tmux resize-pane -t $SESSION_NAME:0.1 -y $LEFT_PANE_HEIGHT 2>/dev/null || true
  tmux resize-pane -t $SESSION_NAME:0.2 -y $LEFT_PANE_HEIGHT 2>/dev/null || true
  
  # Step 5: Select pane 4 (Testing) as focus - this is the main work area
  tmux select-pane -t $SESSION_NAME:0.4
  
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
  echo "📋 PANE LAYOUT (Testing-Heavy)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ┌──────────┬─────────────────────────────┐"
  echo "  │  0: Fac  │                             │"
  echo "  │  :3001   │  4: Testing (MAIN)          │"
  echo "  │  (small) │     ← HUGE (easy copy)      │"
  echo "  ├──────────┤                             │"
  echo "  │  1: Mer  ├─────────────────────────────┤"
  echo "  │  :3002   │  5: Move Dev                │"
  echo "  │  (small) │     ← Medium (lsui)         │"
  echo "  ├──────────┤                             │"
  echo "  │  2: Wid  │                             │"
  echo "  │  :5173   │                             │"
  echo "  │  (small) │                             │"
  echo "  ├──────────┤                             │"
  echo "  │  3: Sui  │                             │"
  echo "  │  (small) │                             │"
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
  echo "  Copy & Paste:"
  echo "    Ctrl-b + [         Enter copy mode (navigate with h,j,k,l or arrows)"
  echo "    Space or v         Start selection (in copy mode)"
  echo "    Enter or y         Copy selection to tmux buffer (exits copy mode)"
  echo "    q                  Exit copy mode without copying"
  echo "    Ctrl-b + ]         Paste from tmux buffer (works in any pane!)"
  echo "    Ctrl-b + s         Save current pane to ~/pay402-pane-*.txt"
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
