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

  it('requests only storage, with no host access or background work', () => {
    expect(manifest).toHaveProperty('permissions', ['storage'])
    expect(manifest).not.toHaveProperty('host_permissions')
    expect(manifest).not.toHaveProperty('background')
    expect(manifest).not.toHaveProperty('content_scripts')
  })
})
