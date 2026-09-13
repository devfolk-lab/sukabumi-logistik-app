import type { Destination } from '~/types'

/**
 * Destination lookup that answers on every keystroke. The server searches a
 * local snapshot, so the debounce is short; a per-term cache makes backspacing
 * instant, and a request counter drops responses that arrive out of order so
 * a slow early request can never overwrite a newer one.
 */
export function useDestinationSearch() {
  const term = ref('')
  const results = ref<Destination[]>([])
  const loading = ref(false)
  const error = ref('')

  const cache = new Map<string, Destination[]>()
  let latest = 0

  const debounced = refDebounced(term, 120)

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
    try {
      const rows = await $fetch<Destination[]>('/api/destinations', { query: { q: query } })
      if (request !== latest) return
      cache.set(query, rows)
      results.value = rows
      error.value = ''
    } catch (err) {
      if (request !== latest) return
      results.value = []
      error.value = apiMessage(err, 'Gagal mencari lokasi. Coba lagi.')
    } finally {
      if (request === latest) loading.value = false
    }
  }

  watch(debounced, (value) => {
    const query = value.trim().toLowerCase()

    if (query.length < 2) {
      latest++
      results.value = []
      loading.value = false
      error.value = ''
      return
    }

    search(query)
  })

  return { term, results, loading, error }
}
