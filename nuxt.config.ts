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
  // call only runs after hydration, so it never reaches the shell the server
  // sends — and the manifest link has to be in the document the browser loads
  // for the app to be installable.
  app: {
    // A short fade between routes (styles in main.css). `out-in` so the old
    // page never stacks above the new one and the scroll reset happens while
    // nothing is on screen. Layout changes already animate through
    // `animate-page-in` on each layout's wrapper.
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'id' },
      // Shown by the tab and the app switcher before hydration (and on a cold
      // start offline); `app.vue` sets the same once it runs.
      title: 'Sukabumi Logistik',
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
      ],
      // `viewport-fit=cover` lets an installed iOS app draw under the status
      // bar (`black-translucent` below) and makes `env(safe-area-inset-*)`
      // report real values; every edge that could sit under the notch or the
      // home indicator pads itself with them. In a browser tab the insets are
      // 0, so nothing moves.
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [
        { name: 'description', content: 'Layanan multi-ekspedisi dan solusi pengiriman untuk individu, UMKM, dan bisnis di Sukabumi.' },
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
    // Origins allowed to call the public tracking API from a browser
    // (`NUXT_TRACKING_CORS_ORIGINS`, comma-separated): the landing page.
    trackingCorsOrigins: 'https://sukabumilogistik.com,https://www.sukabumilogistik.com,http://localhost:4321',
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

  // The service worker and manifest decide which build a device runs, so a
  // browser must never answer them from its HTTP cache.
  routeRules: {
    '/sw.js': { headers: { 'cache-control': 'no-cache' } },
    '/manifest.webmanifest': { headers: { 'cache-control': 'no-cache' } }
  },

  // Nuxt's own new-build check would reload the app on the next route change
  // after a deploy. With the service worker in charge that reload is answered
  // from the old precache, so it lands on the same old build — and wipes the
  // in-memory kirim draft on the way. Updates are the service worker's job
  // (`registerType: 'prompt'`, pwa.client.ts); a browser without one still
  // reloads on a missing chunk.
  experimental: {
    checkOutdatedBuildInterval: false
  },

  compatibilityDate: '2026-06-30',

  // No `nitro.prerender` on purpose. A prerendered `/` is a file written at
  // build time, so its inlined `runtimeConfig.public` (`NUXT_PUBLIC_*`) would
  // ignore the values set on the server — and the service worker serves that
  // document for every navigation. Rendered per request instead, `/` carries
  // the live config, and Workbox fetches it at install time like any other
  // precache entry (`additionalManifestEntries` below).

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // With `ssr: false` Nuxt Icon defaults to fetching every icon from
  // api.iconify.design at runtime — a third-party request per icon set, and
  // blank icons offline. Instead every icon the code names is bundled into the
  // client (precached with the rest of the JS). The scan covers `.ts` too,
  // since icon names also live in utils and composables; Nuxt UI adds its own
  // defaults through the `icon:clientBundleIcons` hook. Anything the scan
  // misses still comes from our own server's `/api/_nuxt_icon`, which the
  // service worker caches, never from the public API.
  icon: {
    provider: 'server',
    fallbackToApi: false,
    clientBundle: {
      scan: {
        globInclude: ['app/**/*.{vue,ts}', 'shared/**/*.ts']
      },
      sizeLimitKb: 512
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
  // truth. No mutation route is ever intercepted (runtime routes match GET
  // only).
  pwa: {
    registerType: 'prompt',
    manifest: {
      id: '/',
      name: 'Sukabumi Logistik',
      short_name: 'SukLog',
      description: 'Layanan multi-ekspedisi dan solusi pengiriman untuk individu, UMKM, dan bisnis di Sukabumi.',
      lang: 'id',
      start_url: '/',
      scope: '/',
      dir: 'ltr',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#f8f9fb',
      theme_color: '#002144',
      categories: ['business', 'productivity', 'shopping'],
      // Opening the app again (a shortcut, a shared link) reuses the running
      // window instead of stacking a second one.
      launch_handler: { client_mode: ['navigate-existing', 'auto'] },
      icons: [
        { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        // Opaque, with the mark inside the central 80% safe zone, so a
        // launcher's circle or squircle mask never crops it.
        { src: '/maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ],
      // Long-press on the launcher icon.
      shortcuts: [
        {
          name: 'Kirim Paket',
          short_name: 'Kirim',
          description: 'Buat pengiriman baru',
          url: '/kirim',
          icons: [{ src: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' }]
        },
        {
          name: 'Lacak Paket',
          short_name: 'Lacak',
          description: 'Lacak nomor resi',
          url: '/lacak',
          icons: [{ src: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' }]
        },
        {
          name: 'Riwayat Pengiriman',
          short_name: 'Riwayat',
          description: 'Lihat pesanan dan status pengiriman',
          url: '/riwayat',
          icons: [{ src: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' }]
        }
      ]
    },
    workbox: {
      // No `html`: the shell is never written to disk (see `nitro` above).
      globPatterns: ['**/*.{js,css,svg,png,ico,woff2}'],
      // An unused 100 kB trace; nothing links to it.
      globIgnores: ['favicon.svg'],
      // So the shell is listed explicitly instead: Workbox fetches it from the
      // server at install time, which is what `navigateFallback` needs to
      // resolve. The revision changes per build so a deploy refreshes it — a
      // changed `NUXT_PUBLIC_*` alone does not, so redeploy after changing one.
      additionalManifestEntries: [{ url: '/', revision: BUILD_ID }],
      // The first service worker takes over the open tab at once, so the tab
      // that showed "Siap dipakai offline" really can lazy-load its routes
      // offline. Updates are unaffected: a new worker still waits for the
      // user (`registerType: 'prompt'`), and only takes control after it.
      clientsClaim: true,
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//],
      cleanupOutdatedCaches: true,
      // Matchers are functions, not regexes: Workbox tests a RegExp against the
      // full URL (`https://host/api/...`), so a pattern anchored at `^\/api`
      // never matches anything. These are serialised into sw.js, so they must
      // not close over anything in this file. Every cache holding account
      // data is also listed in `clearOfflineStores()` (useApi.ts), which
      // empties them on sign-in and sign-out.
      runtimeCaching: [
        {
          // Tracking is worth showing stale, never worth showing instead of
          // fresh — so the network gets 5s before the cache answers.
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/shipments/'),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'suklog-tracking',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            cacheableResponse: { statuses: [200] }
          }
        },
        {
          // One order's detail (riwayat/[id]). The list lives in IndexedDB,
          // but the detail is a separate, unkeyed GET; caching it lets an
          // order opened once still open offline, payment steps and label
          // included. Its sub-routes (`/cancel`, …) are POSTs and never match.
          urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/api\/orders\/[^/]+$/.test(url.pathname),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'suklog-orders',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            cacheableResponse: { statuses: [200] }
          }
        },
        {
          // Biteship's kecamatan list barely changes, so an answer for a
          // search term is good for weeks.
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/destinations'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'suklog-destinations',
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [200] }
          }
        },
        {
          // Icons the client bundle missed (see `icon` above). Same request,
          // same SVG, until the icon packages are upgraded.
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/_nuxt_icon/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'suklog-icons',
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [200] }
          }
        }
      ]
    },
    client: {
      // Captures `beforeinstallprompt` into `$pwa.showInstallPrompt` instead of
      // letting Chrome show its own mini-infobar.
      // No `periodicSyncForUpdates`: pwa.client.ts checks for updates itself,
      // also when the app comes back to the foreground, and quietly skips the
      // check offline (the module's own timer rejects there on Safari and
      // Firefox).
      installPrompt: true
    },
    devOptions: {
      enabled: true,
      type: 'module',
      suppressWarnings: true
    }
  }
})
