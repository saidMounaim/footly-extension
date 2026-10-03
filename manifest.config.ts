import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'Footly',
  description: 'Upcoming matches, live scores, and results in a compact popup.',
  version: pkg.version,
  action: {
    default_popup: 'index.html',
    default_title: 'Footly',
  },
})
