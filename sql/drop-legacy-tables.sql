-- drop-legacy-tables.sql
--
-- Run this ONCE, MANUALLY, after installing the claude-cli plugin AND verifying
-- that the data migration script has completed successfully.
--
-- This drops the old Prisma-managed tables that were replaced by plugin-owned
-- tables (plugin_claude_cli_rate_limit_snapshot, plugin_claude_cli_semaphore_slot).
--
-- Prerequisites:
--   1. Plugin installed and has run at least once (plugin tables exist)
--   2. scripts/migrate-claude-cli-to-plugin.ts completed successfully
--   3. Harmoven schema.prisma no longer references these models (already done)
--
-- How to run:
--   psql "$DATABASE_URL" -f sql/drop-legacy-tables.sql
--
-- This file is intentionally NOT a Prisma migration — the DROP must be
-- triggered by an explicit operator action, never automatically on deploy.

-- Safety guard: abort if plugin tables do not exist yet.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'plugin_claude_cli_rate_limit_snapshot'
  ) THEN
    RAISE EXCEPTION
      'Aborted: plugin_claude_cli_rate_limit_snapshot does not exist. '
      'Start Harmoven with the plugin installed first so the DDL runs, '
      'then re-run this script.';
  END IF;
END
$$;

DROP INDEX  IF EXISTS "ClaudeCliSemaphoreSlot_held_by_idx";
DROP TABLE  IF EXISTS "ClaudeCliSemaphoreSlot";
DROP TABLE  IF EXISTS "ClaudeCliRateLimitSnapshot";
