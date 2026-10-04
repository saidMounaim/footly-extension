import { describe, expect, it } from 'vitest'
import pkg from './package.json' with { type: 'json' }
import manifest from './manifest.config.ts'

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
  })

  it('runs one module service worker for background match alerts', () => {
    expect(manifest).toHaveProperty('background', {
      service_worker: 'src/background.ts',
      type: 'module',
    })
  })
})
