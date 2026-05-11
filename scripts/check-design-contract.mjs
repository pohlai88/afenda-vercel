/**
 * Design system enforcement (mechanical, CI-safe).
 *
 * Scans app/, components/, hooks/, lib/features/, and lib/design-system.ts for drift.
 * Validates @theme inline var() refs against :root / .dark in app/globals.css.
 * See lib/design-system.ts for allowed radius tokens.
 */
import fs from "node:fs"
import path from "node:path"

const root = path.join(import.meta.dirname, "..")

const SCAN_DIRS = ["app", "components", "hooks", "lib/features"]
const DESIGN_SYSTEM_FILE = path.join(root, "lib", "design-system.ts")
const GLOBALS_CSS = path.join(root, "app", "globals.css")

/** Disallowed “pill” radii — use #lib/design-system uiRadius instead */
const FORBIDDEN_RADIUS = /\brounded-(3xl|4xl|5xl|6xl)\b/g

/** Heavy shadow — prefer shadow-md / shadow-lg / shadow-xl per luxury ERP direction */
const FORBIDDEN_SHADOW = /\bshadow-2xl\b/g

/** Primitive files must use semantic color tokens, not palette shades. */
const FORBIDDEN_PRIMITIVE_COLOR =
  /\b(?:bg|text|border|ring)-(?:slate|gray|zinc|stone|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g

/**
 * Filled primary/secondary hovers must use --primary-hover / --secondary-hover, not opacity shortcuts.
 */
const FORBIDDEN_BRAND_OPACITY_HOVER =
  /hover:bg-primary\/|dark:hover:bg-primary\/|hover:bg-secondary\/|dark:hover:bg-secondary\//

/**
 * Arbitrary rounded-[…] is opt-in only (Tailwind still needs literals in allowlisted files).
 */
const ARBITRARY_ROUNDED_ALLOWLIST = new Set([
  "components/ui/calendar.tsx",
  "components/ui/chart.tsx",
  "components/ui/checkbox.tsx",
  "components/ui/scroll-area.tsx",
  "components/ui/tooltip.tsx",
])

const ARBITRARY_ROUNDED = /\brounded-\[/g

/**
 * Spacing rhythm utilities must come from the token scale: Tailwind's spacing scale,
 * `p-surface-*` / `gap-surface-*` (mapped to `--space-surface-*`), or `gap-density-*`
 * (mapped to `--density-*`). Arbitrary literal values like `p-[12px]` / `gap-[7px]`
 * are forbidden because they bypass `lib/design-system.ts` and `app/globals.css`.
 *
 * CSS-variable references (`var(--…)`, `--spacing(var(--…))`, `calc(var(--…)*…)`) stay
 * allowed — they reference tokens dynamically and do not introduce new visual values.
 *
 * Out of scope: positioning (`top-[…]`, `left-[…]`, `inset-[…]`) and sizing
 * (`w-[…]`, `h-[…]`, `min-w-[…]`, etc.) — those have no token scale today.
 */
const ARBITRARY_SPACING =
  /\b(?:[mp][trblxy]?|gap(?:-[xy])?|space-[xy])-\[([^\]]+)\]/g

function isSpacingTokenReference(value) {
  return value.includes("var(") || value.startsWith("--")
}

/* -------------------------------------------------------------------------- */
/* Material semantics — adoption governance                                   */
/*                                                                            */
/* Material phases, blur tiers, will-change scoping, and infinite animations  */
/* live ONLY in app/globals.css. Mirrors .cursor/rules/material-semantics.mdc */
/* and ADR-0001 §12.                                                          */
/* -------------------------------------------------------------------------- */

/** JSX inline style: backdropFilter / willChange bypass material governance. */
const FORBIDDEN_INLINE_BACKDROP = /\bbackdropFilter\s*:/g
const FORBIDDEN_INLINE_WILL_CHANGE = /\bwillChange\s*:/g

/** Tailwind arbitrary blur utilities bypass the 3-tier blur budget. */
const FORBIDDEN_BACKDROP_BLUR_UTIL = /\bbackdrop-blur-\[/g
const FORBIDDEN_BLUR_UTIL = /(?<![\w-])blur-\[/g

/**
 * Standard Tailwind backdrop-blur-* scales bypass centralized material tokens.
 * Nexus chrome must use .af-nexus-* classes from app/globals.css only.
 */
const FORBIDDEN_NEXUS_TAILWIND_BACKDROP =
  /\b(?:supports-\[backdrop-filter\]:)?backdrop-blur-(?:sm|md|lg|xl|2xl|3xl)\b/g

/**
 * Continuous animation is GPU + cognitive fatigue (Apple HIG: continuous motion
 * must be rare). Pulses must fire a finite number of iterations and settle to
 * static styling. All `infinite` animations belong in `app/globals.css`.
 */
const FORBIDDEN_INFINITE_ANIMATION = /animation\s*:[^;}\n]*\binfinite\b/g

/**
 * Drift detection — legacy material identifiers renamed to operational vocabulary.
 * Public philosophy still says "water" in docs/ADRs; engineering tokens do not.
 */
const FORBIDDEN_LEGACY_WATER_TOKEN = /--af-water-/g
const FORBIDDEN_LEGACY_WATER_CLASS = /\baf-material-water\b/g
const FORBIDDEN_LEGACY_TRANSITIONING_CLASS = /\baf-material-transitioning\b/g

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) out.push(...walk(p))
    else if (name.isFile() && /\.(tsx|ts|jsx|js)$/.test(name.name)) out.push(p)
  }
  return out
}

