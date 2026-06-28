#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-rustdesk-client.sh — make THIS Mac remotely reachable via our self-hosted
# RustDesk server (rustdesk-hbbs / rustdesk-hbbr in docker-compose.yml).
#
# Automates everything that can be automated on macOS:
#   • installs the RustDesk client (Homebrew cask) if missing
#   • writes ~/Library/Preferences/com.carriez.RustDesk/RustDesk2.toml pointing
#     the client at our ID/relay server + the server's public key
#   • enables LAN "direct IP access" (laptop connects straight to this host's IP)
#   • sets a permanent password (unattended access, no click-to-accept)
#   • installs a LaunchAgent so RustDesk starts at login
#   • prints this machine's RustDesk ID
#
# What it CANNOT do (macOS privacy / TCC — manual, see end of output):
#   • grant Screen Recording + Accessibility permissions
#
# Re-running is safe (idempotent).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/infra/.env"
PUBKEY_FILE="$REPO_ROOT/data/rustdesk/id_ed25519.pub"
PREFS_DIR="$HOME/Library/Preferences/com.carriez.RustDesk"
TOML="$PREFS_DIR/RustDesk2.toml"
LAUNCH_AGENT="$HOME/Library/LaunchAgents/com.pitangui.rustdesk.plist"

say()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }

# ── 1. Server connection details ─────────────────────────────────────────────
# ID/relay server = this host's LAN IP (WG_HOST), key = server's PUBLIC key.
HOST="$(grep -E '^WG_HOST=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
HOST="${HOST:-10.0.0.100}"

if [[ ! -f "$PUBKEY_FILE" ]]; then
  echo "ERROR: server public key not found at $PUBKEY_FILE" >&2
  echo "Start the server first:  cd infra && docker compose up -d rustdesk-hbbs" >&2
  exit 1
fi
KEY="$(tr -d '[:space:]' < "$PUBKEY_FILE")"

# Permanent password: from RUSTDESK_PASSWORD in infra/.env, else prompt.
RUSTDESK_PASSWORD="$(grep -E '^RUSTDESK_PASSWORD=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
if [[ -z "${RUSTDESK_PASSWORD:-}" || "$RUSTDESK_PASSWORD" == "changeme" ]]; then
  read -r -s -p "Set a permanent RustDesk password for this machine: " RUSTDESK_PASSWORD; echo
  [[ -n "$RUSTDESK_PASSWORD" ]] || { echo "ERROR: empty password" >&2; exit 1; }
  warn "Tip: add RUSTDESK_PASSWORD=… to infra/.env so future runs are non-interactive."
fi

say "Server   : $HOST  (ports 21115-21119)"
say "Key      : $KEY"

# ── 2. Install the client ────────────────────────────────────────────────────
if [[ ! -d /Applications/RustDesk.app ]]; then
  say "Installing RustDesk via Homebrew…"
  brew install --cask rustdesk
else
  say "RustDesk already installed."
fi

BIN=/Applications/RustDesk.app/Contents/MacOS/rustdesk
[[ -x "$BIN" ]] || BIN=/Applications/RustDesk.app/Contents/MacOS/RustDesk

# ── 3. Write client config (custom server + key + LAN direct access) ──────────
say "Writing $TOML"
mkdir -p "$PREFS_DIR"
cat > "$TOML" <<EOF
[options]
custom-rendezvous-server = "$HOST"
relay-server = "$HOST"
key = "$KEY"
# LAN convenience: laptop on the same network can connect straight to this IP.
direct-server = "Y"
# Unattended access: accept connections by permanent password (no click-to-allow).
verification-method = "use-permanent-password"
approve-mode = "password"
EOF

# ── 4. Set the permanent password ────────────────────────────────────────────
say "Setting permanent password…"
"$BIN" --password "$RUSTDESK_PASSWORD" >/dev/null 2>&1 || \
  warn "Could not set password via CLI; set it in the RustDesk UI (Security → Permanent password)."

# ── 5. Start at login (LaunchAgent) ──────────────────────────────────────────
say "Installing login LaunchAgent…"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$LAUNCH_AGENT" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.pitangui.rustdesk</string>
  <key>ProgramArguments</key><array><string>$BIN</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
EOF
launchctl unload "$LAUNCH_AGENT" 2>/dev/null || true
launchctl load  "$LAUNCH_AGENT" 2>/dev/null || true

# ── 6. Show this machine's ID ────────────────────────────────────────────────
sleep 2
ID="$("$BIN" --get-id 2>/dev/null || true)"
[[ -n "$ID" ]] || ID="(run: $BIN --get-id)"

cat <<EOF

────────────────────────────────────────────────────────────────────────────
✅ Config applied.  This machine's RustDesk ID: $ID

⚠️  MANUAL STEP (macOS won't let scripts do this):
   System Settings → Privacy & Security, and enable RustDesk under BOTH:
     • Screen & System Audio Recording
     • Accessibility
   Then quit & relaunch RustDesk (so it picks up the permissions).

ON THE LAPTOP (same LAN): install RustDesk and set the SAME server in
   Settings → Network → ID/Relay Server:
     ID Server    : $HOST
     Relay Server : $HOST
     Key          : $KEY
   Then enter ID $ID + the permanent password and Connect.
   (Or, with direct IP access, just type $HOST in the laptop's RustDesk.)
────────────────────────────────────────────────────────────────────────────
EOF
