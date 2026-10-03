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
    'nuxt-nodemailer'
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
    // A short fade between routes (styles in main.css). `out-in` so the old
    // page never stacks above the new one and the scroll reset happens while
    // nothing is on screen. Layout changes already animate through
    // `animate-page-in` on each layout's wrapper.
    pageTransition: { name: 'page', mode: 'out-in' },
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

  // Server-only. `NUXT_BITESHIP_API_KEY` / `NUXT_BITESHIP_BASE_URL` override
  // these at runtime; a `biteship_test.` key keeps every order simulated.
  runtimeConfig: {
    biteship: {
      baseUrl: 'https://api.biteship.com',
      apiKey: ''
    },
    public: {
      // Origin used in links inside account emails (`NUXT_PUBLIC_SITE_URL`).
      // Configured rather than read from the request's Host header, which a
      // caller can forge to point a reset link at their own site.
      siteUrl: 'http://localhost:3000',
      // WhatsApp number behind "Pusat Bantuan" (`NUXT_PUBLIC_HELP_WHATSAPP`),
      // in international form without "+" (+62 811-1112-123 → 628111112123).
      helpWhatsapp: '628111112123'
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

  // Gmail SMTP for `useNodeMailer()` in server routes. The module copies this
  // into `runtimeConfig.nodemailer`, so only keys declared here can be
  // overridden: `NUXT_NODEMAILER_AUTH_USER` / `NUXT_NODEMAILER_AUTH_PASS` (a
  // Google app password, not the account password) and `NUXT_NODEMAILER_FROM`.
  nodemailer: {
    from: '',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: '',
      pass: ''
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
          // Biteship's kecamatan list barely changes, so an answer for a
          // search term is good for weeks.
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
  }
})
