/// <reference types="vitest/config" />
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import manifest from './manifest.config.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  test: {
    // Pin the timezone so local-day window and DST tests are deterministic.
    env: { TZ: 'Europe/London' },
  },
})
