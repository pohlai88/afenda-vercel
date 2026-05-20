/**
 * Registry of "full" local commands — expensive repo-wide gates.
 * Wired through scripts/confirm-human-full.mjs (TTY + YES) and deny-forbidden-shell.mjs.
 * Authority: AGENTS.md §2 — Human approval for full commands.
 */

export const LINT_FULL_TURBO_ARGS = [
  "run",
  "lint:agent-contract",
  "lint:drizzle-journal",
  "lint:route-error-files",
  "lint:public-lynx-contract",
  "lint:fixtures-parity",
  "lint:eslint",
  "lint:design-contract",
  "lint:ask-docs-links",
  "lint:ask-docs-prose",
  "lint:ask-docs-quality",
  "lint:components2-renderers",
  "lint:renderer-contracts",
  "lint:renderer-container-queries",
  "lint:renderer-skeleton-parity",
  "lint:renderer-fixtures",
  "lint:list-surface-table-imports",
  "lint:feature-table-imports",
  "--output-logs=new-only",
]

export const VERIFY_TURBO_ARGS = [
  "run",
  ...LINT_FULL_TURBO_ARGS.slice(1, -1),
  "typecheck:lib-db",
  "typecheck:platform",
  "typecheck:test",
  "typecheck:scripts",
  "knip",
  "test:ci",
  "format:check",
  "--output-logs=new-only",
]

export const VERIFY_NO_TEST_TURBO_ARGS = [
  "run",
  ...LINT_FULL_TURBO_ARGS.slice(1, -1),
  "typecheck:lib-db",
  "typecheck:platform",
  "typecheck:test",
  "typecheck:scripts",
  "knip",
  "format:check",
  "--concurrency=8",
  "--output-logs=errors-only",
]

/** @typedef {{ pnpmLabel: string, tier: string, cost: string, summary: string, l0: string }} FullCommandMeta */

/** @type {Record<string, FullCommandMeta>} */
export const FULL_COMMAND_META = {
  lint: {
    pnpmLabel: "pnpm lint (alias lint:full)",
    tier: "L2",
    cost: "~1–3 min",
    summary: "Full Turbo lint stack",
    l0: "pnpm gate -- <touched-paths>",
  },
  "lint:full": {
    pnpmLabel: "pnpm lint:full",
    tier: "L2",
    cost: "~1–3 min",
    summary: "Full Turbo lint stack (~18 governance + repo ESLint)",
    l0: "pnpm gate -- <touched-paths>",
  },
  "typecheck:full": {
    pnpmLabel: "pnpm typecheck:full",
    tier: "L2",
    cost: "~1–5 min",
    summary: "App + test + scripts TypeScript graphs",
    l0: "pnpm gate:typecheck  |  pnpm typecheck:test when tests/ changed",
  },
  knip: {
    pnpmLabel: "pnpm knip",
    tier: "L2",
    cost: "~30s–2 min",
    summary: "Full-repo dead-code / unused export scan",
    l0: "Defer until pre-push; never after each task",
  },
  "test:ci": {
    pnpmLabel: "pnpm test:ci",
    tier: "L2",
    cost: "~3–10 min",
    summary: "Full Vitest suite with coverage thresholds",
    l0: "pnpm test:fast -- tests/unit/<files>",
  },
  "test:coverage": {
    pnpmLabel: "pnpm test:coverage",
    tier: "L2",
    cost: "~3–10 min",
    summary: "Full Vitest run with coverage (no CI merge step)",
    l0: "pnpm test:fast -- tests/unit/<files>",
  },
  "test:audit": {
    pnpmLabel: "pnpm test:audit",
    tier: "L2",
    cost: "~3–10 min",
    summary: "Full unit suite with failure digest",
    l0: "pnpm test:changed  |  pnpm test:failures",
  },
  build: {
    pnpmLabel: "pnpm build",
    tier: "L3",
    cost: "~2–8 min",
    summary: "Production Next.js build",
    l0: "Not for edit loop — human pre-merge only",
  },
  "test:e2e": {
    pnpmLabel: "pnpm test:e2e",
    tier: "L3",
    cost: "~8–15+ min",
    summary: "Production build + full Playwright suite",
    l0: "pnpm test:fast for unit behavior",
  },
  "test:e2e:smoke": {
    pnpmLabel: "pnpm test:e2e:smoke",
    tier: "L3",
    cost: "~5–10 min",
    summary: "Production build + @smoke Playwright",
    l0: "pnpm test:fast for unit behavior",
  },
  "verify:no-test": {
    pnpmLabel: "pnpm verify:no-test",
    tier: "L2",
    cost: "~2–5 min",
    summary: "CI-shaped verify without test:ci (lint + typecheck + knip + format)",
    l0: "pnpm gate -- <paths>",
  },
  "integrity:static": {
    pnpmLabel: "pnpm integrity:static",
    tier: "L2",
    cost: "~3–8 min",
    summary: "lint:full + typecheck:full + knip + format:check",
    l0: "pnpm gate -- <paths> + pnpm gate:typecheck",
  },
  "verify:artifact": {
    pnpmLabel: "pnpm verify:artifact",
    tier: "L3",
    cost: "~5–12 min",
    summary: "lint:full + typecheck + production build",
    l0: "L0 gates while coding",
  },
  smoke: {
    pnpmLabel: "pnpm smoke",
    tier: "L3",
    cost: "~5–12 min",
    summary: "Alias verify:artifact",
    l0: "L0 gates while coding",
  },
  verify: {
    pnpmLabel: "pnpm verify",
    tier: "L2",
    cost: "~5–15 min",
    summary: "Full local verify (lint + all TC + knip + test:ci + format)",
    l0: "pnpm gate -- <paths>",
  },
  "verify:parallel": {
    pnpmLabel: "pnpm verify:parallel",
    tier: "L2",
    cost: "~5–15 min",
    summary: "Full local verify (same graph as verify)",
    l0: "pnpm gate -- <paths>",
  },
  "gate:push": {
    pnpmLabel: "pnpm gate:push",
    tier: "L2",
    cost: "~5–15 min",
    summary: "Pre-push full verify",
    l0: "pnpm gate -- <paths>",
  },
  "gate:merge": {
    pnpmLabel: "pnpm gate:merge",
    tier: "L3",
    cost: "~8–20 min",
    summary: "Full verify + production build",
    l0: "L0 while coding; human once before merge",
  },
}

/** Keys agents must never run without a human terminal. */
export const FULL_COMMAND_KEYS = Object.keys(FULL_COMMAND_META)
