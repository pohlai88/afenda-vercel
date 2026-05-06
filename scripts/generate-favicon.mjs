/**
 * Builds `public/favicon.ico` and `app/favicon.ico` from the canonical transparent app mark.
 * Run after updating `public/icons/afenda-icon-512-transparent.png`.
 *
 * Usage (repo root): pnpm icons:favicon
 */
import { writeFile } from "node:fs/promises"
import sharp from "sharp"
import toIco from "to-ico"

const SRC = "public/icons/afenda-icon-512-transparent.png"
const OUT_PATHS = ["public/favicon.ico", "app/favicon.ico"]
const SIZES = [16, 32, 48]

const buffers = await Promise.all(
  SIZES.map((s) => sharp(SRC).resize(s, s).png().toBuffer()),
)
const ico = await toIco(buffers)
for (const out of OUT_PATHS) {
  await writeFile(out, ico)
  console.log(`Wrote ${out} (${SIZES.join(", ")} px)`)
}
