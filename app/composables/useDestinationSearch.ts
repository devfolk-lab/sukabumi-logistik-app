import type { Area } from '~/types'

/** Biteship's area search wants whole words, so a fragment is not worth a call. */
export const AREA_MIN_QUERY = 3

/**
 * Kecamatan lookup against Biteship's area search. The request waits for a
 * full second of no typing, a per-term cache makes backspacing instant, and a
 * request counter drops responses that arrive out of order so a slow early
 * request can never overwrite a newer one.
 */
export function useDestinationSearch() {
  const term = ref('')
  const results = ref<Area[]>([])
  const loading = ref(false)
  const error = ref('')

  const cache = new Map<string, Area[]>()
  let latest = 0
  let inFlight = false

  const debounced = refDebounced(term, 1000)

  async function search(query: string) {
    const request = ++latest

    const cached = cache.get(query)
    if (cached) {
      results.value = cached
      loading.value = false
      error.value = ''
      return
    }

    loading.value = true
    inFlight = true
    try {
      const rows = await $fetch<Area[]>('/api/destinations', { query: { q: query } })
      if (request !== latest) return
      cache.set(query, rows)
      results.value = rows
      error.value = ''
    } catch (err) {
      if (request !== latest) return
      results.value = []
      error.value = apiMessage(err, 'Gagal mencari lokasi. Coba lagi.')
    } finally {
      if (request === latest) {
        loading.value = false
        inFlight = false
      }
    }
  }

  const normalize = (value: string) => value.trim().toLowerCase()

  // Show the spinner while the debounce is still waiting, so the empty state
  // does not claim "not found" for a term that has not been searched yet.
  // Typing back to the term already searched settles without a new request.
  watch(term, (value) => {
    const query = normalize(value)
    if (query === normalize(debounced.value)) {
      if (!inFlight) loading.value = false
    } else if (query.length >= AREA_MIN_QUERY) {
      loading.value = true
    }
  })

  watch(debounced, (value) => {
    const query = normalize(value)

    if (query.length < AREA_MIN_QUERY) {
      latest++
      inFlight = false
      results.value = []
      loading.value = false
      error.value = ''
      return
    }

    search(query)
  })

  return { term, results, loading, error }
}
