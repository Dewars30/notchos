#!/usr/bin/env bash
# setup.sh - Configure Claude Code hooks to talk to NotchOS
# Run once after building the app.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE="$SCRIPT_DIR/notchos-bridge.js"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"

# ── Make bridge executable ────────────────────────────────────────────────────
chmod +x "$BRIDGE"
echo "✓ Bridge: $BRIDGE"

# ── Patch ~/.claude/settings.json ────────────────────────────────────────────
mkdir -p "$HOME/.claude"

# If settings.json doesn't exist, create it
if [[ ! -f "$CLAUDE_SETTINGS" ]]; then
  echo '{}' > "$CLAUDE_SETTINGS"
fi

# Use node to patch the JSON (safer than sed/jq gymnastics)
node - "$CLAUDE_SETTINGS" "$BRIDGE" <<'EOF'
const fs = require("fs");
const [,, settingsPath, bridgePath] = process.argv;

let settings = {};
try { settings = JSON.parse(fs.readFileSync(settingsPath, "utf8")); } catch {}

const hookCmd = (event) => ({
  matcher: "",
  hooks: [{
    type: "command",
    command: `node ${bridgePath} --agent claude`
  }]
});

settings.hooks = settings.hooks ?? {};

// Only add if not already present
const events = ["PreToolUse", "PostToolUse", "Notification", "Stop"];
for (const ev of events) {
  settings.hooks[ev] = settings.hooks[ev] ?? [];
  const alreadyAdded = settings.hooks[ev].some(
    h => h.hooks?.some(cmd => cmd.command?.includes("notchos-bridge"))
  );
  if (!alreadyAdded) {
    settings.hooks[ev].push(hookCmd(ev));
  }
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
console.log("✓ Claude Code hooks configured");
EOF

# ── Verify ────────────────────────────────────────────────────────────────────
echo ""
echo "Done. Launch NotchOS.app, then start a Claude Code session."
echo ""
echo "To test the socket manually:"
echo "  echo '{\"hookEventName\":\"Notification\",\"sessionId\":\"test-123\",\"message\":\"hello\",\"agent\":\"claude\"}' | node $BRIDGE"
