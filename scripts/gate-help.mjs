/**
 * Gate ladder help — onboarding + agent self-correction.
 * ADR-0033 · ADR-0042 · AGENTS.md §2
 */
const HELP = `
Afenda verify gate ladder (ADR-0033, ADR-0042)
Use the LOWEST sufficient tier. Do not replay full CI after every edit.

TIER   WHEN                          COMMAND                              COST (warm)
────   ────                          ───────                              ───────────
L0     After every edit / agent task pnpm gate -- <touched-paths…>        ESLint only (seconds)
L0     Before push (types)           pnpm gate:typecheck                  ~10s–minutes (warm/cold)
L0     Types only                    pnpm gate  |  pnpm typecheck         app graph
L1     Git commit                    lint-staged (automatic)              staged files
L2     Before push / open PR         pnpm gate:push                       ~2–5 min
L3     Pre-merge / App Router risk   pnpm gate:merge                      ~5–10 min
L4     CI                            GitHub Actions — debug locally only  parallel jobs

IMPORTANT: paths narrow ESLint only by default. Typecheck uses tsc -b slices
(lib/db composite + platform graph). Use IDE while editing; gate:typecheck before push.

COMMON (high frequency — no :full suffix)
  pnpm gate -- lib/features/hrm/     targeted ESLint only (default L0)
  pnpm gate -- <paths> --typecheck lint:path + slice tsc -b (hrm → platform only)
  pnpm gate:lint -- <paths>          ESLint only (explicit)
  pnpm gate:typecheck                full solution typecheck
  pnpm gate                          full solution typecheck (no paths)
  pnpm lint:path -- <paths>          targeted ESLint only
  pnpm lint:typed -- <paths>         L2 typed ESLint (projectService)
  pnpm typecheck:turbo               Turbo parallel typecheck graphs (CI)
  pnpm typecheck:lib-db              lib/db slice only
  pnpm typecheck:platform            typegen + platform graph
  pnpm typecheck:tsgo                tsgo pilot (non-blocking; tsc authority)
  pnpm typecheck:compare             tsc vs tsgo exit parity (before enforcing tsgo)
  pnpm typecheck:test                when tests/ changed
  pnpm typecheck:scripts             when scripts/ changed
  pnpm typecheck:profile             split typegen vs tsc -b timing
  pnpm typecheck:diagnostics         tsc -b + --extendedDiagnostics

FULL (low frequency — :full or gate:*)
  pnpm typecheck:full                app + test + scripts graphs
  pnpm lint:full  (alias: pnpm lint) ~18 governance tasks + repo ESLint
  pnpm gate:push   (alias: verify:parallel)  lint + all TC + knip + test:ci + format
  pnpm gate:merge                    gate:push + next build

DRY RUN (print planned L0 commands, do not execute)
  pnpm gate:dry-run
  pnpm gate:dry-run -- lib/features/hrm/
  pnpm gate:dry-run -- lib/features/hrm/ --typecheck

NARROW (domain-specific — when that domain changed)
  pnpm lint:drizzle-journal          drizzle/*.sql or schema.ts
  pnpm lint:fixtures-parity          messages/en.json or fixtures
  pnpm ask-docs:check                content/ask-docs/**
  pnpm lint:design-contract          app/globals.css or design tokens

DEBUG (full test picture — lean by default)
  pnpm test:changed                  fastest — git-changed tests only + failure digest
  pnpm test:audit:changed            same, via audit entry
  pnpm test:failures                 reprint last digest (no re-run)
  pnpm artifacts:init                after clone/pull — layout + vitest junction
  pnpm test:audit                    full suite + .artifacts/reports/vitest-failures.txt
  pnpm test:fast:node                skip jsdom project when DOM untouched
  pnpm test:audit -- --coverage      slow — before push only

FORBIDDEN edit-loop habit
  pnpm lint:full && pnpm gate:push && pnpm build && pnpm test:e2e
  → replays CI locally (~8–15+ min on Windows)

Docs: docs/decisions/0033-verify-gate-ladder-naming.md
      docs/decisions/0042-typescript-gate-performance.md
Rules: .cursor/rules/targeted-verification.mdc
`.trimStart()

console.log(HELP)
