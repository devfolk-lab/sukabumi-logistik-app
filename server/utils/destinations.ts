import { gunzipSync } from 'node:zlib'
import type { Destination } from '#shared/types'

/**
 * Local destination index built by `pnpm build:destinations`. RajaOngkir's
 * hosted search only matches whole words, so per-keystroke suggestions come
 * from this snapshot; the hosted endpoint remains the fallback when the
 * snapshot is missing.
 */
interface IndexedDestination extends Destination {
  /** Lower-cased `label` for matching. */
  haystack: string
}

let index: IndexedDestination[] | undefined

function parseRow(line: string): IndexedDestination | null {
  const [id, subdistrict, district, city, province, zipCode] = line.split('\t')
  if (!id || !subdistrict) return null
  const label = [subdistrict, district, city, province, zipCode].join(', ')
  return {
    id: Number(id),
    label,
    province: province ?? '',
    city: city ?? '',
    district: district ?? '',
    subdistrict,
    zipCode: zipCode ?? '',
    haystack: label.toLowerCase()
  }
}

async function loadIndex(): Promise<IndexedDestination[] | null> {
  if (index) return index

  // A missing snapshot is not cached, so dropping the file in later (or the
  // crawl finishing) takes effect without a restart.
  const raw = await useStorage('assets:server').getItemRaw<Buffer | Uint8Array>('destinations.tsv.gz').catch(() => null)
  if (!raw) return null

  const text = gunzipSync(Buffer.from(raw)).toString('utf8')
  index = text.split('\n').map(parseRow).filter((row): row is IndexedDestination => row !== null)
  return index
}

export async function hasLocalDestinations(): Promise<boolean> {
  return (await loadIndex()) !== null
}

/**
 * Prefix search across every word of the label ("cibad" → "CIBADAK, …"),
 * ranked so subdistrict hits come before district and city hits. Multi-word
 * queries must match every word ("cibadak suk" → Cibadak in Sukabumi).
 */
export async function searchLocalDestinations(query: string, limit = 10): Promise<Destination[] | null> {
  const rows = await loadIndex()
  if (!rows) return null

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []

  const scored: { row: IndexedDestination, score: number }[] = []

  for (const row of rows) {
    let score = 0
    for (const term of terms) {
      const at = row.haystack.indexOf(term)
      if (at === -1 || (at > 0 && !/[\s,]/.test(row.haystack[at - 1]!))) {
        score = -1
        break
      }
      // Earlier in the label means a more specific (subdistrict-level) hit.
      score += at === 0 ? 3 : at < row.subdistrict.length + 2 ? 2 : 1
    }
    if (score > 0) scored.push({ row, score })
  }

  // Exact-looking names first: "PAGESANGAN" before "PAGESANGAN BARAT".
  scored.sort((a, b) => b.score - a.score || a.row.subdistrict.length - b.row.subdistrict.length || a.row.label.localeCompare(b.row.label))

  return scored.slice(0, limit).map(({ row }) => {
    const { haystack: _haystack, ...destination } = row
    return destination
  })
}
