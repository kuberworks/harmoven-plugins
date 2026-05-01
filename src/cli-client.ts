// src/cli-client.ts
// ─────────────────────────────────────────────────────────────────────────────
// Internal implementation of the Claude CLI provider plugin.
//
// All types are defined locally (no harmoven @/ imports).
// DB access is injected at bootstrap via initWithDb().
//
// Key empirical findings (validated on Claude Code 2.1.116, 2026-04-25):
//  - Auth failure: RC=1 + api_error_status=401 in stdout JSON (not RC=2)
//  - Stream delta: obj.event.delta.text where type==="stream_event"
//    + event.type==="content_block_delta"
//  - --include-partial-messages required for streaming
//  - --permission-mode default (NOT dontAsk)
//  - --mcp-config '{"mcpServers":{}}' (NOT '{}')
//  - HOME isolation required for RC=0 on ping
//  - total_cost_usd non-zero even on subscription (~$0.017) — log at DEBUG, always return 0
// ─────────────────────────────────────────────────────────────────────────────

import path               from 'node:path'
import { promises as fs } from 'node:fs'
import { spawn }          from 'node:child_process'
import { randomUUID }     from 'node:crypto'

import type { LlmProfileConfig, ChatMessage, ChatOptions, ChatResult } from './types.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CliConfig {
  oauthTokenEnv:                string
  minCliVersion:                string
  scratchBaseDir:               string
  maxConcurrent:                number
  enableOpus:                   boolean
  spawnTimeoutMs:               number
  streamInactivityMs:           number
  streamHardCapMs:              number
  overageAlertThresholdUsd:     number
  circuitOpenDurationMs:        number
  circuitFailureThreshold:      number
  tokenValidationIntervalHours: number
}

export interface CliChatResult extends ChatResult {
  billingMode: 'subscription'
}

