# Pay402 tmux Quick Reference

## 🚀 Starting/Stopping

```bash
# Start everything (auto-deploys Move contract + starts all servers + opens browsers)
./scripts/pay402-tmux.sh

# Kill everything (stops all servers + closes session)
./scripts/pay402-tmux.sh --kill

# Show help
./scripts/pay402-tmux.sh --help
```

**What happens on startup:**
1. ✅ Checks if Move contract is deployed (skips if exists)
2. ✅ Starts Facilitator (:3001)
3. ✅ Starts Merchant (:3002)
4. ✅ Starts Payment Widget (:5173)
5. ✅ Opens browsers automatically

---

## ⌨️ Essential tmux Keys

### Navigation
| Key | Action |
|-----|--------|
| `Ctrl-b` then `↑ ↓ ← →` | Move between panes |
| `Ctrl-b` then `z` | **Zoom current pane (FULL SCREEN)** ⭐ |
| `Ctrl-b` then `d` | Detach from session (keeps running) |

### Copy from Single Pane (Your Main Concern!)
| Key | Action |
|-----|--------|
| `Ctrl-b` then `[` | Enter copy mode (navigate with arrows) |
| `Space` | Start selection (in copy mode) |
| `Enter` | Copy selection |
| `Ctrl-b` then `]` | Paste |
| `Ctrl-b` then `s` | **Save entire pane to ~/pay402-pane-TIMESTAMP.txt** ⭐ |

### Other Useful Commands
| Key | Action |
|-----|--------|
| `Ctrl-b` then `o` | Open browsers (merchant + widget) |
| `Ctrl-b` then `?` | Show all keybindings |
| `Ctrl-b` then `:kill-session` | Kill session from inside |
| `q` | Exit copy mode |

---

## 📋 Pane Layout (Option C: Testing-Heavy)

```
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
```

**Why this layout?**
- You code in Cursor on another screen
- This optimizes for **running & monitoring**:
  - **Pane 4 (Testing)**: HUGE - easy to copy logs and share
  - **Pane 3 (Move Dev)**: Medium - for `lsui` commands
  - **Left column**: Narrow - just server log monitors

---

## 💡 Pro Tips for Your Concerns

### Problem: Can't copy from single pane without crossing panes

**Solution 1: Zoom the pane (BEST)** ⭐
```
1. Navigate to pane you want: Ctrl-b + arrows
2. Zoom it to full screen: Ctrl-b + z
3. Now you can select with mouse freely!
4. Copy with Ctrl+Shift+C (terminal copy)
5. Unzoom: Ctrl-b + z again
```

**Solution 2: Save to file** ⭐
```
1. Navigate to pane: Ctrl-b + arrows
2. Save entire pane: Ctrl-b + s
3. File saved to: ~/pay402-pane-TIMESTAMP.txt
4. Open file and copy what you need
```

**Solution 3: tmux copy mode**
```
1. Navigate to pane: Ctrl-b + arrows
2. Enter copy mode: Ctrl-b + [
3. Navigate with arrow keys
4. Press Space to start selection
5. Navigate to end of selection
6. Press Enter to copy
7. Exit copy mode: q
8. Paste with: Ctrl-b + ]
```

### Problem: Can't easily delete all panes

**Solution 1: Kill script** ⭐
```bash
# From outside tmux:
./scripts/pay402-tmux.sh --kill

# This stops:
- All 3 servers (ports 3001, 3002, 5173)
- The entire tmux session
```

**Solution 2: From inside tmux**
```
Ctrl-b : kill-session Enter
```

**Solution 3: Nuclear option**
```bash
# Kill all tmux sessions:
tmux kill-server
```

---

## 🌐 URLs (Auto-opened)

- **Merchant Demo:** http://localhost:3002
- **Payment Page:** http://localhost:5173
- **Facilitator API:** http://localhost:3001/health

---

## 🧪 Test Flow

1. Wait ~10 seconds for servers to start
2. Merchant page opens automatically (or visit http://localhost:3002)
3. Click "Get Premium Data" → Copy invoice JWT
4. Payment page opens automatically (or visit http://localhost:5173)
5. Paste invoice → Complete payment flow!

---

## 🐛 Troubleshooting

**Servers not starting?**
```bash
# Check localnet is running (in Pane 5):
localnet status

# If not running:
localnet start
```

**Port already in use?**
```bash
# Kill everything and restart:
./scripts/pay402-tmux.sh --kill
./scripts/pay402-tmux.sh
```

**Want to see server logs?**
```
1. Navigate to server pane (0, 1, or 2)
2. Zoom it: Ctrl-b + z
3. Scroll with Shift+PageUp/PageDown
4. Unzoom: Ctrl-b + z
```

**Want to save logs to file?**
```
1. Navigate to pane with logs
2. Press: Ctrl-b + s
3. Check: ~/pay402-pane-*.txt
```

---

## 🎯 Workflow Summary

**Daily Start:**
```bash
cd ~/Projects/ETHGlobal/HackMoney_Jan26/Pay402
./scripts/pay402-tmux.sh
# Wait 10 seconds, browsers open automatically!
```

**Daily Stop:**
```bash
# From outside tmux:
./scripts/pay402-tmux.sh --kill

# Or from inside:
Ctrl-b : kill-session
```

**Copying Output:**
```
Method 1 (easiest): Ctrl-b z (zoom) → mouse select → copy
Method 2 (to file): Ctrl-b s → open ~/pay402-pane-*.txt
Method 3 (tmux way): Ctrl-b [ → space → navigate → enter
```

---

## 📚 More Resources

- **tmux cheat sheet:** https://tmuxcheatsheet.com/
- **Our docs:** `Pay402/STATUS.md`
- **Help:** `./scripts/pay402-tmux.sh --help`
