#!/usr/bin/env tsx
/**
 * Codemod — Phase 1 rail schema prune (Working Memory Rail migration).
 *
 * Mechanically strips the three deleted slot fields (`pills`, `context`,
 * `description`) from the four rail-slot builders and the account layout,
 * plus the dead `recentContexts` / `signals` properties from the
 * `buildAccountRailSlotsV2` call site. The `WorkbenchRail` shell schema in
 * `components/workbench/left-nav-rail/workbench-rail.schema.ts` is the governance
 * kernel — builders are pure mappers, so any property they emit that the
 * kernel no longer accepts is dead surface to be removed mechanically.
 *
 * Design:
 *   - Idempotent. Running twice produces the same output as running once.
 *   - Predicate-based deletions:
 *       * `pills`   : drop in any object literal in target files
 *                     (only the rail identity literal uses it).
 *       * `context` : drop in any object literal in target files
 *                     (only the rail slots return literal uses it).
 *       * `description`
 *                   : drop ONLY when the literal also has an `ariaLabel`
 *                     sibling (= the rail labels literal). Section/nav
 *                     descriptions remain untouched.
 *       * `recentContexts`, `signals`
 *                   : drop ONLY from the object-literal argument of
 *                     `buildAccountRailSlotsV2(...)` call expressions.
 *
 * Usage:
 *   pnpm exec tsx scripts/refactors/2026-05-12-rail-schema-prune.ts            # dry-run
 *   pnpm exec tsx scripts/refactors/2026-05-12-rail-schema-prune.ts --apply    # write
 *
 * Exit codes:
 *   0 — no changes needed (apply or dry-run).
 *   0 — apply succeeded (with or without changes).
 *   1 — dry-run found pending changes (use --apply to commit them).
 *   2 — internal error (file missing, parse failure).
 */

import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  Node,
  Project,
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
} from "ts-morph"

// ---------------------------------------------------------------------------
// Resolve repo root (this file lives at scripts/refactors/<name>.ts)
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..", "..")

// ---------------------------------------------------------------------------
// Target spec
// ---------------------------------------------------------------------------

type ObjectLiteralRule = {
  property: string
  /**
   * Optional siblings that MUST exist for the deletion to fire. Use this to
   * narrow `description` to rail-labels literals (which always include
   * `ariaLabel`) without touching section/nav metadata literals.
   */
  requireSiblings?: readonly string[]
}

type CallArgRule = {
  callName: string
  properties: readonly string[]
}

type FileTarget = {
  /** Repo-relative path. */
  path: string
  /** Property deletions to apply to ANY object literal in this file. */
  objectLiteralRules: readonly ObjectLiteralRule[]
  /** Property deletions to apply only inside the named call's first argument. */
  callArgRules?: readonly CallArgRule[]
}

const TARGETS: readonly FileTarget[] = [
  {
    path: "lib/features/hrm/data/hrm-rail-slots.ts",
    objectLiteralRules: [{ property: "pills" }, { property: "context" }],
  },
  {
    path: "lib/features/org-admin/data/org-admin-rail-slots.ts",
    objectLiteralRules: [{ property: "pills" }, { property: "context" }],
  },
  {
    path: "lib/features/platform-admin/data/platform-admin-rail-slots.ts",
    objectLiteralRules: [{ property: "pills" }, { property: "context" }],
  },
  {
    path: "app/[locale]/(iam)/account/_components/account-rail-slots.ts",
    objectLiteralRules: [{ property: "pills" }, { property: "context" }],
  },
  {
    path: "app/[locale]/(iam)/account/layout.tsx",
    objectLiteralRules: [
      // Only the rail labels literal — every consumer of this property in
      // sections / nav items uses different sibling shapes.
      { property: "description", requireSiblings: ["ariaLabel"] },
    ],
    callArgRules: [
      {
        callName: "buildAccountRailSlotsV2",
        properties: ["recentContexts", "signals"],
      },
    ],
  },
] as const

// ---------------------------------------------------------------------------
// Mode handling
// ---------------------------------------------------------------------------

const APPLY = process.argv.includes("--apply")

