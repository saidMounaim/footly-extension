import { describe, expect, it } from 'vitest'
import css from '../index.css?raw'

// card-yellow, card-red, and crest-backdrop are decorative (always beside a text label), so they
// are not contrast-checked.
const TOKENS = [
  'background',
  'surface',
  'foreground',
  'muted',
  'border',
  'accent',
  'warning',
  'card-yellow',
  'card-red',
  'crest-backdrop',
]

/** The custom property values declared directly in the block opened by `selector`. */
function tokensIn(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No block for ${selector}`)
  const body = css.slice(start + selector.length + 2, css.indexOf('}', start))
  return Object.fromEntries(
    [...body.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)].map(([, name, value]) => [name, value]),
  )
}

/** WCAG 2 relative luminance of a 6-digit hex color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const light = tokensIn(':root')
const systemDark = tokensIn(":root:not([data-theme='light'])")
const forcedDark = tokensIn(":root[data-theme='dark']")

describe('theme tokens', () => {
  it.each([
    ['light', light],
    ['dark', forcedDark],
  ])('declares every token in %s', (_name, tokens) => {
    expect(Object.keys(tokens).sort()).toEqual([...TOKENS].sort())
  })

  it('uses the same dark tokens for the system and forced dark themes', () => {
    expect(systemDark).toEqual(forcedDark)
  })
})

describe.each([
  ['light', light],
  ['dark', forcedDark],
])('%s theme contrast', (_name, tokens) => {
  it.each(['foreground', 'muted', 'accent', 'warning'].flatMap((text) =>
    ['background', 'surface'].map((ground) => [text, ground] as const),
  ))('%s on %s is at least 4.5:1', (text, ground) => {
    expect(contrast(tokens[text], tokens[ground])).toBeGreaterThanOrEqual(4.5)
  })

  it('switch knob (background on accent) is at least 3:1', () => {
    expect(contrast(tokens.background, tokens.accent)).toBeGreaterThanOrEqual(3)
  })
})
