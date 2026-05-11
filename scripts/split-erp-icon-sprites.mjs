/**
 * Splits 1536×1024 ERP marketing sprite sheets (5×4 grid: 10 icons × light/dark)
 * into trimmed PNGs under public/erp-icon/extracted/<set>/.
 *
 * Equal column boundaries clip wide labels; each cell is extracted with horizontal
 * padding, then sharp.trim() isolates the icon + label bounding box.
 *
 * Run: node scripts/split-erp-icon-sprites.mjs
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, "..")
const srcDir = path.join(repoRoot, "public", "erp-icon")
const outRoot = path.join(srcDir, "extracted")

/** Horizontal bleed past nominal column edges before trim (labels span past 307px cells). */
const COLUMN_PAD_PX = 48

/** Ignore near-white pixels when trimming (sprite background). */
const TRIM_THRESHOLD = 12

/** @type {Record<string, string[]>} row-major within each theme half (2×5) */
const LABELS = {
  "minimalism-icon": [
    "dashboard",
    "analytics",
    "projects",
    "finance",
    "hr-people",
    "sales-crm",
    "inventory",
    "accounting",
    "settings",
    "notifications",
  ],
  "domain-erp": [
    "finance",
    "hr-payroll",
    "inventory",
    "sales-crm",
    "purchasing",
    "manufacturing",
    "projects",
    "accounting",
    "reports",
    "settings",
  ],
  "utilities-erp": [
    "notifications",
    "messages",
    "calendar",
    "tasks",
    "documents",
    "backup",
    "security",
    "helpdesk",
    "settings",
    "profile",
  ],
  "ifra-erp": [
    "servers",
    "network",
    "cloud",
    "database",
    "storage",
    "security",
    "backup",
    "monitoring",
    "load-balancer",
    "firewall",
  ],
}

const SET_SLUG = {
  "minimalism-icon": "minimalism",
  "domain-erp": "domain",
  "utilities-erp": "utilities",
  "ifra-erp": "ifra",
}

function rowBand(imgH, rows, r) {
  const top = Math.floor((r * imgH) / rows)
  const bottom = Math.floor(((r + 1) * imgH) / rows)
  return { top, height: bottom - top }
}

/** Shave bottom pixels before trim on light rows so the next row’s circles are not included in the bbox. */
const LIGHT_ROW_BOTTOM_SHAVE_PX = 14

/** Nominal [left, right) column bounds for equal columns (remainder goes to last columns). */
function columnBounds(imgW, cols, c) {
  const left = Math.floor((c * imgW) / cols)
  const right = Math.floor(((c + 1) * imgW) / cols)
  return { left, right, width: right - left }
}

function paddedExtractWithinRow(imgW, rowTop, rowHeight, c, cols) {
  const { left: nl, right: nr } = columnBounds(imgW, cols, c)
  const left = Math.max(0, nl - COLUMN_PAD_PX)
  const right = Math.min(imgW, nr + COLUMN_PAD_PX)
  return { left, top: rowTop, width: right - left, height: rowHeight }
}

async function splitSheet(fileBase) {
  const labels = LABELS[fileBase]
  const setSlug = SET_SLUG[fileBase]
  if (!labels || !setSlug) {
    throw new Error(`Unknown sheet: ${fileBase}`)
  }

  const inputPath = path.join(srcDir, `${fileBase}.png`)
  const meta = await sharp(inputPath).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  if (w !== 1536 || h !== 1024) {
    console.warn(
      `${fileBase}: expected 1536×1024, got ${w}×${h} — using actual dimensions`
    )
  }

  const rows = 4
  const cols = 5
  const outDir = path.join(outRoot, setSlug)
  await fs.mkdir(outDir, { recursive: true })

  for (let r = 0; r < rows; r++) {
    const variant = r < 2 ? "light" : "dark"
    const idx = (r % 2) * cols
    const band = rowBand(h, rows, r)
    const extractHeight =
      variant === "light"
        ? Math.max(1, band.height - LIGHT_ROW_BOTTOM_SHAVE_PX)
        : band.height
    for (let c = 0; c < cols; c++) {
      const label = labels[idx + c]
      const ext = paddedExtractWithinRow(w, band.top, extractHeight, c, cols)
      const outName = `${label}-${variant}.png`
      const outPath = path.join(outDir, outName)
      let img = sharp(inputPath).extract(ext)
      // trim() matches the top-left pixel; dark tiles are mostly uniform navy, so trim would erase the whole region.
      if (variant === "light") {
        img = img.trim({ threshold: TRIM_THRESHOLD })
      }
      await img.png().toFile(outPath)
      console.log("wrote", path.relative(repoRoot, outPath))
    }
  }
}

async function main() {
  await fs.mkdir(outRoot, { recursive: true })
  for (const base of Object.keys(LABELS)) {
    await splitSheet(base)
  }
  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