export class AuthError extends Error {
  constructor(
    message = '[claude-cli] Token expired — regenerate with: claude setup-token',
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export class RateLimitError extends Error {
  constructor(
    message:              string,
    public readonly resetAt: Date,
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

// ─── Module-scope state ───────────────────────────────────────────────────────

interface CliRateLimitStateInternal {
  sessionExhaustedUntil:         Date | null
  weeklyNonOpusExhaustedUntil:   Date | null
  weeklyOpusExhaustedUntil:      Date | null
  sessionCallCount:              number
  sessionTokensIn:               number
  sessionTokensOut:              number
  weeklyNonOpusCallCount:        number
  weeklyNonOpusTokensIn:         number
  weeklyNonOpusTokensOut:        number
  weeklyOpusCallCount:           number
  weeklyOpusTokensIn:            number
  weeklyOpusTokensOut:           number
  sessionWindowStart:            Date | null
  weeklyWindowStart:             Date | null
  weeklyOverageUsd:              number
}

export interface CliDebugEntry {
  ts:      string   // ISO
  level:   'info' | 'warn' | 'error' | 'debug'
  msg:     string
  profile?: string
}

export interface CircuitBreakerState {
  circuitState:    'closed' | 'open' | 'half-open'
  failureCount:    number
  lastFailureAt:   Date | null
  circuitOpenedAt: Date | null
}

export interface ISemaphore {
  acquire(): Promise<unknown>
  release(token: unknown): void | Promise<void>
}

// ─── Shared globals ───────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __claudeCli: {
    state:               CliRateLimitStateInternal
    pluginStatus:        'active' | 'dead' | 'not_configured'
    deadReason:          string | undefined
    semaphore:           ISemaphore | null
    stateMutex:          StateMutex | null
    circuit:             CircuitBreakerState
    config:              CliConfig | null
    debugLog:            CliDebugEntry[]
    debugSubs:           Set<(e: CliDebugEntry) => void>
    /** Injected at bootstrap via initWithDb() */
    db:                  unknown | null
    /** Stored so the harmoven admin stub can call persistSnapshotToDb without importing this module */
    persistSnapshotFn:   (() => Promise<void>) | undefined
  } | undefined
}

if (!globalThis.__claudeCli) {
  globalThis.__claudeCli = {
    state: {
      sessionExhaustedUntil:         null,
      weeklyNonOpusExhaustedUntil:   null,
      weeklyOpusExhaustedUntil:      null,
      sessionCallCount:              0,
      sessionTokensIn:               0,
      sessionTokensOut:              0,
      weeklyNonOpusCallCount:        0,
      weeklyNonOpusTokensIn:         0,
      weeklyNonOpusTokensOut:        0,
      weeklyOpusCallCount:           0,
      weeklyOpusTokensIn:            0,
      weeklyOpusTokensOut:           0,
      sessionWindowStart:            null,
      weeklyWindowStart:             null,
      weeklyOverageUsd:              0,
    },
    pluginStatus:      'not_configured',
    deadReason:        undefined,
    semaphore:         null,
    stateMutex:        null,
    circuit: {
      circuitState:    'closed',
      failureCount:    0,
      lastFailureAt:   null,
      circuitOpenedAt: null,
    },
    config:            null,
    debugLog:          [],
    debugSubs:         new Set(),
    db:                null,
    persistSnapshotFn: undefined,
  }
}

const _g = globalThis.__claudeCli!

// ─── DB injection (bootstrap) ──────────────────────────────────────────────────

/**
 * Inject the Prisma client at bootstrap time.
 * Must be called before any LLM call that triggers persistSnapshotToDb().
 */
export function initWithDb(db: unknown): void {
  _g.db = db
  cliLog('info', 'DB injected via initWithDb()')
}

/** Internal: get the injected DB client. */
async function getDb(): Promise<Record<string, unknown>> {
  if (!_g.db) {
    throw new Error('[claude-cli] DB not initialized — call bootstrap() before making LLM calls')
  }
  return _g.db as Record<string, unknown>
}

// ─── Log redaction (T050) ─────────────────────────────────────────────────────

const SENSITIVE_PATTERN = /sk-ant-(?:oat\d{2}-|api0[23]-)[A-Za-z0-9\-_]{10,}/g

export function redactSensitive(msg: string): string {
  return msg.replace(SENSITIVE_PATTERN, '[REDACTED]')
}

function cliLog(level: CliDebugEntry['level'], rawMsg: string, profile?: string): void {
  const msg   = redactSensitive(rawMsg)
  const entry: CliDebugEntry = { ts: new Date().toISOString(), level, msg, profile }
  _g.debugLog.push(entry)
  if (_g.debugLog.length > 200) _g.debugLog.shift()
  for (const sub of _g.debugSubs) { try { sub(entry) } catch { /* ignore */ } }
  const line = `[claude-cli${profile ? ':' + profile : ''}] ${msg}`
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export function subscribeCliDebug(fn: (e: CliDebugEntry) => void): () => void {
  _g.debugSubs.add(fn)
  return () => _g.debugSubs.delete(fn)
}

export function getCliDebugLog(): CliDebugEntry[] {
  return [..._g.debugLog]
}

const _state = _g.state

// ─── Semaphore ────────────────────────────────────────────────────────────────

class Semaphore {
  private permits:  number
  private readonly queue: Array<() => void> = []

  constructor(maxPermits: number) {
    this.permits = maxPermits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }
    return new Promise<void>(resolve => {
      this.queue.push(resolve)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  release(_token?: unknown): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!
      next()
    } else {
      this.permits++
    }
  }
}

// ─── Config / semaphore init ───────────────────────────────────────────────────

async function resolveScratchBaseDir(configured: string): Promise<string> {
  if (configured !== '/tmp/harmoven-claude') return configured
  try {
    await fs.access('/dev/shm', 2 /* W_OK */)
    return '/dev/shm/harmoven-claude'
  } catch {
    return configured
  }
}

export function setActiveSemaphore(sem: ISemaphore): void {
  _g.semaphore = sem
  cliLog('info', `Active semaphore set: ${sem.constructor.name}`)
}

export function setConfig(cfg: CliConfig): void {
  _g.config    = cfg
  _g.semaphore = new Semaphore(cfg.maxConcurrent)
  resolveScratchBaseDir(cfg.scratchBaseDir).then(resolved => {
    if (_g.config && resolved !== _g.config.scratchBaseDir) {
      cliLog('info', `scratchBaseDir resolved to ${resolved} (tmpfs)`)
      _g.config = { ..._g.config, scratchBaseDir: resolved }
    }
  }).catch(() => { /* ignore */ })
  fs.readdir(cfg.scratchBaseDir)
    .then(entries => Promise.all(
      entries.map(e => fs.rm(path.join(cfg.scratchBaseDir, e), { recursive: true, force: true }))
    ))
    .catch(() => { /* directory may not exist yet — ignore */ })
}

function requireConfig(): CliConfig {
  if (!_g.config) throw new Error('[claude-cli] Plugin not initialized — call register() first')
  return _g.config
}

// ─── Plugin status accessors ──────────────────────────────────────────────────

export function getCliState(): {
  pluginStatus: 'active' | 'dead' | 'not_configured'
  deadReason:   string | undefined
  circuit:      CircuitBreakerState
  session: {
    windowStart:    string | null
    exhaustedUntil: string | null
    callCount:      number
    tokensIn:       number
    tokensOut:      number
  }
  weekly: {
    windowStart: string | null
    overageUsd:  number
    nonOpus: {
      exhaustedUntil: string | null
      callCount:      number
      tokensIn:       number
      tokensOut:      number
    }
    opus: {
      exhaustedUntil: string | null
      callCount:      number
      tokensIn:       number
      tokensOut:      number
    }
  }
} {
  return {
    pluginStatus: _g.pluginStatus,
    deadReason:   _g.deadReason,
    circuit:      { ..._g.circuit },
    session: {
      windowStart:    _state.sessionWindowStart?.toISOString() ?? null,
      exhaustedUntil: _state.sessionExhaustedUntil?.toISOString() ?? null,
      callCount:      _state.sessionCallCount,
      tokensIn:       _state.sessionTokensIn,
      tokensOut:      _state.sessionTokensOut,
    },
    weekly: {
      windowStart: _state.weeklyWindowStart?.toISOString() ?? null,
      overageUsd:  _state.weeklyOverageUsd,
      nonOpus: {
        exhaustedUntil: _state.weeklyNonOpusExhaustedUntil?.toISOString() ?? null,
        callCount:      _state.weeklyNonOpusCallCount,
        tokensIn:       _state.weeklyNonOpusTokensIn,
        tokensOut:      _state.weeklyNonOpusTokensOut,
      },
      opus: {
        exhaustedUntil: _state.weeklyOpusExhaustedUntil?.toISOString() ?? null,
        callCount:      _state.weeklyOpusCallCount,
        tokensIn:       _state.weeklyOpusTokensIn,
        tokensOut:      _state.weeklyOpusTokensOut,
      },
    },
  }
}

export function markPluginActive(): void {
  _g.pluginStatus = 'active'
  _g.deadReason   = undefined
}

export function markPluginDead(reason: string): void {
  _g.pluginStatus = 'dead'
  _g.deadReason   = reason
  persistSnapshotToDb().catch(err =>
    cliLog('warn', `Failed to persist dead state to DB: ${(err as Error).message}`)
  )
}

export function markPluginNotConfigured(): void {
  _g.pluginStatus = 'not_configured'
  _g.deadReason   = undefined
}

// ─── DB persistence for rate-limit state (T041) ───────────────────────────────

export async function persistSnapshotToDb(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (await getDb()) as any
    await db.$executeRaw`
      INSERT INTO "plugin_claude_cli_rate_limit_snapshot" (
        id,
        session_exhausted_until,
        weekly_non_opus_exhausted_until,
        weekly_opus_exhausted_until,
        session_call_count,
        weekly_non_opus_call_count,
        weekly_opus_call_count,
        session_window_start,
        weekly_window_start,
        session_tokens_in,
        session_tokens_out,
        weekly_non_opus_tokens_in,
        weekly_non_opus_tokens_out,
        weekly_opus_tokens_in,
        weekly_opus_tokens_out,
        plugin_status,
        dead_reason,
        weekly_overage_usd,
        updated_at
      ) VALUES (
        1,
        ${_state.sessionExhaustedUntil},
        ${_state.weeklyNonOpusExhaustedUntil},
        ${_state.weeklyOpusExhaustedUntil},
        ${_state.sessionCallCount},
        ${_state.weeklyNonOpusCallCount},
        ${_state.weeklyOpusCallCount},
        ${_state.sessionWindowStart},
        ${_state.weeklyWindowStart},
        ${_state.sessionTokensIn},
        ${_state.sessionTokensOut},
        ${_state.weeklyNonOpusTokensIn},
        ${_state.weeklyNonOpusTokensOut},
        ${_state.weeklyOpusTokensIn},
        ${_state.weeklyOpusTokensOut},
        ${_g.pluginStatus},
        ${_g.deadReason ?? null},
        ${_state.weeklyOverageUsd},
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        session_exhausted_until         = EXCLUDED.session_exhausted_until,
        weekly_non_opus_exhausted_until = EXCLUDED.weekly_non_opus_exhausted_until,
        weekly_opus_exhausted_until     = EXCLUDED.weekly_opus_exhausted_until,
        session_call_count              = EXCLUDED.session_call_count,
        weekly_non_opus_call_count      = EXCLUDED.weekly_non_opus_call_count,
        weekly_opus_call_count          = EXCLUDED.weekly_opus_call_count,
        session_window_start            = EXCLUDED.session_window_start,
        weekly_window_start             = EXCLUDED.weekly_window_start,
        session_tokens_in               = EXCLUDED.session_tokens_in,
        session_tokens_out              = EXCLUDED.session_tokens_out,
        weekly_non_opus_tokens_in       = EXCLUDED.weekly_non_opus_tokens_in,
        weekly_non_opus_tokens_out      = EXCLUDED.weekly_non_opus_tokens_out,
        weekly_opus_tokens_in           = EXCLUDED.weekly_opus_tokens_in,
        weekly_opus_tokens_out          = EXCLUDED.weekly_opus_tokens_out,
        plugin_status                   = EXCLUDED.plugin_status,
        dead_reason                     = EXCLUDED.dead_reason,
        weekly_overage_usd              = EXCLUDED.weekly_overage_usd,
        updated_at                      = now()
    `
  } catch {
    // DB unavailable at startup or in test environments — non-fatal.
  }
}

export async function loadSnapshotFromDb(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db  = (await getDb()) as any
    const rows = await db.$queryRaw`
      SELECT * FROM "plugin_claude_cli_rate_limit_snapshot" WHERE id = 1
    `
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (rows as any[])[0]
    if (!row) return

    _state.sessionExhaustedUntil       = row.session_exhausted_until
    _state.weeklyNonOpusExhaustedUntil = row.weekly_non_opus_exhausted_until
    _state.weeklyOpusExhaustedUntil    = row.weekly_opus_exhausted_until
    _state.sessionCallCount            = row.session_call_count
    _state.weeklyNonOpusCallCount      = row.weekly_non_opus_call_count
    _state.weeklyOpusCallCount         = row.weekly_opus_call_count
    _state.sessionWindowStart          = row.session_window_start
    _state.weeklyWindowStart           = row.weekly_window_start
    _state.sessionTokensIn             = row.session_tokens_in
    _state.sessionTokensOut            = row.session_tokens_out
    _state.weeklyNonOpusTokensIn       = row.weekly_non_opus_tokens_in
    _state.weeklyNonOpusTokensOut      = row.weekly_non_opus_tokens_out
    _state.weeklyOpusTokensIn          = row.weekly_opus_tokens_in
    _state.weeklyOpusTokensOut         = row.weekly_opus_tokens_out
    _state.weeklyOverageUsd            = row.weekly_overage_usd
    _g.pluginStatus                    = row.plugin_status as 'active' | 'dead' | 'not_configured'
    _g.deadReason                      = row.dead_reason ?? undefined

    cliLog('info', `Rate-limit state restored from DB: pluginStatus=${_g.pluginStatus} ` +
      `sessionExhaustedUntil=${row.session_exhausted_until?.toISOString() ?? 'none'}`)
  } catch {
    // DB unavailable — start with clean in-memory state.
  }
}

// Register persistSnapshotToDb so the harmoven admin stub can call it without importing this module
_g.persistSnapshotFn = persistSnapshotToDb

// ─── Rate-limit classification (T047) ─────────────────────────────────────────

export type RateLimitCategory = 'session' | 'weekly_non_opus' | 'weekly_opus' | 'transient'
const KNOWN_RATE_LIMIT_TYPES: Record<string, RateLimitCategory> = {
  weekly_opus:     'weekly_opus',
  weekly_non_opus: 'weekly_non_opus',
  session:         'session',
  daily:           'session',
  request_limit:   'session',
  token_limit:     'transient',
  message_limit:   'transient',
  five_hour:       'session',
}

export function classifyRateLimitType(
  type:           string,
  resetHorizonMs: number,
  isOpusProfile:  boolean,
): RateLimitCategory {
  if (isOpusProfile) return 'weekly_opus'

  const knownCategory = KNOWN_RATE_LIMIT_TYPES[type.toLowerCase()]
  if (knownCategory !== undefined) return knownCategory

  cliLog('warn',
    `[claude-cli] Unknown rate_limit_event type "${type}" — defaulting to session category. ` +
    `If you see this, file an issue at github.com/harmoven/harmoven with the full CLI output.`)

  const TWO_HOURS_MS = 2 * 3_600_000
  const ONE_MIN_MS   = 60_000
  if (resetHorizonMs > TWO_HOURS_MS)  return 'weekly_non_opus'
  if (resetHorizonMs > ONE_MIN_MS)    return 'session'
  return 'transient'
}

// ─── State mutation mutex (T042) ──────────────────────────────────────────────

class StateMutex {
  private _locked = false
  private readonly _queue: Array<() => void> = []