function posixRel(file) {
  return path.relative(root, file).split(path.sep).join("/")
}

/** Extract inner CSS for the first `{ ... }` block after `label` (e.g. `:root {`). */
function sliceBraceBlock(content, label) {
  const idx = content.indexOf(label)
  if (idx === -1) return null
  const open = content.indexOf("{", idx)
  if (open === -1) return null
  let depth = 0
  for (let i = open; i < content.length; i++) {
    const c = content[i]
    if (c === "{") depth++
    else if (c === "}") {
      depth--
      if (depth === 0) return content.slice(open + 1, i)
    }
  }
  return null
}

function collectCustomPropNames(cssChunk) {
  const names = new Set()
  const re = /--([\w-]+)\s*:/g
  let m
  while ((m = re.exec(cssChunk))) names.add(m[1])
  return names
}

function collectVarRefs(cssChunk) {
  const refs = new Set()
  const re = /var\(\s*--([\w-]+)\s*\)/g
  let m
  while ((m = re.exec(cssChunk))) refs.add(m[1])
  return refs
}

let failed = false

function assertGlobalsThemeParity() {
  if (!fs.existsSync(GLOBALS_CSS)) {
    failed = true
    console.error("[design-contract] missing app/globals.css")
    return
  }
  const content = fs.readFileSync(GLOBALS_CSS, "utf8")
  const themeBody = sliceBraceBlock(content, "@theme inline")
  const rootBody = sliceBraceBlock(content, ":root {")
  const darkBody = sliceBraceBlock(content, ".dark {")

  if (!themeBody || !rootBody || !darkBody) {
    failed = true
    console.error(
      "[design-contract] globals.css: could not parse @theme inline, :root { }, or .dark { } blocks"
    )
    return
  }

  const defined = new Set([
    ...collectCustomPropNames(rootBody),
    ...collectCustomPropNames(darkBody),
  ])
  const refs = collectVarRefs(themeBody)

  for (const name of refs) {
    if (!defined.has(name)) {
      failed = true
      console.error(
        `[design-contract] @theme references var(--${name}) but --${name} is not defined under :root or .dark`
      )
    }
  }
}

assertGlobalsThemeParity()

const dirFiles = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)))
const files = fs.existsSync(DESIGN_SYSTEM_FILE)
  ? [...dirFiles, DESIGN_SYSTEM_FILE]
  : dirFiles

