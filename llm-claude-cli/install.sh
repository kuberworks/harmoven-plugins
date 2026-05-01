#!/usr/bin/env bash
# install.sh — Build and deploy the claude-cli LLM plugin to a Harmoven instance.
#
# Modes:
#   --subprocess  (default) Copy plugin.cjs + harmoven-plugin.json into
#                           lib/llm/plugins/claude-cli/ (subprocess isolation model).
#                           Works for both Node.js and Docker (volume mount).
#
#   --symlink               Like --subprocess but symlinks instead of copying.
#                           For local dev only — do NOT use with Docker.
#
# Usage:
#   ./install.sh <harmoven-root>
#   ./install.sh <harmoven-root> --subprocess   # explicit
#   ./install.sh <harmoven-root> --symlink      # local dev
#
# Build step:
#   The script runs `npm run build:plugin` if plugin.cjs is missing or older
#   than src/index.ts. Pass --no-build to skip this check.
#
# Examples:
#   ./install.sh /opt/harmoven
#   ./install.sh ../harmoven --symlink
#   ./install.sh ../harmoven --no-build          # skip esbuild
#
# Docker usage (add to docker-compose.yml volumes):
#   - /path/to/harmoven-plugins/llm-claude-cli:/app/lib/llm/plugins/claude-cli:ro
#   Then run: ./install.sh ../harmoven --no-build  (no copy needed — volume handles it)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Args ─────────────────────────────────────────────────────────────────────

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <harmoven-root> [--subprocess|--symlink] [--no-build]" >&2
  exit 1
fi

HARMOVEN_ROOT="$(cd "$1" && pwd)"
MODE="subprocess"
SKIP_BUILD=false

for arg in "${@:2}"; do
  case "$arg" in
    --subprocess) MODE="subprocess" ;;
    --symlink)    MODE="symlink" ;;
    --no-build)   SKIP_BUILD=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

# ─── Validate harmoven root ───────────────────────────────────────────────────

if [[ ! -d "${HARMOVEN_ROOT}/lib/llm" ]]; then
  echo "Error: ${HARMOVEN_ROOT} does not look like a Harmoven root (lib/llm/ not found)." >&2
  exit 1
fi

# ─── Build plugin.cjs if needed ───────────────────────────────────────────────

PLUGIN_CJS="${SCRIPT_DIR}/plugin.cjs"
ENTRY="${SCRIPT_DIR}/src/index.ts"
MANIFEST="${SCRIPT_DIR}/harmoven-plugin.json"

if [[ "$SKIP_BUILD" == false ]]; then
  if [[ ! -f "$PLUGIN_CJS" ]] || [[ "$ENTRY" -nt "$PLUGIN_CJS" ]]; then
    echo "[install] Building plugin.cjs..."
    cd "${SCRIPT_DIR}"
    npm run build:plugin
    cd - > /dev/null
  else
    echo "[install] plugin.cjs is up to date — skipping build (use --no-build to suppress this check)"
  fi
fi

if [[ ! -f "$PLUGIN_CJS" ]]; then
  echo "Error: plugin.cjs not found after build. Check build errors above." >&2
  exit 1
fi

if [[ ! -f "$MANIFEST" ]]; then
  echo "Error: harmoven-plugin.json not found in ${SCRIPT_DIR}" >&2
  exit 1
fi

# ─── Install ──────────────────────────────────────────────────────────────────

DEST_DIR="${HARMOVEN_ROOT}/lib/llm/plugins/claude-cli"
mkdir -p "${HARMOVEN_ROOT}/lib/llm/plugins"

echo ""
echo "  Plugin source : ${SCRIPT_DIR}"
echo "  Destination   : ${DEST_DIR}"
echo "  Mode          : ${MODE}"
echo ""

if [[ "$MODE" == "symlink" ]]; then
  if [[ -e "$DEST_DIR" && ! -L "$DEST_DIR" ]]; then
    echo "Error: ${DEST_DIR} exists and is not a symlink. Remove it first." >&2
    exit 1
  fi
  ln -sfn "${SCRIPT_DIR}" "${DEST_DIR}"
  echo "[install] Symlinked: ${DEST_DIR} → ${SCRIPT_DIR}"
else
  # copy mode — safe for production
  rm -rf "${DEST_DIR}"
  mkdir -p "${DEST_DIR}"
  cp "${PLUGIN_CJS}" "${DEST_DIR}/plugin.cjs"
  cp "${MANIFEST}"   "${DEST_DIR}/harmoven-plugin.json"
  echo "[install] Copied plugin.cjs + harmoven-plugin.json to ${DEST_DIR}"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "  ✓ claude-cli plugin installed."
echo ""
echo "  Required env vars in harmoven/.env (or injected via secret manager):"
echo "    CLAUDE_CODE_OAUTH_TOKEN=<token from 'claude setup-token'>"
echo "    CLAUDE_CLI_TOS_ACKNOWLEDGED=true"
echo ""
echo "  Restart the server to activate the plugin."
echo "  To uninstall: ./uninstall.sh ${HARMOVEN_ROOT}"
echo ""
