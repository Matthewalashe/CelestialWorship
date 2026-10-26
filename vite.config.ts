import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

/** The data files stay readable in the repository and ship without their indentation (about 300 kB less to install) */
function minifyData(files: string[]): Plugin {
  return {
    name: 'cw-minify-data',
    apply: 'build',
    writeBundle(options) {
      for (const f of files) {
        const path = resolve(options.dir ?? 'dist', f);
        if (!existsSync(path)) continue;
        // text_lines repeats text in every step of the Order of Service; the app rebuilds it from text
        const drop = (key: string, value: unknown) => (key === 'text_lines' ? undefined : value);
        writeFileSync(path, JSON.stringify(JSON.parse(readFileSync(path, 'utf-8')), f.endsWith('services.json') ? drop : undefined));
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    minifyData(['data/hymns.json', 'data/services.json', 'data/lessons.json', 'data/constitution.json', 'data/devotion.json']),
    VitePWA({
      registerType: 'autoUpdate',
      // The file pattern below already takes the icons and the logo; listing them again sent them twice
      includeManifestIcons: false,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Push notification handlers (see public/push-handler.js)
        importScripts: ['/push-handler.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        // Bible books (~13 MB) and story pages are cached as they are read, not at install time
        // The sharing image and the map games' data aren't needed to start the app
        globIgnores: ['**/data/bible/**', '**/data/stories/bs-*.json', '**/data/stories/cl-*.json', '**/data/maps/**', '**/og-image.png', '**/i18n/**', '**/data/parishes_listed.json', '**/screenshots/**', '**/data/stories/*/bs-*.json', '**/assets/LeafletMap-*', '**/assets/LeafletAtlas-*', '**/assets/leaflet-*', '**/assets/MapGames-*', '**/data/maps/countries.json'], // the map code: maps need the internet anyway
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/data\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/bible/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'bible-books',
              expiration: { maxEntries: 140 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Only the chosen language's words are fetched (they are also kept in local storage);
            // the Church's published parish list is fetched when the directory opens
            urlPattern: ({ url }) => url.pathname.startsWith('/i18n/') || url.pathname === '/data/parishes_listed.json',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'cw-on-demand', expiration: { maxEntries: 10 } },
          },
          {
            // Children's stories, their pictures and the Bible maps, kept once opened
            urlPattern: ({ url }) => url.pathname.startsWith('/data/stories/') || url.pathname.startsWith('/data/maps/') || (url.pathname.startsWith('/stories/') && url.pathname.endsWith('.webp')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'stories',
              expiration: { maxEntries: 300, maxAgeSeconds: 90 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'CelestialWorship: Celestial Church of Christ Hymn, Liturgy, Broadcast & Bible',
        short_name: 'CelestialWorship',
        description: 'Celestial Church of Christ digital worship companion — Hymnal, Liturgy, Broadcast, Bible, Notes and more.',
        theme_color: '#0A1628',
        background_color: '#0A1628',
        display: 'standalone',
        id: '/',
        start_url: '/',
        scope: '/',
        orientation: 'any',
        categories: ['education', 'lifestyle', 'books'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        // Android shows these on its install sheet; they are not part of the offline download
        screenshots: [
          { src: '/screenshots/home.webp', sizes: '720x1560', type: 'image/webp', form_factor: 'narrow', label: 'Today: the verse of the day and today’s services' },
          { src: '/screenshots/hymn.webp', sizes: '720x1560', type: 'image/webp', form_factor: 'narrow', label: 'The CCC Hymnal in Yorùbá and English' },
          { src: '/screenshots/bible.webp', sizes: '720x1560', type: 'image/webp', form_factor: 'narrow', label: 'The Bible, KJV and Yorùbá' },
          {
            src: '/og-image.png',
            sizes: '1200x630',
            type: 'image/png',
            form_factor: 'wide',
            label: 'CelestialWorship Home'
          }
        ]
      }
    })
  ],
});
