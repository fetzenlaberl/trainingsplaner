/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ffmpeg.wasm starts its own web worker and must not be pre-bundled (see ffmpeg.wasm docs).
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'],
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