  async acquire(): Promise<void> {
    if (!this._locked) {
      this._locked = true
      return
    }
    return new Promise<void>(resolve => this._queue.push(resolve))
  }

  release(): void {
    if (this._queue.length > 0) {
      const next = this._queue.shift()!
      next()
    } else {
      this._locked = false
    }
  }
}

if (!globalThis.__claudeCli!.stateMutex) {
  globalThis.__claudeCli!.stateMutex = new StateMutex()
}
const _stateMutex = globalThis.__claudeCli!.stateMutex!

// ─── Rate-limit guard ─────────────────────────────────────────────────────────

function isOpus(profile: LlmProfileConfig): boolean {
  return profile.id === 'claude-cli-opus'
}

export function checkRateLimitGuard(profile: LlmProfileConfig): void {
  const now = new Date()

  if (_state.sessionExhaustedUntil && _state.sessionExhaustedUntil > now) {
    const diffMs = _state.sessionExhaustedUntil.getTime() - now.getTime()
    const hours  = Math.floor(diffMs / 3_600_000)
    const mins   = Math.floor((diffMs % 3_600_000) / 60_000)
    throw new RateLimitError(
      `[claude-cli] Session quota exhausted — next window in ~${hours}h ${mins}m`,
      _state.sessionExhaustedUntil,
    )
  }

  if (isOpus(profile)) {
    if (_state.weeklyOpusExhaustedUntil && _state.weeklyOpusExhaustedUntil > now) {
      throw new RateLimitError(
        '[claude-cli] Weekly Opus quota exhausted — resets within 7 days',
        _state.weeklyOpusExhaustedUntil,
      )
    }
  } else {
    if (_state.weeklyNonOpusExhaustedUntil && _state.weeklyNonOpusExhaustedUntil > now) {
      throw new RateLimitError(
        '[claude-cli] Weekly non-Opus quota exhausted — resets within 7 days',
        _state.weeklyNonOpusExhaustedUntil,
      )
    }
  }
}

export function recordExhaustion(
  profile: LlmProfileConfig,
  resetAt: Date,
  type:    'session' | 'weekly_non_opus' | 'weekly_opus',
): void {
  if (type === 'session') {
    _state.sessionExhaustedUntil = resetAt
  } else if (type === 'weekly_opus') {
    _state.weeklyOpusExhaustedUntil = resetAt
  } else {
    _state.weeklyNonOpusExhaustedUntil = resetAt
  }
  persistSnapshotToDb().catch(err =>
    cliLog('warn', `Failed to persist rate-limit snapshot: ${(err as Error).message}`)
  )
}

export function resetRateLimitState(): void {
  _state.sessionExhaustedUntil       = null
  _state.weeklyNonOpusExhaustedUntil = null
  _state.weeklyOpusExhaustedUntil    = null
  _g.circuit.circuitState    = 'closed'
  _g.circuit.failureCount    = 0
  _g.circuit.lastFailureAt   = null
  _g.circuit.circuitOpenedAt = null
  persistSnapshotToDb().catch(() => { /* best-effort */ })
}

export function updateCounters(
  profile:  LlmProfileConfig,
  tokensIn: number,
  tokensOut: number,
): void {
  if (_state.sessionWindowStart === null) _state.sessionWindowStart = new Date()
  if (_state.weeklyWindowStart  === null) _state.weeklyWindowStart  = new Date()

  _state.sessionCallCount++
  _state.sessionTokensIn  += tokensIn
  _state.sessionTokensOut += tokensOut

  if (isOpus(profile)) {
    _state.weeklyOpusCallCount++
    _state.weeklyOpusTokensIn  += tokensIn
    _state.weeklyOpusTokensOut += tokensOut
  } else {
    _state.weeklyNonOpusCallCount++
    _state.weeklyNonOpusTokensIn  += tokensIn
    _state.weeklyNonOpusTokensOut += tokensOut
  }
}

// ─── Circuit breaker (T046) ───────────────────────────────────────────────────

export function recordCircuitSuccess(): void {
  _g.circuit.failureCount    = 0
  _g.circuit.circuitState    = 'closed'
  _g.circuit.circuitOpenedAt = null
}

export function recordCircuitFailure(): void {
  const cfg = _g.config
  if (!cfg) return

  _g.circuit.failureCount++
  _g.circuit.lastFailureAt = new Date()

  const threshold = cfg.circuitFailureThreshold
  if (_g.circuit.circuitState === 'closed' && _g.circuit.failureCount >= threshold) {
    _g.circuit.circuitState    = 'open'
    _g.circuit.circuitOpenedAt = new Date()
    cliLog('error',
      `[claude-cli] Circuit breaker OPENED after ${_g.circuit.failureCount} consecutive failures. ` +
      `All calls rejected for ${cfg.circuitOpenDurationMs / 1000}s.`)
  } else if (_g.circuit.circuitState === 'half-open') {
    _g.circuit.circuitState    = 'open'
    _g.circuit.circuitOpenedAt = new Date()
    cliLog('error', `[claude-cli] Circuit breaker probe FAILED — reopened for ${cfg.circuitOpenDurationMs / 1000}s.`)
  }
}

export function checkCircuitBreaker(): void {
  const cb  = _g.circuit
  const cfg = _g.config
  if (!cfg || cb.circuitState === 'closed') return

  if (cb.circuitState === 'open') {
    const elapsed = cb.circuitOpenedAt
      ? Date.now() - cb.circuitOpenedAt.getTime()
      : Infinity
    if (elapsed >= cfg.circuitOpenDurationMs) {
      _g.circuit.circuitState = 'half-open'
      cliLog('info', '[claude-cli] Circuit breaker entering HALF-OPEN — allowing probe call.')
      return
    }
    const remainingS = Math.ceil((cfg.circuitOpenDurationMs - elapsed) / 1000)
    throw new Error(
      `[claude-cli] Circuit breaker OPEN — calls rejected for ${remainingS}s more. ` +
      `Wait for it to recover or use Admin → Models → Reset quota to force-reset.`
    )
  }
}

// ─── sanitizeDelimiters (T040) ────────────────────────────────────────────────

export function sanitizeDelimiters(content: string): string {
  return content
    .replace(/<<HARMOVEN:USER>>/gi,      '<<HRMVN\\:USER>>')
    .replace(/<<HARMOVEN:ASSISTANT>>/gi, '<<HRMVN\\:ASSISTANT>>')
}

// ─── Environment builder (AC-8) ───────────────────────────────────────────────

const PROXY_ENV_KEYS = [
  'HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy',
  'NO_PROXY',   'no_proxy',    'SSL_CERT_FILE', 'NODE_EXTRA_CA_CERTS',
] as const

export function buildEnv(
  token:      string,
  scratchDir: string,
  parentEnv:  Record<string, string | undefined>,
): NodeJS.ProcessEnv {
  const proxyEnv: Record<string, string> = {}
  for (const key of PROXY_ENV_KEYS) {
    const val = parentEnv[key]
    if (val !== undefined && val !== '') proxyEnv[key] = val
  }
  return {
    PATH:                    parentEnv['PATH'] ?? '',
    CLAUDE_CODE_OAUTH_TOKEN: token,
    HOME:                    scratchDir,
    CLAUDE_CONFIG_DIR:       path.join(scratchDir, 'config'),
    ...proxyEnv,
  } as unknown as NodeJS.ProcessEnv
}

// ─── Args builder (AC-5, AC-15, AC-16) ───────────────────────────────────────

export function buildArgs(
  profile:    LlmProfileConfig,
  messages:   Pick<ChatMessage, 'role' | 'content'>[],
  streamJson: boolean,
): string[] {
  const system    = messages.find(m => m.role === 'system')
  const nonSystem = messages.filter(m => m.role !== 'system')

  let promptArg: string
  if (nonSystem.length <= 1) {
    promptArg = nonSystem[nonSystem.length - 1]?.content ?? ''
  } else {
    promptArg = nonSystem
      .map(m =>
        m.role === 'assistant'
          ? `<<HARMOVEN:ASSISTANT>>\n${sanitizeDelimiters(m.content)}`
          : `<<HARMOVEN:USER>>\n${sanitizeDelimiters(m.content)}`,
      )
      .join('\n')
  }

  const args: string[] = ['-p', promptArg]

  if (system?.content) {
    args.push('--system-prompt', system.content)
  }

  args.push(
    '--no-session-persistence',
    '--tools', '',
    '--permission-mode', 'default',
    '--max-turns', '1',
    '--model', profile.model_string,
    '--strict-mcp-config',
    '--mcp-config', '{"mcpServers":{}}',
  )

  if (streamJson) {
    args.push(
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
    )
  } else {
    args.push('--output-format', 'json')
  }

  return args
}

// ─── Stream JSON parser (AC-11, AC-12) ───────────────────────────────────────

export interface ParsedResult {
  content:        string
  tokensIn:       number
  tokensOut:      number
  totalCostUsd:   number
  serviceTier:    string
  apiErrorStatus: number | null
  rateLimitInfo:  RateLimitInfo | null
}

export interface RateLimitInfo {
  type:     string
  resetsAt: string | null
}

export function parsePlainJson(stdout: string): ParsedResult {
  const base: ParsedResult = {
    content:        '',
    tokensIn:       0,
    tokensOut:      0,
    totalCostUsd:   0,
    serviceTier:    'standard',
    apiErrorStatus: null,
    rateLimitInfo:  null,
  }

  let obj: Record<string, unknown> | null = null
  try {
    const parsed = JSON.parse(stdout.trim())
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      obj = parsed as Record<string, unknown>
    }
  } catch {
    return parseStreamJson(stdout)
  }

