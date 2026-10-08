import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTACTED_HOSTS, COUNTRY_GUESS_NOTE, PERMISSION_EXPLANATIONS } from '../src/lib/privacy.ts'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

const landing = read('./index.html')
const privacyPage = read('./privacy/index.html')

// The site is static HTML, so these catch its copy drifting from the extension.
describe('website', () => {
  it('explains every permission exactly as Settings does', () => {
    for (const { reason } of PERMISSION_EXPLANATIONS) {
      expect(landing).toContain(reason)
      expect(privacyPage).toContain(reason)
    }
  })

  it('publishes every section of PRIVACY.md', () => {
    const headings = read('../PRIVACY.md')
      .split('\n')
      .filter((line) => line.startsWith('## '))
      .map((line) => line.slice(3))
    expect(headings.length).toBeGreaterThan(0)
    for (const heading of headings) {
      expect(privacyPage).toContain(`<h2>${heading}</h2>`)
    }
  })

  it('lists every contacted server and the country note', () => {
    for (const { host, purpose } of CONTACTED_HOSTS) {
      expect(privacyPage).toContain(`<code>${host}</code>`)
      expect(privacyPage).toContain(purpose)
    }
    expect(privacyPage).toContain(COUNTRY_GUESS_NOTE)
  })

  it('points every install button at the one store link', () => {
    expect(landing).toContain('data-store-link')
    expect(privacyPage).toContain('data-store-link')
    expect(read('./main.js')).toMatch(/^const STORE_URL = /m)
  })
})