for (const file of files) {
  const rel = posixRel(file)
  const text = fs.readFileSync(file, "utf8")
  const lines = text.split("\n")

  const report = (rule, lineNo, row) => {
    failed = true
    console.error(`[design-contract] ${rule} in ${rel}:${lineNo}`)
    console.error(`  ${row.trim().slice(0, 140)}${row.length > 140 ? "…" : ""}`)
  }

  lines.forEach((row, i) => {
    const lineNo = i + 1
    FORBIDDEN_RADIUS.lastIndex = 0
    if (FORBIDDEN_RADIUS.test(row)) {
      report(
        "forbidden radius (use uiRadius from #lib/design-system)",
        lineNo,
        row
      )
    }
    FORBIDDEN_SHADOW.lastIndex = 0
    if (FORBIDDEN_SHADOW.test(row)) {
      report("forbidden shadow-2xl", lineNo, row)
    }
    FORBIDDEN_PRIMITIVE_COLOR.lastIndex = 0
    if (
      rel.startsWith("components/ui/") &&
      FORBIDDEN_PRIMITIVE_COLOR.test(row)
    ) {
      report(
        "forbidden palette color in primitive (use semantic tokens)",
        lineNo,
        row
      )
    }
    FORBIDDEN_BRAND_OPACITY_HOVER.lastIndex = 0
    if (
      rel.startsWith("components/ui/") &&
      FORBIDDEN_BRAND_OPACITY_HOVER.test(row)
    ) {
      report(
        "forbidden opacity hover on primary/secondary (use bg-primary-hover / bg-secondary-hover)",
        lineNo,
        row
      )
    }
    ARBITRARY_ROUNDED.lastIndex = 0
    if (ARBITRARY_ROUNDED.test(row) && !ARBITRARY_ROUNDED_ALLOWLIST.has(rel)) {
      report(
        "arbitrary rounded-[…] (allowlist in scripts/check-design-contract.mjs or use uiRadius)",
        lineNo,
        row
      )
    }
    ARBITRARY_SPACING.lastIndex = 0
    let spacingMatch
    while ((spacingMatch = ARBITRARY_SPACING.exec(row))) {
      if (!isSpacingTokenReference(spacingMatch[1])) {
        report(
          "forbidden arbitrary spacing literal (use Tailwind scale, p-surface-* / gap-surface-*, gap-density-*, or var(--token))",
          lineNo,
          row
        )
      }
    }

    /* Material semantics — see .cursor/rules/material-semantics.mdc §6 */
    FORBIDDEN_INLINE_BACKDROP.lastIndex = 0
    if (FORBIDDEN_INLINE_BACKDROP.test(row)) {
      report(
        "forbidden inline backdropFilter (material blur lives in app/globals.css; consume .af-material-* phase classes)",
        lineNo,
        row
      )
    }
    FORBIDDEN_INLINE_WILL_CHANGE.lastIndex = 0
    if (FORBIDDEN_INLINE_WILL_CHANGE.test(row)) {
      report(
        "forbidden inline willChange (will-change is scoped to active material phases inside app/globals.css)",
        lineNo,
        row
      )
    }
    FORBIDDEN_BACKDROP_BLUR_UTIL.lastIndex = 0
    if (FORBIDDEN_BACKDROP_BLUR_UTIL.test(row)) {
      report(
        "forbidden Tailwind backdrop-blur-[…] (use the 3-tier blur budget in app/globals.css via .af-material-* classes)",
        lineNo,
        row
      )
    }
    FORBIDDEN_BLUR_UTIL.lastIndex = 0
    if (FORBIDDEN_BLUR_UTIL.test(row)) {
      report(
        "forbidden Tailwind blur-[…] (use the 3-tier blur budget in app/globals.css via .af-material-* classes)",
        lineNo,
        row
      )
    }
    if (rel.startsWith("components/nexus/")) {
      FORBIDDEN_NEXUS_TAILWIND_BACKDROP.lastIndex = 0
      if (FORBIDDEN_NEXUS_TAILWIND_BACKDROP.test(row)) {
        report(
          "forbidden Tailwind backdrop-blur-* in Nexus (use .af-nexus-utility-bar-backdrop | .af-nexus-popover-panel | .af-nexus-round-control-backdrop in app/globals.css)",
          lineNo,
          row
        )
      }
    }
    FORBIDDEN_INFINITE_ANIMATION.lastIndex = 0
    if (FORBIDDEN_INFINITE_ANIMATION.test(row)) {
      report(
        "forbidden infinite animation (continuous motion lives in app/globals.css; pulses must settle after a few iterations)",
        lineNo,
        row
      )
    }
    FORBIDDEN_LEGACY_WATER_TOKEN.lastIndex = 0
    if (FORBIDDEN_LEGACY_WATER_TOKEN.test(row)) {
      report(
        "legacy material token --af-water-* (renamed to --af-cognition-* / --af-resolution-* / --af-blur-resolution / --af-sat-resolution / --af-depth-resolution)",
        lineNo,
        row
      )
    }
    FORBIDDEN_LEGACY_WATER_CLASS.lastIndex = 0
    if (FORBIDDEN_LEGACY_WATER_CLASS.test(row)) {
      report(
        "legacy material class .af-material-water (renamed to .af-material-cognition)",
        lineNo,
        row
      )
    }
    FORBIDDEN_LEGACY_TRANSITIONING_CLASS.lastIndex = 0
    if (FORBIDDEN_LEGACY_TRANSITIONING_CLASS.test(row)) {
      report(
        "legacy material class .af-material-transitioning (renamed to .af-material-transition)",
        lineNo,
        row
      )
    }
  })
}

if (failed) {
  console.error(`
Fix: import ui.* aliases or legacy uiRadius / uiTitle / uiTracking / uiSurfaceInset from #lib/design-system, or extend the allowlist with a short comment in PR.
Spacing rhythm: use Tailwind's spacing scale, p-surface-* / gap-surface-*, gap-density-*, or var(--token); avoid arbitrary p-[…] / gap-[…] literals.
Keep @theme inline var() references aligned with :root / .dark in app/globals.css.
`)
  process.exit(1)
}