  if (!obj) return parseStreamJson(stdout)

  if (typeof obj['result'] === 'string')  base.content       = obj['result']
  const usage = obj['usage'] as Record<string, unknown> | undefined
  if (usage) {
    base.tokensIn  = typeof usage['input_tokens']  === 'number' ? usage['input_tokens']  : 0
    base.tokensOut = typeof usage['output_tokens'] === 'number' ? usage['output_tokens'] : 0
    if (typeof usage['service_tier'] === 'string') base.serviceTier = usage['service_tier']
  }
  if (typeof obj['total_cost_usd']   === 'number') base.totalCostUsd   = obj['total_cost_usd']
  if (typeof obj['api_error_status'] === 'number') base.apiErrorStatus = obj['api_error_status']

  return base
}

export function parseStreamJson(
  stdout:   string,
  onChunk?: (text: string) => void,
): ParsedResult {
  const result: ParsedResult = {
    content:        '',
    tokensIn:       0,
    tokensOut:      0,
    totalCostUsd:   0,
    serviceTier:    'standard',
    apiErrorStatus: null,
    rateLimitInfo:  null,
  }

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let obj: Record<string, unknown>
    try {
      obj = JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      continue
    }

    switch (obj['type']) {
      case 'stream_event': {
        const event = obj['event'] as Record<string, unknown> | undefined
        if (event?.['type'] === 'content_block_delta') {
          const delta = event['delta'] as Record<string, unknown> | undefined
          const text  = delta?.['text']
          if (typeof text === 'string' && text && onChunk) {
            onChunk(text)
          }
        }
        break
      }

      case 'result': {
        if (typeof obj['result'] === 'string') {
          result.content = obj['result']
        }
        const usage = obj['usage'] as Record<string, unknown> | undefined
        if (usage) {
          result.tokensIn  = (usage['input_tokens']  as number | undefined)  ?? 0
          result.tokensOut = (usage['output_tokens'] as number | undefined) ?? 0
          if (typeof usage['service_tier'] === 'string') result.serviceTier = usage['service_tier']
        }
        if (typeof obj['total_cost_usd'] === 'number') {
          result.totalCostUsd = obj['total_cost_usd']
        }
        const apiErr = obj['api_error_status']
        if (typeof apiErr === 'number') {
          result.apiErrorStatus = apiErr
        }
        break
      }

      case 'rate_limit_event': {
        const info = obj['rate_limit_info'] as Record<string, unknown> | undefined
        if (info) {
          let resetsAtIso: string | null = null
          const raw = info['resetsAt']
          if (typeof raw === 'string' && raw) {
            resetsAtIso = raw
          } else if (typeof raw === 'number' && raw > 0) {
            const YEAR_2000_MS = 946_684_800_000
            const asMs  = raw
            const asSec = raw * 1_000
            resetsAtIso = new Date(asMs >= YEAR_2000_MS ? asMs : asSec).toISOString()
          }
          result.rateLimitInfo = {
            type:     typeof info['type'] === 'string' ? info['type'] : 'unknown',
            resetsAt: resetsAtIso,
          }
          cliLog('debug', `rate_limit_event: type="${result.rateLimitInfo.type}" resetsAt="${resetsAtIso ?? 'none'}"`)
        }
        break
      }

      default:
        break
    }
  }

  return result
}

