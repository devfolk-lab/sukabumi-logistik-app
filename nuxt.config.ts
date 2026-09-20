// https://nuxt.com/docs/api/configuration/nuxt-config

/** Revision for the precached shell — evaluated once per build. */
const BUILD_ID = Date.now().toString(36)

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/supabase'
  ],

  // Client-only rendering: every screen is user-scoped and there is nothing
  // to index, so the server ships the shell in `app/spa-loading-template.html`
  // and each page shows its own skeleton while data loads.
  ssr: false,

  devtools: {
    enabled: true
  },

  // These belong here rather than in `app.vue`: with `ssr: false` a `useHead`
  // call only runs after hydration, so it never reaches the prerendered shell
  // — and the manifest link has to be in the document the browser loads for
  // the app to be installable.
  app: {
    head: {
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ],
      meta: [
        { name: 'theme-color', content: '#002144' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'SukLog' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  spaLoadingTemplate: true,

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

  compatibilityDate: '2026-06-30',

  // With `ssr: false` the shell is normally rendered by the server at request
  // time and never written to disk, which leaves the service worker with no
  // document to precache — `navigateFallback` would point at a URL Workbox
  // does not hold, and a cold offline launch would fail. Prerendering the one
  // route emits `.output/public/index.html` (the SPA template) so there is a
  // real document to fall back to. `crawlLinks: false` keeps it to that one
  // file: every other route is user-scoped and renders client-side anyway.
  nitro: {
    prerender: {
      routes: ['/'],
      crawlLinks: false
    }
  },

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

  // The five keyed endpoints in `useApi` are deliberately absent from
  // `runtimeCaching`: IndexedDB owns those (see app/plugins/offline.client.ts),
  // and a second copy in the service worker would be a competing source of
  // truth. No mutation route is ever intercepted.
  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Sukabumi Logistik',
      short_name: 'SukLog',
      description: 'Layanan multi-ekspedisi dan solusi pengiriman untuk individu, UMKM, dan bisnis di Sukabumi.',
      lang: 'id',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#f8f9fb',
      theme_color: '#002144',
      icons: [
        { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      // Deliberately no `html`: the service worker is generated during the
      // client build, which finishes before Nitro prerenders `/`. On a clean
      // build the glob would find no document at all, and on a rebuild it
      // would find the *previous* one — which then collides with the entry
      // below and makes Workbox throw `add-to-cache-list-conflicting-entries`.
      globPatterns: ['**/*.{js,css,svg,png,ico,woff2}'],
      // So the shell is listed explicitly instead: Workbox fetches and stores
      // it at install time, which is what `navigateFallback` needs to resolve.
      // The revision changes per build so a deploy refreshes it.
      additionalManifestEntries: [{ url: '/', revision: BUILD_ID }],
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//],
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          // Tracking is worth showing stale, never worth showing instead of
          // fresh — so the network gets 5s before the cache answers.
          urlPattern: /^\/api\/shipments\/.+/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'suklog-tracking',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            cacheableResponse: { statuses: [200] }
          }
        },
        {
          // A static snapshot rebuilt by `pnpm build:destinations`, not
          // per-request data.
          urlPattern: /^\/api\/destinations/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'suklog-destinations',
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [200] }
          }
        }
      ]
    },
    client: {
      // Captures `beforeinstallprompt` into `$pwa.showInstallPrompt` instead of
      // letting Chrome show its own mini-infobar.
      installPrompt: true
    },
    devOptions: {
      enabled: true,
      type: 'module',
      suppressWarnings: true
    }
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
