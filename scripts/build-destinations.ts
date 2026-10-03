import 'dotenv/config'
import { gunzipSync, gzipSync } from 'node:zlib'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * Keys the local destination index (`server/assets/destinations.tsv.gz`) to
 * Biteship area ids. Biteship's hosted area search only matches whole words
 * ("cibad" finds Cibal, "cibadak" finds Cibadak) and stops at kecamatan level,
 * so per-keystroke suggestions and kelurahan names need a local index.
 *
 * The kelurahan list is the snapshot's own: every postal code already in it is
 * looked up once on Biteship (`/v1/maps/areas?input=<zip>`), and each
 * kelurahan is attached to the Biteship area (kecamatan + postal code) whose
 * name matches. Every Biteship area also gets a kecamatan-level row, so a
 * kelurahan that cannot be matched is dropped without losing its kecamatan.
 *
 * Row layout: areaId, kelurahan, kecamatan, city, province, zip — kelurahan is
 * empty on kecamatan-level rows. Re-running is idempotent: the output is a
 * valid input. Around 8,300 requests, paced and checkpointed in
 * `scripts/.cache/`, so re-run to resume after an interruption.
 */

const BASE_URL = (process.env.NUXT_BITESHIP_BASE_URL || 'https://api.biteship.com').replace(/\/$/, '')
const KEY = process.env.NUXT_BITESHIP_API_KEY
const OUT = resolve('server/assets/destinations.tsv.gz')
const CACHE_DIR = resolve('scripts/.cache')
const PROGRESS = resolve(CACHE_DIR, 'biteship-areas.jsonl')
const PACE_MS = Number(process.env.BITESHIP_CRAWL_PACE_MS ?? 300)

if (!KEY) {
  console.error('NUXT_BITESHIP_API_KEY is not set')
  process.exit(1)
}

if (!existsSync(OUT)) {
  console.error(`${OUT} is missing — it is the kelurahan source this script re-keys`)
  process.exit(1)
}

interface Area {
  id: string
  administrative_division_level_1_name: string
  administrative_division_level_2_name: string
  administrative_division_level_3_name: string
  postal_code: number
}

interface Kelurahan { name: string, district: string }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

let lastRequest = 0

async function areasForZip(zip: string, attempt = 0): Promise<Area[]> {
  const wait = lastRequest + PACE_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequest = Date.now()

  const url = `${BASE_URL}/v1/maps/areas?countries=ID&type=single&input=${encodeURIComponent(zip)}`
  const res = await fetch(url, { headers: { authorization: KEY! } })
  const body = await res.json().catch(() => null) as { success?: boolean, areas?: Area[], error?: string } | null

  // The search is fuzzy, so keep only areas that actually carry this code.
  if (body?.success) return (body.areas ?? []).filter(a => String(a.postal_code) === zip)

  if (res.status === 429) {
    console.log('rate limited, sleeping 60s')
    await sleep(60_000)
    return areasForZip(zip, attempt)
  }

  if (attempt < 4) {
    await sleep(1000 * 2 ** attempt)
    return areasForZip(zip, attempt + 1)
  }
  throw new Error(`${zip}: ${res.status} ${body?.error ?? ''}`)
}

// Kelurahan per postal code, from the current snapshot. Only columns 1–5 are
// read, which have the same meaning in the old and the new layout.
const kelurahanByZip = new Map<string, Kelurahan[]>()
const source = gunzipSync(readFileSync(OUT)).toString('utf8')
for (const line of source.split('\n')) {
  const [, name, district, , , zip] = line.split('\t')
  if (!zip) continue
  const list = kelurahanByZip.get(zip) ?? []
  if (name) list.push({ name, district: district ?? '' })
  kelurahanByZip.set(zip, list)
}
console.log(`${kelurahanByZip.size} postal codes to look up`)

mkdirSync(CACHE_DIR, { recursive: true })

const areasByZip = new Map<string, Area[]>()
if (existsSync(PROGRESS)) {
  for (const line of readFileSync(PROGRESS, 'utf8').split('\n')) {
    if (!line) continue
    const { zip, areas } = JSON.parse(line) as { zip: string, areas: Area[] }
    areasByZip.set(zip, areas)
  }
  console.log(`resuming: ${areasByZip.size} postal codes already fetched`)
}

let count = 0
for (const zip of kelurahanByZip.keys()) {
  if (areasByZip.has(zip)) continue
  const areas = await areasForZip(zip)
  areasByZip.set(zip, areas)
  appendFileSync(PROGRESS, `${JSON.stringify({ zip, areas })}\n`)
  if (++count % 250 === 0) console.log(`${areasByZip.size}/${kelurahanByZip.size} postal codes`)
}

/** The Biteship area a kelurahan belongs to, or null when no name matches. */
function matchArea(kelurahan: Kelurahan, areas: Area[]): Area | null {
  if (areas.length === 1) return areas[0]!
  const district = norm(kelurahan.district)
  return areas.find(a => norm(a.administrative_division_level_3_name) === district)
    ?? areas.find((a) => {
      const name = norm(a.administrative_division_level_3_name)
      return name.includes(district) || district.includes(name)
    })
    ?? null
}

// Keyed by everything but the id: Biteship lists a few kecamatan twice under
// different ids, and the picker tells rows apart by label, so the first one
// wins.
const rows = new Map<string, string>()
let dropped = 0
let emptyZips = 0

function add(area: Area, kelurahan: string) {
  const label = [
    kelurahan,
    area.administrative_division_level_3_name,
    area.administrative_division_level_2_name,
    area.administrative_division_level_1_name,
    String(area.postal_code)
  ].join('\t')
  if (!rows.has(label)) rows.set(label, `${area.id}\t${label}`)
}

for (const [zip, kelurahan] of kelurahanByZip) {
  const areas = areasByZip.get(zip) ?? []
  if (!areas.length) {
    emptyZips++
    dropped += kelurahan.length
    continue
  }
  for (const area of areas) add(area, '')
  for (const k of kelurahan) {
    const area = matchArea(k, areas)
    if (area) add(area, k.name)
    else dropped++
  }
}

const lines = [...rows.values()].sort()
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, gzipSync(lines.join('\n'), { level: 9 }))
console.log(`wrote ${lines.length} destinations to ${OUT}`)
console.log(`${dropped} kelurahan without a matching Biteship area, ${emptyZips} postal codes unknown to Biteship`)
