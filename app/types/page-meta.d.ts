import type { ApiKey } from '~/composables/useApi'

declare module '#app' {
  interface PageMeta {
    /** `useApi` keys a pull-to-refresh on this page should refetch. */
    refreshKeys?: ApiKey[]
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    refreshKeys?: ApiKey[]
  }
}

export {}
