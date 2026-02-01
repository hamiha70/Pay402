#!/bin/bash
# Pay402 Development Environment Setup with tmux
# Usage: ./pay402-tmux.sh

SESSION_NAME="pay402"
PROJECT_DIR="$HOME/Projects/ETHGlobal/HackMoney_Jan26/Pay402"

# Check if session exists
tmux has-session -t $SESSION_NAME 2>/dev/null

if [ $? != 0 ]; then
  echo "🚀 Creating new tmux session: $SESSION_NAME"
  
  # Create new session
  tmux new-session -d -s $SESSION_NAME -n "dev" -c "$PROJECT_DIR"
  
  # Pane 1: Facilitator (top-left)
  tmux send-keys -t $SESSION_NAME:0.0 "cd $PROJECT_DIR/facilitator" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo '📍 Pane 1: Facilitator Backend'" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo 'Run: npm run dev'" C-m
  tmux send-keys -t $SESSION_NAME:0.0 "echo ''" C-m
  
  # Split horizontally (create pane 2: top-right)
  tmux split-window -h -t $SESSION_NAME:0.0 -c "$PROJECT_DIR/move/payment"
  tmux send-keys -t $SESSION_NAME:0.1 "echo '📍 Pane 2: Move Development'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo 'Commands:'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo '  lsui move test           - Run tests'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo '  lsui move build          - Build contracts'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo '  lsui client publish      - Deploy'" C-m
  tmux send-keys -t $SESSION_NAME:0.1 "echo ''" C-m
  
  # Split pane 1 vertically (create pane 3: bottom-left)
  tmux split-window -v -t $SESSION_NAME:0.0 -c "$PROJECT_DIR"
  tmux send-keys -t $SESSION_NAME:0.2 "echo '📍 Pane 3: Testing & Monitoring'" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo 'Quick test:'" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo '  curl http://localhost:3001/health | jq .'" C-m
  tmux send-keys -t $SESSION_NAME:0.2 "echo ''" C-m
  
  # Split pane 2 vertically (create pane 4: bottom-right)
  tmux split-window -v -t $SESSION_NAME:0.1 -c "$PROJECT_DIR"
  tmux send-keys -t $SESSION_NAME:0.3 "echo '📍 Pane 4: Suibase Control'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo 'Checking localnet status...'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "localnet status" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo ''" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo 'Network commands:'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  localnet start/stop/status'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  lsui client addresses'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo '  lsui client gas'" C-m
  tmux send-keys -t $SESSION_NAME:0.3 "echo ''" C-m
  
  # Balance pane sizes
  tmux select-layout -t $SESSION_NAME:0 tiled
  
  # Focus on facilitator pane
  tmux select-pane -t $SESSION_NAME:0.0
  
  echo "✅ Created new tmux session: $SESSION_NAME"
  echo ""
  echo "📋 Pane Layout:"
  echo "  0 (top-left):     Facilitator - npm run dev"
  echo "  1 (top-right):    Move Dev - lsui move test/build/publish"
  echo "  2 (bottom-left):  Testing - curl commands"
  echo "  3 (bottom-right): Suibase - localnet status"
  echo ""
  echo "🎯 Quick Start:"
  echo "  1. Pane 3: localnet start (if not running)"
  echo "  2. Pane 0: npm run dev"
  echo "  3. Navigate with: Ctrl-b + arrow keys"
  echo "  4. Detach with: Ctrl-b + d"
  echo ""
else
  echo "✅ Session $SESSION_NAME already exists"
  echo "📌 Attaching to existing session..."
fi

# Attach to session
tmux attach-session -t $SESSION_NAME
