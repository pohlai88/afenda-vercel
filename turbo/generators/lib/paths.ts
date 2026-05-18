/**
 * Canonical path helpers for generator templates.
 *
 * Every generator output path goes through these helpers so:
 *   - Module folder shape matches AGENTS.md §6 (`lib/features/<slug>/`).
 *   - Route placement matches the locale-first surface
 *     (`app/(main)/[locale]/o/[orgSlug]/apps/<slug>/`).
 *   - ADRs land in `docs/decisions/` only.
 *   - i18n keys are inserted into `messages/en.json` only.
 *
 * Paths are POSIX style (forward slashes) — Plop normalizes for the host OS.
 */

import path from "node:path"

/**
 * Repo root anchor.
 *
 * `turbo gen` always invokes from the repository root and the generator
 * code runs in a CommonJS context (see `turbo/generators/tsconfig.json` —
 * `module: "commonjs"` is required because `turbo gen`'s TS loader rejects
 * `moduleResolution: "bundler"`). `process.cwd()` is therefore the most
 * portable anchor — it works in both ESM and CJS without needing
 * `import.meta.url` / `__dirname` gymnastics.
 */
export const REPO_ROOT = path.resolve(process.cwd())

/** Absolute path inside the repo (POSIX-style return, Plop normalizes). */
export function absPath(rel: string): string {
  return path.join(REPO_ROOT, rel)
}

/** `lib/features/<slug>/` directory for a feature module. */
export function moduleDir(slug: string): string {
  return `lib/features/${slug}`
}

/** `lib/features/<slug>/<rel>` — composes module-internal file paths. */
export function moduleFile(slug: string, rel: string): string {
  return `${moduleDir(slug)}/${rel}`
}

/**
 * Route directory under `app/(main)/[locale]/o/[orgSlug]/apps/<slug>/`.
 * Used for capability route placement only (ADR-0029).
 */
export function appsRouteDir(slug: string): string {
  return `app/(main)/[locale]/o/[orgSlug]/apps/${slug}`
}

/** Module audit-contract file: `<module>.contract.ts` at the module root. */
export function contractFile(slug: string): string {
  return moduleFile(slug, `${slug}.contract.ts`)
}

/** Unit test placement for a module. */
export function unitTestFile(slug: string, testName: string): string {
  return `tests/unit/${slug}-${testName}.test.ts`
}

/** `docs/decisions/NNNN-<kebab-title>.md`. */
export function adrFile(adrNumber: string, kebabTitle: string): string {
  return `docs/decisions/${adrNumber}-${kebabTitle}.md`
}
