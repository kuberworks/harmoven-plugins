// src/distributed-semaphore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Distributed semaphore for multi-instance Harmoven deployments (T043).
//
// Uses SELECT ... FOR UPDATE SKIP LOCKED on ClaudeCliSemaphoreSlot rows.
// Safe with PgBouncer in transaction mode.
//
// Enable via env var: CLAUDE_CLI_DISTRIBUTED_MODE=true
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto'
import type { ISemaphore } from './cli-client.js'

export type { ISemaphore }

async function getDb(): Promise<Record<string, unknown>> {
  const db = (globalThis as { __claudeCli?: { db?: unknown } }).__claudeCli?.db
  if (!db) throw new Error('[claude-cli] DB not initialized — call bootstrap() first')
  return db as Record<string, unknown>
}

export class DistributedSemaphore implements ISemaphore {
  private readonly instanceId: string
  private readonly maxConcurrent: number
  private readonly staleTimeoutMs = 600_000
  private readonly staleCleanupInterval: ReturnType<typeof setInterval>

  constructor(instanceId: string, maxConcurrent: number) {
    this.instanceId    = instanceId
    this.maxConcurrent = maxConcurrent
    this.staleCleanupInterval = setInterval(() => {
      void this._cleanStaleSlots()
    }, 60_000)
    this.staleCleanupInterval.unref?.()
  }

  destroy(): void {
    clearInterval(this.staleCleanupInterval)
  }

  async seed(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (await getDb()) as any
    await db.$executeRaw`
      INSERT INTO "plugin_claude_cli_semaphore_slot" (id)
      SELECT generate_series(1, ${this.maxConcurrent})
      ON CONFLICT (id) DO NOTHING
    `
    await db.$executeRaw`
      DELETE FROM "plugin_claude_cli_semaphore_slot"
      WHERE id > ${this.maxConcurrent}
    `
  }

  async acquire(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (await getDb()) as any

    for (let attempt = 0; ; attempt++) {
      const slotId = await this._tryAcquireOneSlot(db)
      if (slotId !== null) return slotId

      const backoffMs = Math.min(100 * Math.pow(2, attempt), 2_000)
      const jitterMs  = Math.floor(Math.random() * 50)
      await new Promise(r => setTimeout(r, backoffMs + jitterMs))
    }
  }

  private async _cleanStaleSlots(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db             = (await getDb()) as any
      const staleThreshold = new Date(Date.now() - this.staleTimeoutMs)
      await db.$executeRaw`
        UPDATE "plugin_claude_cli_semaphore_slot"
        SET held_by = NULL, held_at = NULL
        WHERE held_by IS NOT NULL AND held_at < ${staleThreshold}
      `
    } catch {
      // Non-critical
    }
  }

  async release(slotId: unknown): Promise<void> {
    if (typeof slotId !== 'number') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (await getDb()) as any
    await db.$executeRaw`
      UPDATE "plugin_claude_cli_semaphore_slot"
      SET held_by = NULL, held_at = NULL
      WHERE id = ${slotId} AND held_by = ${this.instanceId}
    `
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _tryAcquireOneSlot(db: any): Promise<number | null> {
    return db.$transaction(async (tx: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await (tx as any).$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "plugin_claude_cli_semaphore_slot"
        WHERE held_by IS NULL
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `
      if (!rows.length) return null

      const slotId = rows[0]!.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any).$executeRaw`
        UPDATE "plugin_claude_cli_semaphore_slot"
        SET held_by = ${this.instanceId}, held_at = ${new Date()}
        WHERE id = ${slotId}
      `
      return slotId
    })
  }
}

/**
 * Returns a DistributedSemaphore when CLAUDE_CLI_DISTRIBUTED_MODE=true,
 * null otherwise (falls back to in-memory Semaphore in cli-client.ts).
 */
export async function createDistributedSemaphoreIfEnabled(
  maxConcurrent: number,
): Promise<DistributedSemaphore | null> {
  if (process.env['CLAUDE_CLI_DISTRIBUTED_MODE'] !== 'true') return null

  try {
    const instanceId = randomUUID()
    const sem        = new DistributedSemaphore(instanceId, maxConcurrent)
    await sem.seed()
    return sem
  } catch {
    return null
  }
}
