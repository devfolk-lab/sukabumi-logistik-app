// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/supabase'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  runtimeConfig: {
    // RajaOngkir API V2 (Komerce). The published path is /api/v1 despite the
    // product being named V2 — there is no /api/v2.
    rajaongkir: {
      baseUrl: 'https://rajaongkir.komerce.id/api/v1',
      shippingCostApiKey: '',
      generalApiKey: ''
    },
    // Komship Delivery API. The general key is sandbox-only; swap the base URL
    // to https://api.collaborator.komerce.id once a production key exists.
    komship: {
      baseUrl: 'https://api-sandbox.collaborator.komerce.id',
      enabled: true
    }
  },

  routeRules: {
    // Every route is user-scoped now, so nothing can be prerendered.
    '/**': { ssr: true }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  pinia: {
    storesDirs: ['./app/stores/**']
  },

  supabase: {
    url: process.env.NUXT_SUPABASE_URL,
    key: process.env.NUXT_SUPABASE_KEY,
    // Only Auth is used from Supabase; the schema belongs to Prisma, so there
    // are no generated database types to point at.
    types: false,
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/reset-password',
      exclude: ['/login', '/register', '/lupa-password/**', '/reset-password/**']
    }
  }
})
