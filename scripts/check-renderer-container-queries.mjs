#!/usr/bin/env node
/**
 * Container-query coverage report for governed renderers (ADR-0025 §1).
 *
 * Lint-level enforcement (`afenda/renderer-placement-contract` in
 * `eslint.config.mjs`) BLOCKS new viewport breakpoints (`sm:`, `md:`, `lg:`,
 * ...) inside `components2/metadata/renderers/**`. That rule prevents the
 * regression vector but says nothing about renderers that simply never
 * adopted container queries.
 *
 * This script reports adoption coverage so the team can see, at a glance:
 *
 *   - Which renderers declare an `@container` boundary somewhere in their
 *     JSX (✔ adopted)
 *   - Which renderers contain `@sm:` / `@md:` / `@lg:` etc. breakpoints
 *     (✔ container-relative geometry)
 *   - Which renderers have no container-relative declarations at all
 *     (○ container-naive — may still be correct if the renderer has no
 *     responsive geometry, but worth a manual review)
 *
 * Exit code is 0 unless a renderer SIMULTANEOUSLY (a) has zero `@container`
 * and zero `@<size>:` breakpoints AND (b) contains explicit `grid-cols-*`
 * or `flex-row` declarations — that combination is geometry-without-context
 * and almost always a bug. Pure layout-free renderers (single Card, single
 * span) are fine.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const RENDERERS_DIR = path.join(ROOT, "components2/metadata/renderers")
const REGISTRY = path.join(ROOT, "components2/metadata/registry.ts")

/**
 * Parse the registry once to discover which renderer ids carry
 * `acceptedNatures: []`. Those are container-only renderers (section, stack,
 * empty) — they use `flex-col` / `flex-row` for their own structural purpose,
 * not for responsive geometry, so the responsive-geometry-without-container
 * heuristic does not apply to them.
 */
function loadContainerOnlyRendererIds() {
  const src = fs.readFileSync(REGISTRY, "utf8")
  const block = src.match(
    /AFENDA_GOVERNED_RENDERER_CONTRACTS\s*=\s*\{([\s\S]*?)\}\s*as const satisfies/
  )
  if (!block) return new Set()
  const ids = new Set()
  const entryRegex =
    /(?:"([^"]+)"|([a-zA-Z][\w-]*))\s*:\s*\{\s*acceptedNatures\s*:\s*\[\s*\]\s*,/g
  for (const match of block[1].matchAll(entryRegex)) {
    ids.add(match[1] ?? match[2])
  }
  return ids
}

const CONTAINER_ONLY_RENDERER_IDS = loadContainerOnlyRendererIds()

function listRendererFiles() {
  return fs
    .readdirSync(RENDERERS_DIR)
    .filter((name) => name.endsWith(".renderer.tsx"))
    .sort()
}

function analyse(src) {
  const hasContainerBoundary = /@container\b/.test(src)
  const containerBreakpoints =
    src.match(/@(?:xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl):/g) ?? []
  const hasResponsiveGeometry =
    /\b(?:grid-cols-\d|flex-row|flex-col|inline-grid|inline-flex|columns-\d|space-x-|space-y-)\b/.test(
      src
    )
  return {
    hasContainerBoundary,
    containerBreakpointCount: containerBreakpoints.length,
    hasResponsiveGeometry,
  }
}

const reports = []
const errors = []

for (const fileName of listRendererFiles()) {
  const fullPath = path.join(RENDERERS_DIR, fileName)
  const src = fs.readFileSync(fullPath, "utf8")
  const analysis = analyse(src)
  const rendererId = fileName.replace(/\.renderer\.tsx$/, "")
  reports.push({ rendererId, ...analysis })

  if (
    !analysis.hasContainerBoundary &&
    analysis.containerBreakpointCount === 0 &&
    analysis.hasResponsiveGeometry &&
    !CONTAINER_ONLY_RENDERER_IDS.has(rendererId)
  ) {
    errors.push(
      `${rendererId}: has responsive geometry (grid/flex/columns) but no @container boundary or @<size>: breakpoints. ADR-0025 §1 — renderers must declare their container.`
    )
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const lines = [
  "",
  "Governed renderer — container-query coverage",
  "",
  "  legend:  ✔ adopts container queries   ○ container-naive   · container-only (registry-declared)",
  "",
]

for (const r of reports) {
  const isContainerOnly = CONTAINER_ONLY_RENDERER_IDS.has(r.rendererId)
  const symbol = isContainerOnly
    ? "·"
    : r.hasContainerBoundary || r.containerBreakpointCount > 0
      ? "✔"
      : "○"
  const detail = [
    isContainerOnly ? "container-only (no nature)" : null,
    r.hasContainerBoundary ? "@container" : null,
    r.containerBreakpointCount > 0
      ? `${r.containerBreakpointCount} breakpoint(s)`
      : null,
    r.hasResponsiveGeometry && !r.hasContainerBoundary && !isContainerOnly
      ? "responsive geometry"
      : null,
  ]
    .filter(Boolean)
    .join(" · ")
  lines.push(`  ${symbol}  ${r.rendererId.padEnd(20)} ${detail}`)
}

console.log(lines.join("\n"))

if (errors.length > 0) {
  console.error("\ncheck-renderer-container-queries: FAIL")
  for (const e of errors) {
    console.error(`error ${e}`)
  }
  process.exit(1)
}

console.log("\ncheck-renderer-container-queries: OK")
