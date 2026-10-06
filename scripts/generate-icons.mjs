// Draws Footly's toolbar and store icon and writes PNGs at every size Chrome uses.
// Dependency-free: shapes are rendered at 8x and averaged down, then PNG-encoded with zlib.
// Run: node scripts/generate-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const SIZES = [16, 32, 48, 128]
const SUPERSAMPLE = 8
const GREEN = [0x15, 0x80, 0x3d]
const WHITE = [0xff, 0xff, 0xff]

/** Shape tests in a 0..1 unit square; later shapes paint over earlier ones. */
function colorAt(x, y) {
  // Rounded square background (corner radius 22%).
  const r = 0.22
  const cx = Math.min(Math.max(x, r), 1 - r)
  const cy = Math.min(Math.max(y, r), 1 - r)
  if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return null
  // Bold "F": stem, top bar, middle bar.
  const stem = x >= 0.27 && x <= 0.41 && y >= 0.22 && y <= 0.78
  const top = x >= 0.27 && x <= 0.72 && y >= 0.22 && y <= 0.35
  const middle = x >= 0.27 && x <= 0.62 && y >= 0.45 && y <= 0.57
  // Ball dot to the lower right.
  const ball = (x - 0.69) ** 2 + (y - 0.71) ** 2 <= 0.085 ** 2
  return stem || top || middle || ball ? WHITE : GREEN
}

function render(size) {
  const n = size * SUPERSAMPLE
  const rgba = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let red = 0
      let green = 0
      let blue = 0
      let covered = 0
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const color = colorAt((px * SUPERSAMPLE + sx + 0.5) / n, (py * SUPERSAMPLE + sy + 0.5) / n)
          if (!color) continue
          red += color[0]
          green += color[1]
          blue += color[2]
          covered++
        }
      }
      const i = (py * size + px) * 4
      if (covered > 0) {
        rgba[i] = Math.round(red / covered)
        rgba[i + 1] = Math.round(green / covered)
        rgba[i + 2] = Math.round(blue / covered)
      }
      rgba[i + 3] = Math.round((covered / SUPERSAMPLE ** 2) * 255)
    }
  }
  return rgba
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function png(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0 // no filter
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of SIZES) {
  const path = new URL(`../public/icons/icon-${size}.png`, import.meta.url)
  writeFileSync(path, png(size, render(size)))
  console.log(`wrote public/icons/icon-${size}.png`)
}
