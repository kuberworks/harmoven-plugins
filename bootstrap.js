"use strict";
// bootstrap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Entry point called by harmoven's lib/bootstrap/load-system-plugins.ts.
//
// Uses loose types (no @/ imports) so this file can be transpiled and
// executed standalone — before the main harmoven app module graph is loaded.
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = bootstrap;
async function bootstrap(ctx) {
    // ── DDL (idempotent) — plugin owns its own tables ──────────────────────────
    // If the tables already exist (fresh install, data migration complete) these
    // statements are pure no-ops.  On a clean install they create the tables.
    const db = ctx.db;
    await db.$executeRaw `
    CREATE TABLE IF NOT EXISTS "plugin_claude_cli_rate_limit_snapshot" (
      id                              INTEGER PRIMARY KEY DEFAULT 1,
      session_exhausted_until         TIMESTAMPTZ,
      weekly_non_opus_exhausted_until TIMESTAMPTZ,
      weekly_opus_exhausted_until     TIMESTAMPTZ,
      session_call_count              INTEGER          NOT NULL DEFAULT 0,
      weekly_non_opus_call_count      INTEGER          NOT NULL DEFAULT 0,
      weekly_opus_call_count          INTEGER          NOT NULL DEFAULT 0,
      session_window_start            TIMESTAMPTZ,
      weekly_window_start             TIMESTAMPTZ,
      session_tokens_in               INTEGER          NOT NULL DEFAULT 0,
      session_tokens_out              INTEGER          NOT NULL DEFAULT 0,
      weekly_non_opus_tokens_in       INTEGER          NOT NULL DEFAULT 0,
      weekly_non_opus_tokens_out      INTEGER          NOT NULL DEFAULT 0,
      weekly_opus_tokens_in           INTEGER          NOT NULL DEFAULT 0,
      weekly_opus_tokens_out          INTEGER          NOT NULL DEFAULT 0,
      plugin_status                   TEXT             NOT NULL DEFAULT 'not_configured',
      dead_reason                     TEXT,
      weekly_overage_usd              DOUBLE PRECISION NOT NULL DEFAULT 0,
      updated_at                      TIMESTAMPTZ      NOT NULL DEFAULT now()
    )
  `;
    await db.$executeRaw `
    CREATE TABLE IF NOT EXISTS "plugin_claude_cli_semaphore_slot" (
      id      INTEGER PRIMARY KEY,
      held_by TEXT,
      held_at TIMESTAMPTZ
    )
  `;
    await db.$executeRaw `
    CREATE INDEX IF NOT EXISTS "plugin_claude_cli_semaphore_slot_held_by_idx"
      ON "plugin_claude_cli_semaphore_slot" (held_by)
  `;
    ctx.log('info', '[claude-cli] DDL ensured (CREATE TABLE IF NOT EXISTS).');
    // ── Plugin registration ────────────────────────────────────────────────────
    // bootstrap.ts compiles to bootstrap.js (root); src/index.ts compiles to dist/index.js
    const { register, initWithDb } = await import('./dist/index.js');
    // Inject the Prisma client before any DB-using code runs
    initWithDb(ctx.db);
    // Register the provider (register() accepts optional ctx for legacy system-plugin path)
    register({
        registerLlmPlugin: ctx.registerLlmPlugin,
        dispatchNotification: ctx.dispatchNotification,
    });
    ctx.log('info', '[claude-cli] Subscription provider registered');
}