// ─── Scratch dir management (AC-7) ────────────────────────────────────────────

export async function createScratchDir(
  spawnId: string,
  config:  CliConfig,
): Promise<string> {
  const dir = path.join(config.scratchBaseDir, spawnId)
  await fs.mkdir(path.join(dir, 'config'), { recursive: true })
  await fs.mkdir(path.join(dir, 'work'),   { recursive: true })
  return dir
}

export async function removeScratchDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
}

// ─── Spawn helpers ────────────────────────────────────────────────────────────

function killProcess(child: ReturnType<typeof spawn>): void {
  child.kill('SIGTERM')
  setTimeout(() => { child.kill('SIGKILL') }, 2_000)
}

function handleSpawnEnoent(context: string): void {
  markPluginDead('[claude-cli] Binary not found — plugin marked dead')
  cliLog('error', `${context} — ENOENT: claude binary missing from PATH. Reinstall with: npm install -g @anthropic-ai/claude-code`)
}

export interface SpawnResult {
  rc:           number
  stdout:       string
  stderr:       string
  terminatedBy?: 'timeout' | 'abort'
}

export function spawnClaude(
  args:       string[],
  env:        NodeJS.ProcessEnv,
  scratchDir: string,
  config:     CliConfig,
  signal?:    AbortSignal,
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd:   path.join(scratchDir, 'work'),
      env,
    })

    let stdout = ''
    let stderr = ''
    let terminatedBy: SpawnResult['terminatedBy']

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const timeoutId = setTimeout(() => {
      terminatedBy = 'timeout'
      killProcess(child)
    }, config.spawnTimeoutMs)

    const abortHandler = (): void => {
      clearTimeout(timeoutId)
      terminatedBy = 'abort'
      killProcess(child)
    }
    signal?.addEventListener('abort', abortHandler)

    child.on('close', code => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abortHandler)
      resolve({ rc: code ?? 1, stdout, stderr, terminatedBy })
    })

    child.on('error', err => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abortHandler)
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        handleSpawnEnoent('spawn[chat]')
      }
      reject(err)
    })
  })
}

