/**
 * Builds `public/favicon.ico` from the canonical transparent app mark (multi-size ICO).
 * Run after updating `public/icons/afenda-icon-512-transparent.png`.
 *
 * Usage (repo root): pnpm icons:favicon
 */
import { writeFile } from "node:fs/promises"
import sharp from "sharp"
import toIco from "to-ico"

const SRC = "public/icons/afenda-icon-512-transparent.png"
const OUT = "public/favicon.ico"
const SIZES = [16, 32, 48]

const buffers = await Promise.all(
  SIZES.map((s) => sharp(SRC).resize(s, s).png().toBuffer()),
)
const ico = await toIco(buffers)
await writeFile(OUT, ico)
console.log(`Wrote ${OUT} (${SIZES.join(", ")} px)`)
