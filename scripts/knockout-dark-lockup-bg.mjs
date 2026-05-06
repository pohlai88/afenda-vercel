/**
 * One-off / maintainer: keys out the flat dark canvas from the guideline raster
 * lockup so the inner silhouette (same RGB as the canvas) becomes transparent.
 *
 * Usage (repo root): node scripts/knockout-dark-lockup-bg.mjs
 *
 * Env (optional):
 *   TOLERANCE — max Euclidean RGB distance from sampled bg (default 16)
 *   LUM_MAX   — do not knock out pixels above this linear luminance (default 88)
 */
import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import process from "node:process"
import sharp from "sharp"

const INPUT = "public/afenda-brand/brand-guideline/dark-full-icon-bar.png"
const OUTPUT =
  "public/afenda-brand/brand-guideline/dark-full-icon-bar-transparent.png"

const TOLERANCE = Number(process.env.TOLERANCE) || 16
const LUM_MAX = Number(process.env.LUM_MAX) || 88

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function sampleBackground(data, w, h, channels) {
  /** Inset so we skip export padding / bleed (corners are often not canvas fill). */
  const m = Math.max(120, Math.floor(Math.min(w, h) * 0.02))
  const coords = [
    [m, m],
    [w - 1 - m, m],
    [m, h - 1 - m],
    [w - 1 - m, h - 1 - m],
    [m, Math.floor(h / 2)],
    [w - 1 - m, Math.floor(h / 2)],
  ]
  let sr = 0
  let sg = 0
  let sb = 0
  let n = 0
  for (const [x, y] of coords) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue
    const i = (y * w + x) * channels
    sr += data[i]
    sg += data[i + 1]
    sb += data[i + 2]
    n += 1
  }
  return {
    r: Math.round(sr / n),
    g: Math.round(sg / n),
    b: Math.round(sb / n),
  }
}

const img = sharp(INPUT)
const { data, info } = await img.ensureAlpha().raw().toBuffer({
  resolveWithObject: true,
})
const w = info.width
const h = info.height
const ch = info.channels
if (ch !== 4) {
  throw new Error(`Expected 4 channels (RGBA), got ${ch}`)
}

const bg = sampleBackground(data, w, h, ch)
let knocked = 0

for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    const i = (y * w + x) * ch
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const dr = r - bg.r
    const dg = g - bg.g
    const db = b - bg.b
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    const lum = luminance(r, g, b)
    if (dist <= TOLERANCE && lum <= LUM_MAX) {
      data[i + 3] = 0
      knocked += 1
    }
  }
}

await mkdir(dirname(OUTPUT), { recursive: true })
await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(OUTPUT)

console.log(
  JSON.stringify(
    {
      input: INPUT,
      output: OUTPUT,
      size: { w, h },
      sampledBg: bg,
      tolerance: TOLERANCE,
      lumMax: LUM_MAX,
      knockedPixels: knocked,
      totalPixels: w * h,
    },
    null,
    2,
  ),
)
