/**
 * Sliding-window limiter for the auth routes (login attempts, outgoing
 * emails). In memory, so it holds within one server instance only — enough to
 * stop a script hammering one address, not a distributed attack.
 */
const hits = new Map<string, number[]>()

/** Records one hit on `key`, or throws 429 when `max` hits already fall within `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs)

  if (recent.length >= max) {
    const wait = Math.ceil((windowMs - (now - recent[0]!)) / 1000)
    const text = wait > 90 ? `${Math.ceil(wait / 60)} menit` : `${wait} detik`
    throw createError({ statusCode: 429, statusMessage: `Terlalu banyak percobaan. Coba lagi dalam ${text}.` })
  }

  recent.push(now)
  hits.set(key, recent)

  if (hits.size > 10_000) {
    for (const [k, times] of hits) {
      if (times.every(t => now - t >= windowMs)) hits.delete(k)
    }
  }
}

/** Forgets `key`'s hits, e.g. after a successful login or a failed send. */
export function resetRateLimit(key: string): void {
  hits.delete(key)
}
