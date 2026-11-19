/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app below /<repository>/; the deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    // Installable app that also works offline (e.g. on the training ground).
    VitePWA({
      // A new version is announced in the app instead of reloading by itself.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trainingsplaner',
        short_name: 'Trainingsplaner',
        description: 'Fußballübungen zeichnen, animieren, planen und exportieren',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // The 32 MB MP4 converter is not downloaded up front; it is cached on first use (below).
        globIgnores: ['**/ffmpeg-core-*'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /ffmpeg-core-.*\.(js|wasm)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'ffmpeg-core', expiration: { maxEntries: 4 } },
          },
        ],
      },
    }),
  ],
  // ffmpeg.wasm starts its own web worker and must not be pre-bundled (see ffmpeg.wasm docs).
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'],
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
