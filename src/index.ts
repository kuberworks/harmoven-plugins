// src/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Claude CLI subscription provider — system plugin entry point.
//
// Configuration is via environment variables (no orchestrator.yaml dependency):
//
//   CLAUDE_CODE_OAUTH_TOKEN       — OAuth token from `claude setup-token` (required)
//   CLAUDE_CLI_TOS_ACKNOWLEDGED   — set to "true" to confirm ToS compliance (required)
//   CLAUDE_CLI_MIN_VERSION        — minimum CLI version (default: 2.1.0)
//   CLAUDE_CLI_SCRATCH_DIR        — scratch base dir (default: /tmp/harmoven-claude)
//   CLAUDE_CLI_MAX_CONCURRENT     — max concurrent spawns (default: 4)
//   CLAUDE_CLI_ENABLE_OPUS        — enable Opus profile (default: false)
//   CLAUDE_CLI_SPAWN_TIMEOUT_MS   — spawn timeout ms (default: 300000)
//   CLAUDE_CLI_STREAM_INACTIVITY_MS — stream inactivity timeout (default: 60000)
//   CLAUDE_CLI_STREAM_HARD_CAP_MS   — stream hard cap ms (default: 1800000)
//   CLAUDE_CLI_OVERAGE_ALERT_USD    — overage alert threshold (default: 1.0)
//   CLAUDE_CLI_CIRCUIT_OPEN_MS      — circuit open duration ms (default: 300000)
//   CLAUDE_CLI_CIRCUIT_THRESHOLD    — circuit failure threshold (default: 5)
//   CLAUDE_CLI_TOKEN_VALIDATION_HOURS — periodic revalidation interval (default: 6)
//   CLAUDE_CLI_DISTRIBUTED_MODE     — use distributed semaphore (default: false)
//   CLAUDE_CLI_OAUTH_TOKEN_ENV      — override env var name for token (default: CLAUDE_CODE_OAUTH_TOKEN)
// ─────────────────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process'
import { randomUUID }   from 'node:crypto'
import semver           from 'semver'

import type { LlmProfileConfig } from './types.js'
import {
  chatCli, streamCli,
  buildEnv, createScratchDir, removeScratchDir, spawnClaude,
  parseStreamJson, buildArgs,
  markPluginActive, markPluginDead, markPluginNotConfigured,
  setConfig, setActiveSemaphore, AuthError, RateLimitError,
  getCliState, loadSnapshotFromDb,
  initWithDb,
} from './cli-client.js'
import type { CliConfig } from './cli-client.js'

// ─── Public re-exports ────────────────────────────────────────────────────────

export type {
  CliConfig, CliChatResult, ParsedResult, RateLimitInfo,
  SpawnResult, CliDebugEntry, CircuitBreakerState, RateLimitCategory,
} from './cli-client.js'
export {
  AuthError, RateLimitError, getCliState,
  buildEnv, buildArgs, parseStreamJson,
  createScratchDir, removeScratchDir, spawnClaude,
  initWithDb, setActiveSemaphore,
} from './cli-client.js'

// ─── Context injected at bootstrap ───────────────────────────────────────────

export interface RegisterContext {
  registerLlmPlugin: (plugin: {
    providerId: string
    profiles:   LlmProfileConfig[]
    chat:       (profile: LlmProfileConfig, messages: unknown[], options: Record<string, unknown>) => Promise<unknown>
    stream:     (profile: LlmProfileConfig, messages: unknown[], options: Record<string, unknown>, onChunk: (chunk: string) => void) => Promise<unknown>
  }) => void
  dispatchNotification?: (event: {
    type:      string
    title:     string
    body:      string
    runId?:    string
    projectId?: string
  }) => Promise<void>
}

// ─── Config loader (env-based) ────────────────────────────────────────────────

