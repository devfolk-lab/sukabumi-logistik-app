import type { Destination } from '~/types'

/**
 * Debounced RajaOngkir subdistrict lookup. The API needs at least three
 * characters, and every keystroke is a billable upstream call, so the term is
 * debounced rather than fetched live.
 */
export function useDestinationSearch() {
  const term = ref('')
  const results = ref<Destination[]>([])
  const loading = ref(false)

  const debounced = refDebounced(term, 300)

  watch(debounced, async (value) => {
    const query = value.trim()

    if (query.length < 3) {
      results.value = []
      return
    }

    loading.value = true
    try {
      results.value = await $fetch<Destination[]>('/api/destinations', { query: { q: query } })
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  })

  return { term, results, loading }
}
