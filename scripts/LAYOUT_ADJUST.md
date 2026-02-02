# Tmux Layout Manual Adjustments

## Current Layout
The script attempts Option C (Testing-Heavy), but tmux layout control can be finicky.

## Quick Manual Adjustments

### From Inside Tmux Session:

**1. Make Testing Pane (4) Bigger:**
```bash
Ctrl-b :resize-pane -t 4 -y 50
```

**2. Make Move Dev Pane (3) Bigger:**
```bash
Ctrl-b :resize-pane -t 3 -y 30
```

**3. Make Left Column Narrower:**
```bash
Ctrl-b :resize-pane -t 0 -x 20
Ctrl-b :resize-pane -t 1 -x 20
Ctrl-b :resize-pane -t 2 -x 20
Ctrl-b :resize-pane -t 5 -x 20
```

**4. Interactive Resize (Best!):**
```bash
# Press Ctrl-b then hold Ctrl and use arrow keys:
Ctrl-b + Ctrl-← →    # Resize horizontally
Ctrl-b + Ctrl-↑ ↓    # Resize vertically
```

## Recommended Manual Setup

After running `./scripts/pay402-tmux.sh`:

1. **Navigate to Testing Pane:**
   ```
   Ctrl-b then press 4
   ```

2. **Make it taller (hold Ctrl):**
   ```
   Ctrl-b then Ctrl-↑ (press many times)
   ```

3. **Navigate to Facilitator (pane 0):**
   ```
   Ctrl-b then press 0
   ```

4. **Make left column narrower:**
   ```
   Ctrl-b then Ctrl-← (press many times)
   ```

5. **That's it!** Tmux remembers the layout for this session.

## Save Custom Layout (Advanced)

Once you have the perfect layout:

```bash
# Get the layout string:
Ctrl-b :display-message -p "#{window_layout}"

# This outputs something like:
# ce9d,239x54,0,0{59x54,0,0[...complex string...]

# Copy this and add to the script around line 190:
tmux select-layout -t $SESSION_NAME:0 "YOUR_LAYOUT_STRING_HERE"
```

## Simplified Alternative

If layout is too complex, just use **zoom**:

```bash
# Navigate to the pane you're working in:
Ctrl-b + arrow keys

# Zoom it to full screen:
Ctrl-b + z

# Work in full screen mode
# Unzoom when done:
Ctrl-b + z
```

This way you don't need perfect sizing - just zoom the pane you need!

## Current Goal Layout

```
┌──────────┬─────────────────────────────┐
│  0: Fac  │                             │
│  :3001   │  4: Testing (MAIN)          │
│  (small) │     ← HUGE (easy copy)      │
├──────────┤                             │
│  1: Mer  ├─────────────────────────────┤
│  :3002   │  3: Move Dev                │
│  (small) │     ← Medium (lsui)         │
├──────────┤                             │
│  2: Wid  │                             │
│  :5173   │                             │
│  (small) │                             │
├──────────┤                             │
│  5: Sui  │                             │
│  (small) │                             │
└──────────┴─────────────────────────────┘
```

**Target Sizes:**
- Left column (0,1,2,5): 20-25 columns wide
- Testing pane (4): 40-50 lines tall
- Move Dev pane (3): Whatever's left

**Pro Tip:** After manual adjustment, the layout persists until you kill the session!
