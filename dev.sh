#!/usr/bin/env bash
# dev.sh - Vibe Coders Map local development launcher

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[vibe]${RESET} $*"; }
ok()   { echo -e "${GREEN}[ok]${RESET}   $*"; }
warn() { echo -e "${YELLOW}[warn]${RESET} $*"; }
err()  { echo -e "${RED}[err]${RESET}  $*"; }

# ── Cleanup on exit ─────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  log "Shutting down all processes..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  ok "Done."
}
trap cleanup INT TERM EXIT

# ── Prerequisite checks ──────────────────────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "Required command not found: ${BOLD}$1${RESET}"
    echo "    Install it with: $2"
    exit 1
  fi
}

log "Checking prerequisites..."
check_cmd node    "https://nodejs.org"
check_cmd npm     "comes with Node.js"
check_cmd cargo   "https://rustup.rs"

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  err "Node.js 20+ required (found v$NODE_VER)"
  exit 1
fi
ok "All prerequisites found"

# ── Install dependencies ─────────────────────────────────────────────────────
if [ ! -d "$ROOT/node_modules" ]; then
  log "Installing monorepo dependencies..."
  npm install --prefix "$ROOT"
else
  ok "Dependencies already installed"
fi

if ! npx wrangler --version >/dev/null 2>&1; then
  err "Wrangler is not available via local dependencies."
  echo "    Run: npm install"
  exit 1
fi
ok "Wrangler available via npx"

# ── D1 local migration ───────────────────────────────────────────────────────
log "Applying local D1 migrations..."
cd "$ROOT/apps/api"
printf 'y\n' | npx wrangler d1 migrations apply vibe-coders-db --local >/dev/null
cd "$ROOT"
ok "Local D1 migrations applied"

# ── Wrangler config check ────────────────────────────────────────────────────
WRANGLER_TOML="$ROOT/apps/api/wrangler.toml"
if grep -q "placeholder-" "$WRANGLER_TOML"; then
  warn "wrangler.toml still has placeholder IDs."
  warn "Local dev will work with --local flag (no real Cloudflare account needed)."
fi

# ── Port availability ─────────────────────────────────────────────────────────
check_port() {
  if lsof -Pi ":$1" -sTCP:LISTEN -t &>/dev/null; then
    err "Port $1 is already in use. Free it and re-run."
    exit 1
  fi
}
check_port 8787   # Wrangler dev
check_port 3000   # Next.js

# ── Log file setup ───────────────────────────────────────────────────────────
LOG_DIR="$ROOT/.dev-logs"
mkdir -p "$LOG_DIR"

# ── Start: API (Cloudflare Workers local) ────────────────────────────────────
log "Starting API worker on ${BOLD}http://localhost:8787${RESET}..."
cd "$ROOT/apps/api"
npx wrangler dev --local --port 8787 \
  > "$LOG_DIR/api.log" 2>&1 &
PIDS+=($!)
API_PID=$!
cd "$ROOT"

# Wait for API to be ready
sleep 3
if ! kill -0 "$API_PID" 2>/dev/null; then
  err "API worker failed to start. Check logs: $LOG_DIR/api.log"
  cat "$LOG_DIR/api.log" | tail -20
  exit 1
fi
ok "API worker running (pid $API_PID)"

# ── Start: Web frontend (Next.js) ────────────────────────────────────────────
log "Starting web frontend on ${BOLD}http://localhost:3000${RESET}..."
cd "$ROOT/apps/web"
NEXT_PUBLIC_API_URL="http://localhost:8787" \
  npx next dev --port 3000 \
  > "$LOG_DIR/web.log" 2>&1 &
PIDS+=($!)
WEB_PID=$!
cd "$ROOT"

# Wait for Next.js to be ready
log "Waiting for Next.js to compile..."
for i in $(seq 1 30); do
  sleep 2
  if curl -sf "http://localhost:3000" > /dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    err "Next.js failed to start. Check logs: $LOG_DIR/web.log"
    cat "$LOG_DIR/web.log" | tail -20
    exit 1
  fi
done
ok "Next.js running (pid $WEB_PID)"

# ── Start: Desktop app (Tauri) ───────────────────────────────────────────────
log "Starting Tauri desktop app..."
log "(Rust binary already compiled, window should open shortly)"
cd "$ROOT/apps/desktop"
VIBE_API_URL="http://localhost:8787" \
  npx tauri dev \
  > "$LOG_DIR/desktop.log" 2>&1 &
PIDS+=($!)
DESKTOP_PID=$!
cd "$ROOT"
ok "Tauri started (pid $DESKTOP_PID)"

# Wait up to 60s for the Tauri window to appear (check log for "Running DevCommand")
log "Waiting for Tauri window..."
for i in $(seq 1 30); do
  sleep 2
  if grep -q "Running DevCommand\|Window created\|App started\|Finished\|running" "$LOG_DIR/desktop.log" 2>/dev/null; then
    ok "Tauri window launched"
    break
  fi
  if ! kill -0 "$DESKTOP_PID" 2>/dev/null; then
    err "Tauri failed to start. Check logs: $LOG_DIR/desktop.log"
    tail -30 "$LOG_DIR/desktop.log"
    exit 1
  fi
done

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  Vibe Coders Map - Dev Environment${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${CYAN}API Worker${RESET}      → http://localhost:8787"
echo -e "  ${CYAN}Map Frontend${RESET}   → http://localhost:3000"
echo -e "  ${CYAN}Desktop App${RESET}    → Native window (opening...)"
echo ""
echo -e "  ${YELLOW}Logs${RESET} → $LOG_DIR/"
echo -e "    api.log     - Cloudflare Workers"
echo -e "    web.log     - Next.js"
echo -e "    desktop.log - Tauri / Rust"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop all processes."
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

# ── Keep alive: tail all logs ────────────────────────────────────────────────
tail -f "$LOG_DIR/api.log" "$LOG_DIR/web.log" "$LOG_DIR/desktop.log" &
PIDS+=($!)

# ── Wait forever (until Ctrl+C) ──────────────────────────────────────────────
wait