// ─── handleResult ─────────────────────────────────────────────────────────────

export function handleResult(
  parsed:      ParsedResult,
  rc:          number,
  profile:     LlmProfileConfig,
  stderr:      string,
  terminatedBy?: SpawnResult['terminatedBy'],
): CliChatResult {
  if (rc !== 0) {
    if (rc === 143 || rc === 137) {
      if (terminatedBy === 'timeout') {
        cliLog('warn', `Spawn timeout for ${profile.id} (rc=${rc})`, profile.id)
      } else {
        cliLog('info', `Request cancelled for ${profile.id} (rc=${rc})`, profile.id)
      }
      const err = new Error(
        terminatedBy === 'timeout'
          ? '[claude-cli] Request timed out (spawn_timeout_ms exceeded)'
          : '[claude-cli] Request cancelled (client disconnected or server shutdown)',
      )
      err.name = 'AbortError'
      throw err
    }

    if (parsed.apiErrorStatus === 401) {
      const err = new AuthError()
      markPluginDead(err.message)
      throw err
    }

    if (parsed.rateLimitInfo) {
      const type             = parsed.rateLimitInfo.type
      const hasExplicitReset = !!parsed.rateLimitInfo.resetsAt
      const resetAt          = hasExplicitReset
        ? new Date(parsed.rateLimitInfo.resetsAt!)
        : new Date(Date.now() + 60_000)

      const resetHorizonMs = hasExplicitReset ? resetAt.getTime() - Date.now() : 0
      const category       = classifyRateLimitType(type, resetHorizonMs, isOpus(profile))

      if (category === 'weekly_opus') {
        if (hasExplicitReset) recordExhaustion(profile, resetAt, 'weekly_opus')
        throw new RateLimitError('[claude-cli] Weekly Opus quota exhausted — resets within 7 days', resetAt)
      } else if (category === 'weekly_non_opus') {
        if (hasExplicitReset) recordExhaustion(profile, resetAt, 'weekly_non_opus')
        throw new RateLimitError('[claude-cli] Weekly non-Opus quota exhausted — resets within 7 days', resetAt)
      } else if (category === 'session') {
        const now    = new Date()
        const diffMs = resetAt.getTime() - now.getTime()
        const hours  = Math.floor(diffMs / 3_600_000)
        const mins   = Math.floor((diffMs % 3_600_000) / 60_000)
        if (hasExplicitReset) recordExhaustion(profile, resetAt, 'session')
        throw new RateLimitError(`[claude-cli] Session quota exhausted — next window in ~${hours}h ${mins}m`, resetAt)
      } else {
        cliLog('warn', `Transient rate limit (type="${type}") — not locking plugin state`, profile.id)
        throw new RateLimitError(`[claude-cli] Temporary rate limit (type: ${type}) — retry shortly`, resetAt)
      }
    }

    if (
      stderr.includes('rate_limit') || stderr.includes('quota') ||
      stderr.includes('exhausted')  || parsed.content.includes('rate_limit')
    ) {
      const resetAt = new Date(Date.now() + 60_000)
      throw new RateLimitError('[claude-cli] Rate limit detected from stderr', resetAt)
    }

    const msg = parsed.content || stderr || `Claude CLI exited with code ${rc}`
    recordCircuitFailure()
    throw new Error(`[claude-cli] ${msg}`)
  }

  recordCircuitSuccess()

  if (parsed.content === '' && parsed.tokensOut === 0) {
    cliLog('warn',
      '[claude-cli] rc=0 but empty content + 0 output tokens — possible CLI schema change. ' +
      'Check `claude --version` and whether the JSON output format has changed.',
      profile.id)
  }

  const isSubscriptionCovered = parsed.serviceTier === 'standard' || parsed.serviceTier === ''
  const effectiveCostUsd      = isSubscriptionCovered ? 0 : parsed.totalCostUsd

  if (parsed.totalCostUsd > 0) {
    cliLog(isSubscriptionCovered ? 'debug' : 'warn',
      `total_cost_usd=${parsed.totalCostUsd} service_tier=${parsed.serviceTier} ` +
      (isSubscriptionCovered ? '(subscription — not billed)' : '(BILLED — overage tier)'),
      profile.id)
  }

  if (!isSubscriptionCovered && parsed.totalCostUsd > 0) {
    _state.weeklyOverageUsd += parsed.totalCostUsd
    const threshold = _g.config?.overageAlertThresholdUsd ?? 1.0
    if (_state.weeklyOverageUsd >= threshold) {
      cliLog('warn',
        `[OVERAGE ALERT] Weekly overage has reached $${_state.weeklyOverageUsd.toFixed(4)} ` +
        `(threshold: $${threshold}). Calls are being billed to your Anthropic account.`, profile.id)
      persistSnapshotToDb().catch(() => { /* best-effort */ })
    }
  }

  return {
    content:     parsed.content,
    tokensIn:    parsed.tokensIn,
    tokensOut:   parsed.tokensOut,
    costUsd:     effectiveCostUsd,
    model:       profile.id,
    billingMode: 'subscription',
  }
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  if (err.name === 'AbortError')     return false
  if (err instanceof AuthError)      return false
  if (err instanceof RateLimitError) return false
  return true
}

