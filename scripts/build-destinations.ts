import 'dotenv/config'
import { gzipSync } from 'node:zlib'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * Crawls RajaOngkir V2's province → city → district → sub-district tree into
 * `server/assets/destinations.tsv.gz`, which `/api/destinations` searches
 * locally. The hosted search endpoint only matches whole words ("cibad" finds
 * nothing, "cibadak" does), so per-keystroke suggestions need a local index.
 *
 * Run with `pnpm build:destinations`. Around 7,500 requests, and the API bans
 * bursts for minutes at a time, so requests are paced and progress is
 * checkpointed in `scripts/.cache/` — re-run to resume after an interruption.
 */

const BASE_URL = process.env.NUXT_RAJAONGKIR_BASE_URL ?? 'https://rajaongkir.komerce.id/api/v1'
const KEY = process.env.NUXT_RAJAONGKIR_SHIPPING_COST_API_KEY
const OUT = resolve('server/assets/destinations.tsv.gz')
const CACHE_DIR = resolve('scripts/.cache')
const TREE = resolve(CACHE_DIR, 'destinations-tree.json')
const PROGRESS = resolve(CACHE_DIR, 'destinations-progress.tsv')
const PACE_MS = Number(process.env.RAJAONGKIR_CRAWL_PACE_MS ?? 1100)

if (!KEY) {
  console.error('NUXT_RAJAONGKIR_SHIPPING_COST_API_KEY is not set')
  process.exit(1)
}

interface Envelope<T> { meta: { code: number, status: string, message: string }, data: T }
interface Named { id: number, name: string }
interface SubDistrict extends Named { zip_code: string }
interface District extends Named { city: string, province: string }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

let lastRequest = 0

async function get<T>(path: string, attempt = 0): Promise<T> {
  const wait = lastRequest + PACE_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequest = Date.now()

  const res = await fetch(`${BASE_URL}${path}`, { headers: { key: KEY! } })
  const body = await res.json().catch(() => null) as Envelope<T> | null

  if (body?.meta?.status === 'success') return body.data
  // A 404 envelope means an empty branch (some districts have no rows).
  if (body?.meta?.code === 404) return [] as T

  if (res.status === 429) {
    const seconds = Number(/(\d+) seconds/.exec(body?.meta?.message ?? '')?.[1] ?? 60)
    console.log(`rate limited, sleeping ${seconds + 5}s`)
    await sleep((seconds + 5) * 1000)
    return get(path, attempt)
  }

  if (attempt < 4) {
    await sleep(1000 * 2 ** attempt)
    return get(path, attempt + 1)
  }
  throw new Error(`${path}: ${res.status} ${body?.meta?.message ?? ''}`)
}

mkdirSync(CACHE_DIR, { recursive: true })

// Pass 1: the district tree, cached so a resume skips ~550 requests.
let districts: District[]
if (existsSync(TREE)) {
  districts = JSON.parse(readFileSync(TREE, 'utf8'))
  console.log(`${districts.length} districts from cache`)
} else {
  districts = []
  const provinces = await get<Named[]>('/destination/province')
  console.log(`${provinces.length} provinces`)
  for (const province of provinces) {
    const cities = await get<Named[]>(`/destination/city/${province.id}`)
    for (const city of cities) {
      const rows = await get<Named[]>(`/destination/district/${city.id}`)
      districts.push(...rows.map(d => ({ ...d, city: city.name, province: province.name })))
    }
    console.log(`${province.name}: ${cities.length} cities, ${districts.length} districts so far`)
  }
  writeFileSync(TREE, JSON.stringify(districts))
}

// Pass 2: sub-districts, appended to the progress file one district at a time.
const done = new Set<number>()
const rows: string[] = []
if (existsSync(PROGRESS)) {
  for (const line of readFileSync(PROGRESS, 'utf8').split('\n')) {
    if (!line) continue
    if (line.startsWith('done\t')) done.add(Number(line.slice(5)))
    else rows.push(line)
  }
  console.log(`resuming: ${done.size} districts, ${rows.length} rows already fetched`)
}

let count = 0
for (const district of districts) {
  if (done.has(district.id)) continue
  const subs = await get<SubDistrict[]>(`/destination/sub-district/${district.id}`)
  const lines = subs.map(sub =>
    // Same shape as the hosted search's `label`, so both paths map identically.
    [sub.id, sub.name, district.name, district.city, district.province, sub.zip_code].join('\t')
  )
  rows.push(...lines)
  appendFileSync(PROGRESS, lines.map(l => `${l}\n`).join('') + `done\t${district.id}\n`)
  done.add(district.id)
  if (++count % 100 === 0) console.log(`${done.size}/${districts.length} districts, ${rows.length} rows`)
}

rows.sort((a, b) => Number(a.split('\t')[0]) - Number(b.split('\t')[0]))
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, gzipSync(rows.join('\n'), { level: 9 }))
console.log(`wrote ${rows.length} destinations to ${OUT}`)