type FileChange = {
  path: string
  removed: { property: string; line: number; preview: string }[]
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

const DELETABLE_PROPERTY_KINDS = new Set<SyntaxKind>([
  SyntaxKind.PropertyAssignment,
  SyntaxKind.ShorthandPropertyAssignment,
])

function literalHasDeletableProperty(
  literal: ObjectLiteralExpression,
  name: string
): boolean {
  const prop = literal.getProperty(name)
  return prop ? DELETABLE_PROPERTY_KINDS.has(prop.getKind()) : false
}

function applyObjectLiteralRules(
  source: SourceFile,
  rules: readonly ObjectLiteralRule[],
  change: FileChange
): void {
  // Walk all object literals from inner-most outward so structural edits
  // don't invalidate sibling lookups. ts-morph forEachDescendant traversal
  // remains stable across removals as long as we don't recurse into a
  // removed subtree (we never re-enter a node after deleting one of its
  // children).
  source.forEachDescendant((node) => {
    if (!Node.isObjectLiteralExpression(node)) return

    for (const rule of rules) {
      const prop = node.getProperty(rule.property)
      if (!prop) continue
      if (!DELETABLE_PROPERTY_KINDS.has(prop.getKind())) continue

      if (rule.requireSiblings) {
        const ok = rule.requireSiblings.every((sib) =>
          literalHasDeletableProperty(node, sib)
        )
        if (!ok) continue
      }

      const line = prop.getStartLineNumber()
      const preview = prop.getText().trim().split(/\r?\n/)[0]!.slice(0, 80)
      change.removed.push({ property: rule.property, line, preview })
      prop.remove()
    }
  })
}

function applyCallArgRules(
  source: SourceFile,
  rules: readonly CallArgRule[],
  change: FileChange
): void {
  for (const rule of rules) {
    source.forEachDescendant((node) => {
      if (!Node.isCallExpression(node)) return
      const expr = node.getExpression()
      if (expr.getText() !== rule.callName) return
      const firstArg = node.getArguments()[0]
      if (!firstArg || !Node.isObjectLiteralExpression(firstArg)) return

      for (const propName of rule.properties) {
        const prop = firstArg.getProperty(propName)
        if (!prop) continue
        if (!DELETABLE_PROPERTY_KINDS.has(prop.getKind())) continue
        const line = prop.getStartLineNumber()
        const preview = prop.getText().trim().split(/\r?\n/)[0]!.slice(0, 80)
        change.removed.push({ property: propName, line, preview })
        prop.remove()
      }
    })
  }
}

// ---------------------------------------------------------------------------
// Per-file processing
// ---------------------------------------------------------------------------

function processTarget(project: Project, target: FileTarget): FileChange {
  const absolute = path.join(REPO_ROOT, target.path)
  const source = project.addSourceFileAtPath(absolute)
  const before = source.getFullText()
  const change: FileChange = { path: target.path, removed: [] }

  applyObjectLiteralRules(source, target.objectLiteralRules, change)
  if (target.callArgRules) {
    applyCallArgRules(source, target.callArgRules, change)
  }

  if (change.removed.length === 0) {
    return change
  }

  // ts-morph's structural removals leave the source organized but may keep
  // formatting drift; rely on Prettier (`pnpm format`) to canonicalize after
  // apply. We still save here so the diff is observable.
  if (APPLY) {
    source.saveSync()
  } else {
    // Roll back in-memory change so dry-run does not leak state across files.
    source.replaceWithText(before)
  }

  return change
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const project = new Project({
    // Codemod does not need the full type checker — keep parsing fast.
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    useInMemoryFileSystem: false,
  })

  const changes: FileChange[] = []
  for (const target of TARGETS) {
    changes.push(processTarget(project, target))
  }

  const touched = changes.filter((c) => c.removed.length > 0)
  if (touched.length === 0) {
    console.log("[rail-schema-prune] no pending changes — idempotent.")
    process.exit(0)
  }

  const banner = APPLY
    ? "[rail-schema-prune] applied"
    : "[rail-schema-prune] dry-run — pass --apply to write"
  console.log(banner)
  for (const change of touched) {
    console.log(`  ${change.path}`)
    for (const removal of change.removed) {
      console.log(
        `    -L${removal.line}  ${removal.property}: ${removal.preview}`
      )
    }
  }

  process.exit(APPLY ? 0 : 1)
}

try {
  main()
} catch (err) {
  console.error("[rail-schema-prune] internal error", err)
  process.exit(2)
}
