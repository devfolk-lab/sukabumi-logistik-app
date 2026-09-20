import { OUTBOX_STORE, idbDelete, idbGetAll, idbPut, type OutboxEntry } from '~/utils/offline-db'

export interface EnqueueInput {
  method: 'POST' | 'PATCH' | 'DELETE'
  url: string
  body?: Record<string, unknown>
  invalidates: ApiKey[]
  /** Indonesian noun phrase for the failure toast, e.g. "alamat". */
  label: string
}

/** Give up rather than replay a write forever. */
const MAX_ATTEMPTS = 5

// Module scope: one queue per tab, shared by every component that shows it.
const pending = ref<OutboxEntry[]>([])
let draining = false

export function useOutbox() {
  const toast = useToast()

  async function loadPending(): Promise<void> {
    const rows = await idbGetAll<OutboxEntry>(OUTBOX_STORE)
    pending.value = rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
  }

  async function enqueue(input: EnqueueInput): Promise<void> {
    const userId = useSupabaseUser().value?.id
    if (!userId) return

    await idbPut<OutboxEntry>(OUTBOX_STORE, {
      method: input.method,
      url: input.url,
      body: input.body,
      invalidates: input.invalidates,
      label: input.label,
      userId,
      createdAt: Date.now(),
      attempts: 0
    })

    await loadPending()
  }

  /**
   * A row created offline carried a `tmp-` id that only this device knew. Now
   * that the server has assigned a real one, every later queued write still
   * pointing at the temporary id is repointed — otherwise editing an address
   * you had just created offline would replay against an id the server has
   * never seen.
   */
  async function rewriteTmpId(tmpId: string, realId: string): Promise<void> {
    const rows = await idbGetAll<OutboxEntry>(OUTBOX_STORE)
    for (const row of rows) {
      if (!row.url.includes(tmpId)) continue
      await idbPut<OutboxEntry>(OUTBOX_STORE, { ...row, url: row.url.replace(tmpId, realId) })
    }
  }

  /**
   * Replays queued writes oldest-first, stopping at the first one that cannot
   * go through yet. Order matters: a PATCH against an address created offline
   * is meaningless until its POST has a real id.
   */
  async function drain(): Promise<void> {
    if (draining || !navigator.onLine) return
    draining = true

    try {
      await loadPending()
      const touched = new Set<ApiKey>()

      for (const entry of [...pending.value]) {
        try {
          const result = await $fetch(entry.url, {
            method: entry.method,
            body: entry.body
          })

          const realId = (result as { id?: string } | null)?.id
          if (entry.method === 'POST' && realId && entry.body?.tmpId) {
            await rewriteTmpId(String(entry.body.tmpId), realId)
          }

          for (const key of entry.invalidates) touched.add(key as ApiKey)
          if (entry.id !== undefined) await idbDelete(OUTBOX_STORE, entry.id)
        } catch (error) {
          const status = (error as { statusCode?: number, status?: number })?.statusCode
            ?? (error as { status?: number })?.status

          // The server rejected it on its merits. Replaying will not change the
          // answer, so drop it and say why.
          if (typeof status === 'number' && status >= 400 && status < 500) {
            if (entry.id !== undefined) await idbDelete(OUTBOX_STORE, entry.id)
            toast.add({
              title: `Gagal menyinkronkan ${entry.label}`,
              description: apiMessage(error, 'Perubahan offline dibatalkan.'),
              color: 'error'
            })
            continue
          }

          // Offline again, or the server is down. Keep it for the next drain
          // unless it has had too many goes.
          const attempts = entry.attempts + 1
          if (attempts >= MAX_ATTEMPTS) {
            if (entry.id !== undefined) await idbDelete(OUTBOX_STORE, entry.id)
            toast.add({
              title: `Gagal menyinkronkan ${entry.label}`,
              description: 'Perubahan offline dibatalkan setelah beberapa percobaan.',
              color: 'error'
            })
            continue
          }

          await idbPut<OutboxEntry>(OUTBOX_STORE, { ...entry, attempts })
          break
        }
      }

      await loadPending()

      // Server truth replaces the optimistic copy, including assigned ids.
      if (touched.size > 0) await invalidateApiData([...touched])
    } finally {
      draining = false
    }
  }

  return { pending, enqueue, drain, loadPending }
}
