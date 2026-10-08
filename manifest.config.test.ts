import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import pkg from './package.json' with { type: 'json' }
import manifest from './manifest.config.ts'
import { CONTACTED_HOSTS, PERMISSION_EXPLANATIONS } from './src/lib/privacy.ts'

describe('manifest', () => {
  it('is a Manifest V3 popup with the package version', () => {
    expect(manifest).toMatchObject({
      manifest_version: 3,
      name: 'Footly',
      version: pkg.version,
      action: { default_popup: 'index.html' },
    })
  })

  it('requests only storage, alarms, and notifications, with no host access', () => {
    expect(manifest).toHaveProperty('permissions', ['storage', 'alarms', 'notifications'])
    expect(manifest).not.toHaveProperty('host_permissions')
    expect(manifest).not.toHaveProperty('content_scripts')
    // The default MV3 policy forbids remote code; Footly never loosens it.
    expect(manifest).not.toHaveProperty('content_security_policy')
  })

  it('ships its icon at every size Chrome uses', () => {
    expect(manifest).toHaveProperty('icons', {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    })
    expect(manifest).toHaveProperty('action.default_icon', {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
    })
  })

  it('explains exactly the permissions it requests', () => {
    // Same order as the manifest, so this fails for a missing or an extra explanation.
    const explained = PERMISSION_EXPLANATIONS.map((entry) => entry.permission)
    expect(manifest).toHaveProperty('permissions', explained)
  })

  it('lists every contacted server in PRIVACY.md exactly as Settings shows it', () => {
    const policy = readFileSync(new URL('./PRIVACY.md', import.meta.url), 'utf8')
    for (const { host, purpose } of CONTACTED_HOSTS) {
      expect(policy).toContain(`| \`${host}\` | ${purpose} |`)
    }
  })

  it('runs one module service worker for background match alerts', () => {
    expect(manifest).toHaveProperty('background', {
      service_worker: 'src/background.ts',
      type: 'module',
    })
  })
})