export function loadCliConfig(): CliConfig {
  return {
    oauthTokenEnv:                process.env['CLAUDE_CLI_OAUTH_TOKEN_ENV']         ?? 'CLAUDE_CODE_OAUTH_TOKEN',
    minCliVersion:                process.env['CLAUDE_CLI_MIN_VERSION']             ?? '2.1.0',
    scratchBaseDir:               process.env['CLAUDE_CLI_SCRATCH_DIR']             ?? '/tmp/harmoven-claude',
    maxConcurrent:                Number(process.env['CLAUDE_CLI_MAX_CONCURRENT']   ?? '4'),
    enableOpus:                   process.env['CLAUDE_CLI_ENABLE_OPUS']             === 'true',
    spawnTimeoutMs:               Number(process.env['CLAUDE_CLI_SPAWN_TIMEOUT_MS']   ?? '300000'),
    streamInactivityMs:           Number(process.env['CLAUDE_CLI_STREAM_INACTIVITY_MS'] ?? '60000'),
    streamHardCapMs:              Number(process.env['CLAUDE_CLI_STREAM_HARD_CAP_MS']   ?? '1800000'),
    overageAlertThresholdUsd:     Number(process.env['CLAUDE_CLI_OVERAGE_ALERT_USD']    ?? '1.0'),
    circuitOpenDurationMs:        Number(process.env['CLAUDE_CLI_CIRCUIT_OPEN_MS']      ?? '300000'),
    circuitFailureThreshold:      Number(process.env['CLAUDE_CLI_CIRCUIT_THRESHOLD']    ?? '5'),
    tokenValidationIntervalHours: Number(process.env['CLAUDE_CLI_TOKEN_VALIDATION_HOURS'] ?? '6'),
  }
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

const BASE_PROFILES: LlmProfileConfig[] = [
  {
    id:                        'claude-cli-sonnet',
    provider:                  'claude-cli',
    model_string:              'sonnet',
    tier:                      'balanced',
    context_window:            200_000,
    cost_per_1m_input_tokens:  0,
    cost_per_1m_output_tokens: 0,
    jurisdiction:              'us',
    trust_tier:                1,
    task_type_affinity:        ['document_analysis', 'report_writing', 'coding'],
  },
  {
    id:                        'claude-cli-haiku',
    provider:                  'claude-cli',
    model_string:              'haiku',
    tier:                      'fast',
    context_window:            200_000,
    cost_per_1m_input_tokens:  0,
    cost_per_1m_output_tokens: 0,
    jurisdiction:              'us',
    trust_tier:                1,
    task_type_affinity:        ['intent_classification', 'simple_coding_tasks'],
  },
]

const OPUS_PROFILE: LlmProfileConfig = {
  id:                        'claude-cli-opus',
  provider:                  'claude-cli',
  model_string:              'opus',
  tier:                      'powerful',
  context_window:            200_000,
  cost_per_1m_input_tokens:  0,
  cost_per_1m_output_tokens: 0,
  jurisdiction:              'us',
  trust_tier:                1,
  task_type_affinity:        ['complex_reasoning', 'document_analysis'],
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface ValidationResult {
  ok:      boolean
  reason?: string
}

const OAUTH_TOKEN_RE = /^sk-ant-oat\d{2}-[A-Za-z0-9\-_]{60,}$/

function findBinary(name: string): string | null {
  try {
    const result = execFileSync(
      process.platform === 'win32' ? 'where' : 'which',
      [name],
      { encoding: 'utf8', timeout: 5_000 },
    ).trim()
    return result.split('\n')[0]?.trim() || null
  } catch {
    return null
  }
}

export async function validate(config: CliConfig): Promise<ValidationResult> {
  const claudePath = findBinary('claude')
  if (!claudePath) {
    return {
      ok:     false,
      reason: '[claude-cli] `claude` binary not found on PATH. Install with: npm install -g @anthropic-ai/claude-code',
    }
  }

  let version: string | undefined
  try {
    const out = execFileSync(claudePath, ['--version'], { encoding: 'utf8', timeout: 10_000 }).trim()
    const match = out.match(/(\d+\.\d+\.\d+)/)
    version = match?.[1]
  } catch {
    return { ok: false, reason: `[claude-cli] Failed to run \`claude --version\`.` }
  }

  if (!version) {
    return { ok: false, reason: `[claude-cli] Could not parse version from \`claude --version\` output.` }
  }

  if (!semver.satisfies(version, `>=${config.minCliVersion}`)) {
    return {
      ok:     false,
      reason: `[claude-cli] Version ${version} is below minimum required ${config.minCliVersion}. Update with: npm install -g @anthropic-ai/claude-code`,
    }
  }

  const token = process.env[config.oauthTokenEnv] ?? ''
  if (!token) {
    return { ok: false, reason: `[claude-cli] ${config.oauthTokenEnv} is not set. Run: claude setup-token` }
  }
  if (!OAUTH_TOKEN_RE.test(token)) {
    return {
      ok:     false,
      reason: `[claude-cli] ${config.oauthTokenEnv} does not match expected format (sk-ant-oatNN-...). Regenerate with: claude setup-token`,
    }
  }

  return { ok: true }
}

export async function pingAuth(config: CliConfig): Promise<void> {
  const token = process.env[config.oauthTokenEnv] ?? ''
  let scratchDir: string | null = null
  try {
    scratchDir     = await createScratchDir(`ping-${randomUUID()}`, config)
    const env      = buildEnv(token, scratchDir, process.env as Record<string, string | undefined>)
    const pingArgs = buildArgs(
      { id: 'ping', provider: 'claude-cli', model_string: 'haiku',
        tier: 'fast', context_window: 200_000,
        cost_per_1m_input_tokens: 0, cost_per_1m_output_tokens: 0,
        jurisdiction: 'us', trust_tier: 1, task_type_affinity: [] },
      [{ role: 'user', content: 'ping' }],
      false,
    )
    const { rc, stdout } = await spawnClaude(pingArgs, env, scratchDir, config)
    if (rc !== 0) {
      try {
        const parsed = parseStreamJson(stdout)
        if (parsed.apiErrorStatus === 401) {
          const reason = '[claude-cli] Auth ping: token expired or invalid (401). Regenerate with: claude setup-token'
          console.error(reason)
          markPluginDead(reason)
          return
        }
      } catch { /* ignore */ }
      console.warn(`[claude-cli] Auth ping failed (rc=${rc}) — plugin remains active.`)
    } else {
      console.info('[claude-cli] Auth ping OK.')
    }
  } catch (err) {
    console.warn(`[claude-cli] Auth ping threw: ${err instanceof Error ? err.message : String(err)} — plugin remains active.`)
  } finally {
    if (scratchDir) await removeScratchDir(scratchDir).catch(() => {})
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(ctx: RegisterContext): Promise<void> {
  const config = loadCliConfig()
  setConfig(config)

  // Store dispatchNotification on globalThis for use in the periodic revalidation interval
  if (ctx.dispatchNotification) {
    const dispatchFn = ctx.dispatchNotification
    ;(globalThis as Record<string, unknown>)['__claudeCliDispatch'] = dispatchFn
  }

  // T108: ToS opt-in gate
  if (process.env['CLAUDE_CLI_TOS_ACKNOWLEDGED'] !== 'true') {
    const reason =
      '[claude-cli] Disabled — set CLAUDE_CLI_TOS_ACKNOWLEDGED=true to confirm ' +
      'that your use of the Claude Max/Team subscription for automated agent runs ' +
      'complies with Anthropic Terms of Service.'
    console.warn(reason)
    markPluginNotConfigured()
    ctx.registerLlmPlugin({
      providerId: 'claude-cli',
      profiles:   [],
      chat:       chatCli as RegisterContext['registerLlmPlugin'] extends (p: { chat: infer C }) => void ? C : never,
      stream:     streamCli as RegisterContext['registerLlmPlugin'] extends (p: { stream: infer S }) => void ? S : never,
    })
    return
  }

  // Restore persisted rate-limit state from DB (T041)
  await loadSnapshotFromDb()

  const token = process.env[config.oauthTokenEnv] ?? ''
  if (!token) {
    console.info(`[claude-cli] ${config.oauthTokenEnv} not set — plugin registered with 0 profiles.`)
    markPluginNotConfigured()
    ctx.registerLlmPlugin({ providerId: 'claude-cli', profiles: [], chat: chatCli as never, stream: streamCli as never })
    return
  }

  const validation = await validate(config)
  if (!validation.ok) {
    console.warn(`[claude-cli] Validation failed — plugin disabled: ${validation.reason}`)
    markPluginDead(validation.reason ?? 'validation failed')
    ctx.registerLlmPlugin({ providerId: 'claude-cli', profiles: [], chat: chatCli as never, stream: streamCli as never })
    return
  }

  const profiles: LlmProfileConfig[] = [
    ...BASE_PROFILES,
    ...(config.enableOpus ? [OPUS_PROFILE] : []),
  ]

  markPluginActive()
  ctx.registerLlmPlugin({ providerId: 'claude-cli', profiles, chat: chatCli as never, stream: streamCli as never })

  console.info(`[claude-cli] Plugin active — ${profiles.length} profile(s): ${profiles.map(p => p.id).join(', ')}`)

  // T100: Distributed semaphore (optional)
  void (async () => {
    try {
      const { createDistributedSemaphoreIfEnabled } = await import('./distributed-semaphore.js')
      const distSem = await createDistributedSemaphoreIfEnabled(config.maxConcurrent)
      if (distSem) {
        setActiveSemaphore(distSem)
        console.info('[claude-cli] Distributed semaphore active.')
      }
    } catch (err) {
      console.warn('[claude-cli] Failed to initialize distributed semaphore (in-memory fallback):', err instanceof Error ? err.message : err)
    }
  })()

  // Async token ping
  void pingAuth(config)

  // T115: Periodic token re-validation
  const intervalHours = config.tokenValidationIntervalHours
  if (intervalHours > 0) {
    const intervalMs = intervalHours * 3_600_000
    const revalidate = async () => {
      try {
        const cfg    = loadCliConfig()
        const result = await validate(cfg)
        if (!result.ok) {
          console.error(`[claude-cli] Periodic token re-validation FAILED: ${result.reason}`)
          markPluginDead(result.reason ?? 'periodic validation failed')
          try {
            const dispatch = (globalThis as Record<string, unknown>)['__claudeCliDispatch'] as
              ((e: { type: string; title: string; body: string }) => Promise<void>) | undefined
            await dispatch?.({
              type:  'claude_cli.token_expired',
              title: 'Claude CLI: token validation failed',
              body:  result.reason ?? 'Periodic token re-validation failed. Regenerate with: claude setup-token',
            })
          } catch { /* notification system may not be configured */ }
        } else {
          console.info('[claude-cli] Periodic token re-validation OK.')
        }
      } catch (err) {
        console.warn(`[claude-cli] Periodic re-validation threw: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    const intervalKey = '__claudeCliRevalidateInterval'
    if ((globalThis as Record<string, unknown>)[intervalKey]) {
      clearInterval((globalThis as Record<string, unknown>)[intervalKey] as ReturnType<typeof setInterval>)
    }
    ;(globalThis as Record<string, unknown>)[intervalKey] = setInterval(revalidate, intervalMs)
    console.info(`[claude-cli] Periodic re-validation scheduled every ${intervalHours}h.`)
  }
}