const RETRY_DELAYS_MS = [2_000, 5_000]

// ─── chatCli ──────────────────────────────────────────────────────────────────

export async function chatCli(
  profile:  LlmProfileConfig,
  messages: ChatMessage[],
  options:  ChatOptions,
): Promise<CliChatResult> {
  const config = requireConfig()
  if (!_g.semaphore) _g.semaphore = new Semaphore(config.maxConcurrent)

  const token = (process.env as Record<string, string | undefined>)[config.oauthTokenEnv] ?? ''

  for (let attempt = 0; ; attempt++) {
    checkCircuitBreaker()
    const semToken = await _g.semaphore.acquire()
    let scratchDir: string | null = null
    try {
      await _stateMutex.acquire()
      checkRateLimitGuard(profile)

      const spawnId  = randomUUID()
      const corrTag  = options.correlationId ? ` correlationId=${options.correlationId}` : ''
      cliLog('info', `spawn[chat] start spawnId=${spawnId} model=${profile.model_string}${attempt > 0 ? ` (retry ${attempt})` : ''}${corrTag}`, profile.id)
      scratchDir     = await createScratchDir(spawnId, config)
      const env      = buildEnv(token, scratchDir, process.env as Record<string, string | undefined>)
      const args     = buildArgs(profile, messages, false)

      const { rc, stdout, stderr, terminatedBy } = await spawnClaude(
        args, env, scratchDir, config, options.signal as AbortSignal | undefined,
      )
      cliLog('info', `spawn[chat] done spawnId=${spawnId} rc=${rc}`, profile.id)
      const parsed = parsePlainJson(stdout)
      const result = handleResult(parsed, rc, profile, stderr, terminatedBy)
      updateCounters(profile, result.tokensIn, result.tokensOut)
      _stateMutex.release()
      return result
    } catch (err) {
      _stateMutex.release()
      if (attempt < RETRY_DELAYS_MS.length && isTransientError(err)) {
        const delay = RETRY_DELAYS_MS[attempt]!
        cliLog('warn', `spawn[chat] transient error (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}), retrying in ${delay}ms: ${(err as Error).message}`, profile.id)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw err
    } finally {
      await _g.semaphore.release(semToken)
      if (scratchDir) await removeScratchDir(scratchDir).catch(e =>
        cliLog('warn', `Failed to remove scratch dir: ${(e as Error).message}`)
      )
    }
  }
}

// ─── streamCli ────────────────────────────────────────────────────────────────

export async function streamCli(
  profile:  LlmProfileConfig,
  messages: ChatMessage[],
  options:  ChatOptions,
  onChunk:  (chunk: string) => void,
): Promise<CliChatResult> {
  const config = requireConfig()
  if (!_g.semaphore) _g.semaphore = new Semaphore(config.maxConcurrent)

  const token = (process.env as Record<string, string | undefined>)[config.oauthTokenEnv] ?? ''

  for (let attempt = 0; ; attempt++) {
    checkCircuitBreaker()
    const semToken = await _g.semaphore.acquire()
    let scratchDir: string | null = null
    try {
      await _stateMutex.acquire()
      checkRateLimitGuard(profile)

      const spawnId  = randomUUID()
      const corrTag  = options.correlationId ? ` correlationId=${options.correlationId}` : ''
      cliLog('info', `spawn[stream] start spawnId=${spawnId} model=${profile.model_string}${attempt > 0 ? ` (retry ${attempt})` : ''}${corrTag}`, profile.id)
      scratchDir     = await createScratchDir(spawnId, config)
      const env      = buildEnv(token, scratchDir, process.env as Record<string, string | undefined>)
      const args     = buildArgs(profile, messages, true)

      const { rc, stdout, stderr, terminatedBy } = await spawnClaudeStreaming(
        args, env, scratchDir, config, onChunk, options.signal as AbortSignal | undefined,
      )
      cliLog('info', `spawn[stream] done spawnId=${spawnId} rc=${rc}`, profile.id)
      const parsed = parseStreamJson(stdout)
      const result = handleResult(parsed, rc, profile, stderr, terminatedBy)
      updateCounters(profile, result.tokensIn, result.tokensOut)
      _stateMutex.release()
      return result
    } catch (err) {
      _stateMutex.release()
      if (attempt < RETRY_DELAYS_MS.length && isTransientError(err)) {
        const delay = RETRY_DELAYS_MS[attempt]!
        cliLog('warn', `spawn[stream] transient error, retrying in ${delay}ms: ${(err as Error).message}`, profile.id)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw err
    } finally {
      await _g.semaphore.release(semToken)
      if (scratchDir) await removeScratchDir(scratchDir).catch(e =>
        cliLog('warn', `Failed to remove scratch dir: ${(e as Error).message}`)
      )
    }
  }
}

// ─── spawnClaudeStreaming ─────────────────────────────────────────────────────

function spawnClaudeStreaming(
  args:       string[],
  env:        NodeJS.ProcessEnv,
  scratchDir: string,
  config:     CliConfig,
  onChunk:    (text: string) => void,
  signal?:    AbortSignal,
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd:   path.join(scratchDir, 'work'),
      env,
    })

    cliLog('info', `spawn[stream] pid=${child.pid ?? '?'}`, undefined)

    let stdout = ''
    let stderr = ''
    let lineBuffer = ''
    let totalChunks = 0
    let terminatedBy: SpawnResult['terminatedBy']

    const STREAM_INACTIVITY_MS = config.streamInactivityMs
    const STREAM_HARD_CAP_MS   = config.streamHardCapMs

    let activeTimeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      terminatedBy = 'timeout'
      killProcess(child)
    }, config.spawnTimeoutMs)

    const hardCapId = setTimeout(() => {
      terminatedBy = 'timeout'
      killProcess(child)
    }, STREAM_HARD_CAP_MS)

    const resetInactivityTimer = (): void => {
      clearTimeout(activeTimeoutId)
      activeTimeoutId = setTimeout(() => {
        terminatedBy = 'timeout'
        killProcess(child)
      }, STREAM_INACTIVITY_MS)
    }

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stdout += text
      lineBuffer += text

      const lines = lineBuffer.split('\n')
      lineBuffer  = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        let obj: Record<string, unknown>
        try {
          obj = JSON.parse(trimmed) as Record<string, unknown>
        } catch {
          continue
        }
        resetInactivityTimer()

        if (obj['type'] === 'stream_event') {
          const event = obj['event'] as Record<string, unknown> | undefined
          if (event?.['type'] === 'content_block_delta') {
            const delta = event['delta'] as Record<string, unknown> | undefined
            const t     = delta?.['text']
            if (typeof t === 'string' && t) {
              totalChunks++
              onChunk(t)
            }
          }
        }
      }
    })

    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const abortHandler = (): void => {
      clearTimeout(activeTimeoutId)
      clearTimeout(hardCapId)
      terminatedBy = 'abort'
      killProcess(child)
    }
    signal?.addEventListener('abort', abortHandler)

    child.on('close', code => {
      clearTimeout(activeTimeoutId)
      clearTimeout(hardCapId)
      signal?.removeEventListener('abort', abortHandler)
      cliLog('info', `spawn[stream] closed chunks=${totalChunks}`, undefined)
      resolve({ rc: code ?? 1, stdout, stderr, terminatedBy })
    })

    child.on('error', err => {
      clearTimeout(activeTimeoutId)
      clearTimeout(hardCapId)
      signal?.removeEventListener('abort', abortHandler)
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        handleSpawnEnoent('spawn[stream]')
      }
      reject(err)
    })
  })
}
