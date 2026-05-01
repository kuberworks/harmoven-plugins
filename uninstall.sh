#!/usr/bin/env bash
# uninstall.sh — Uninstall the claude-cli system plugin from a Harmoven instance.
#
# Usage:
#   ./uninstall.sh <harmoven-root>
#   ./uninstall.sh <harmoven-root> --drop-data
#
# Default behaviour:
#   - Removes lib/plugins/claude-cli from the Harmoven instance
#   - Leaves the plugin DB tables intact (data is preserved)
#   - You can reinstall the plugin later and it will resume from the saved state
#
# With --drop-data:
#   - Also drops the plugin-owned tables from the database:
#       plugin_claude_cli_rate_limit_snapshot
#       plugin_claude_cli_semaphore_slot
#   - Requires DATABASE_URL to be set in the environment or in <harmoven-root>/.env.local
#   - This is IRREVERSIBLE — all rate-limit history and semaphore state will be lost
#
# Examples:
#   ./uninstall.sh /opt/harmoven
#   DATABASE_URL=postgresql://... ./uninstall.sh /opt/harmoven --drop-data

set -euo pipefail

# ─── Args ─────────────────────────────────────────────────────────────────────

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <harmoven-root> [--drop-data]" >&2
  exit 1
fi

HARMOVEN_ROOT="$(cd "$1" && pwd)"
DROP_DATA=false
if [[ "${2:-}" == "--drop-data" ]]; then
  DROP_DATA=true
fi

PLUGIN_DIR="${HARMOVEN_ROOT}/lib/plugins/claude-cli"

# ─── Validate ─────────────────────────────────────────────────────────────────

if [[ ! -d "${HARMOVEN_ROOT}/lib/plugins" ]]; then
  echo "Error: ${HARMOVEN_ROOT} does not look like a Harmoven root (lib/plugins/ not found)." >&2
  exit 1
fi

if [[ ! -e "${PLUGIN_DIR}" ]]; then
  echo "Warning: ${PLUGIN_DIR} does not exist — plugin may already be uninstalled."
  exit 0
fi

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "  ┌─────────────────────────────────────────────────────────────────────┐"
echo "  │  HARMOVEN PLUGIN UNINSTALL — claude-cli                            │"
echo "  └─────────────────────────────────────────────────────────────────────┘"
echo ""
echo "  Harmoven root : ${HARMOVEN_ROOT}"
echo "  Plugin path   : ${PLUGIN_DIR}"
if [[ "${DROP_DATA}" == true ]]; then
  echo "  Drop data     : YES (plugin DB tables will be DROPPED — irreversible)"
else
  echo "  Drop data     : NO  (DB tables are kept; data survives for reinstall)"
fi
echo ""

if [[ -t 0 ]]; then
  if [[ "${DROP_DATA}" == true ]]; then
    read -r -p "  Type 'yes, drop data' to confirm: " CONFIRM
    if [[ "${CONFIRM}" != "yes, drop data" ]]; then
      echo "Uninstall cancelled."
      exit 0
    fi
  else
    read -r -p "  Type 'yes' to confirm: " CONFIRM
    if [[ "${CONFIRM}" != "yes" ]]; then
      echo "Uninstall cancelled."
      exit 0
    fi
  fi
fi

# ─── Remove plugin files ──────────────────────────────────────────────────────

rm -rf "${PLUGIN_DIR}"
echo ""
echo "  ✓ Plugin files removed: ${PLUGIN_DIR}"

# ─── (Optional) Drop DB tables ───────────────────────────────────────────────

if [[ "${DROP_DATA}" == true ]]; then
  # Resolve DATABASE_URL — try env, then .env.local
  if [[ -z "${DATABASE_URL:-}" && -f "${HARMOVEN_ROOT}/.env.local" ]]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "${HARMOVEN_ROOT}/.env.local" | head -1 | cut -d= -f2-)"
  fi

  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo ""
    echo "  ✗ Cannot drop tables: DATABASE_URL is not set." >&2
    echo "    Set it in the environment or in ${HARMOVEN_ROOT}/.env.local and re-run with --drop-data." >&2
    exit 1
  fi

  if ! command -v psql &>/dev/null; then
    echo ""
    echo "  ✗ Cannot drop tables: psql is not installed." >&2
    echo "    Run the following SQL manually:" >&2
    echo '      DROP TABLE IF EXISTS "plugin_claude_cli_semaphore_slot";' >&2
    echo '      DROP TABLE IF EXISTS "plugin_claude_cli_rate_limit_snapshot";' >&2
    exit 1
  fi

  psql "${DATABASE_URL}" <<'SQL'
    DROP INDEX  IF EXISTS "plugin_claude_cli_semaphore_slot_held_by_idx";
    DROP TABLE  IF EXISTS "plugin_claude_cli_semaphore_slot";
    DROP TABLE  IF EXISTS "plugin_claude_cli_rate_limit_snapshot";
SQL

  echo "  ✓ Plugin DB tables dropped."
fi

# ─── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "  Restart the Harmoven server to complete the uninstall."
if [[ "${DROP_DATA}" == false ]]; then
  echo "  To reinstall later: ./scripts/install-system-plugin.sh <source> [--symlink]"
  echo "  The plugin will resume from the saved rate-limit state on next startup."
fi
echo ""
