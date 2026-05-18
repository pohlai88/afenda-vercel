/**
 * Invariants for App Router error surfaces — operational boundary doctrine.
 *
 * Rules enforced:
 *  1. Every error.tsx must be in the approved allowlist (operational shells only).
 *  2. Every error.tsx must start with "use client".
 *  3. No error.tsx may import server-only modules or packages.
 *  4. global-error.tsx must import globals.css and start with "use client".
 *
 * To add a new boundary: pass the decision-rule checklist in
 * .cursor/rules/error-boundaries.mdc, then add the approved path to
 * APPROVED_BOUNDARIES below.
 *
 * @see .cursor/rules/app-router-contracts.mdc — decision rule and doctrine
 * @see AGENTS.md §5 — route error files
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const appDir = path.join(root, "app")

/**
 * Allowlist of approved error.tsx locations.
 *
 * Each entry is a forward-slash path relative to the repo root.
 * Add only at durable operational ownership boundaries (org shell,
 * dashboard shell, org admin / platform console, auth/IAM shell, major
 * product surface with independent recovery ownership).
 *
 * Do NOT add module-level boundaries (widgets, cards, tables, forms,
 * charts, contacts, etc.) — use Suspense or inline fallback instead.
 */
const APPROVED_BOUNDARIES = new Set([
  // Last-resort crash surface (replaces root layout — must stay minimal)
  "app/global-error.tsx",
  // Root catch-all (outside [locale])
  "app/error.tsx",
  // Locale shell
  "app/(main)/[locale]/error.tsx",
  // Auth shell
  "app/(main)/[locale]/(auth)/error.tsx",
  // IAM shell
  "app/(main)/[locale]/(iam)/error.tsx",
  // Platform console (Afenda global admin)
  "app/(main)/[locale]/platform/error.tsx",
  // Org shell (all tenant surfaces)
  "app/(main)/[locale]/o/[orgSlug]/error.tsx",
  // Dashboard shell (all ERP modules)
  "app/(main)/[locale]/o/[orgSlug]/apps/error.tsx",
  // Org admin workbench
  "app/(main)/[locale]/o/[orgSlug]/admin/error.tsx",
  // Multi-org console (org picker)
  "app/(main)/[locale]/console/error.tsx",
  // Portal shell (PortalShell chrome — separate from WorkbenchShell)
  "app/(main)/[locale]/p/[portalSlug]/error.tsx",
  // Employee portal self-service segment (under PortalShell + portal-auth group)
  "app/(main)/[locale]/p/[portalSlug]/(portal-auth)/employee/error.tsx",
  // Orbit (Planner) surface — org apps segment with dedicated command layer
  "app/(main)/[locale]/o/[orgSlug]/apps/orbit/error.tsx",
])

const SERVER_ONLY_PKG_RE =
  /\bfrom\s+["']server-only["']|\bimport\s+["']server-only["']/
const IMPORT_FROM_RE = /\bfrom\s+["']([^"']+)["']/g

function walkErrorFiles(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "api"
      ) {
        continue
      }
      out.push(...walkErrorFiles(abs))
    } else if (entry.name === "error.tsx") {
      out.push(abs)
    }
  }
  return out
}

function firstCodeLine(content) {
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim()
    if (t !== "" && !t.startsWith("//")) return t
  }
  return ""
}

function assertNoForbiddenImports(relPath, content) {
  if (SERVER_ONLY_PKG_RE.test(content)) {
    throw new Error(`${relPath}: must not import "server-only"`)
  }
  let m
  IMPORT_FROM_RE.lastIndex = 0
  while ((m = IMPORT_FROM_RE.exec(content)) !== null) {
    if (m[1].includes(".server")) {
      throw new Error(
        `${relPath}: must not import server-only modules (${m[1]})`
      )
    }
  }
}

let failed = false
function fail(message) {
  failed = true
  console.error(`[route-error-files] ${message}`)
}

// ── global-error.tsx ────────────────────────────────────────────────────────
const globalPath = path.join(appDir, "global-error.tsx")
if (!fs.existsSync(globalPath)) {
  fail("missing app/global-error.tsx")
} else {
  const src = fs.readFileSync(globalPath, "utf8")
  try {
    assertNoForbiddenImports("app/global-error.tsx", src)
  } catch (e) {
    fail(e.message)
  }
  if (!/["']\.\/globals\.css["']/.test(src)) {
    fail(
      'app/global-error.tsx must import app globals (e.g. import "./globals.css")'
    )
  }
  const line1 = firstCodeLine(src)
  if (line1 !== `"use client"` && line1 !== `'use client'`) {
    fail('app/global-error.tsx must start with "use client"')
  }
}

// ── nested error.tsx files ───────────────────────────────────────────────────
for (const abs of walkErrorFiles(appDir)) {
  const rel = path.relative(root, abs).split(path.sep).join("/")

  // Allowlist gate — the core of the operational boundary doctrine
  if (!APPROVED_BOUNDARIES.has(rel)) {
    fail(
      `${rel}: not an approved operational boundary.\n` +
        `  Handle module-level failure with Suspense, inline fallback,\n` +
        `  Promise.allSettled, or unstable_catchError instead.\n` +
        `  If this IS a durable shell boundary, pass the decision-rule checklist\n` +
        `  in .cursor/rules/error-boundaries.mdc and add it to APPROVED_BOUNDARIES\n` +
        `  in scripts/check-route-error-files.mjs.`
    )
    continue
  }

  const src = fs.readFileSync(abs, "utf8")

  const line1 = firstCodeLine(src)
  if (line1 !== `"use client"` && line1 !== `'use client'`) {
    fail(`${rel}: must start with "use client"`)
  }

  try {
    assertNoForbiddenImports(rel, src)
  } catch (e) {
    fail(e.message)
  }
}

if (failed) {
  process.exit(1)
}
