/**
 * Gate ladder help — onboarding + agent self-correction.
 * ADR-0033 · AGENTS.md §2
 */
const HELP = `
Afenda verify gate ladder (ADR-0033)
Use the LOWEST sufficient tier. Do not replay full CI after every edit.

TIER   WHEN                          COMMAND                              COST (warm)
────   ────                          ───────                              ───────────
L0     After every edit / agent task pnpm gate -- <touched-paths…>        ~15–45s
L0     Types only                    pnpm gate  |  pnpm typecheck         ~10–30s
L1     Git commit                    lint-staged (automatic)              staged files
L2     Before push / open PR         pnpm gate:push                       ~2–5 min
L3     Pre-merge / App Router risk   pnpm gate:merge                      ~5–10 min
L4     CI                            GitHub Actions — debug locally only  parallel jobs

COMMON (high frequency — no :full suffix)
  pnpm gate -- lib/features/hrm/     targeted ESLint + app typecheck (default close)
  pnpm gate                          app typecheck only
  pnpm typecheck                     app TypeScript graph
  pnpm lint:path -- <paths>          targeted ESLint only
  pnpm typecheck:test                when tests/ changed
  pnpm typecheck:scripts             when scripts/ changed

FULL (low frequency — :full or gate:*)
  pnpm typecheck:full                app + test + scripts graphs
  pnpm lint:full  (alias: pnpm lint) ~18 governance tasks + repo ESLint
  pnpm gate:push   (alias: verify:parallel)  lint + all TC + knip + test:ci + format
  pnpm gate:merge                    gate:push + next build

DRY RUN (print planned L0 commands, do not execute)
  pnpm gate:dry-run
  pnpm gate:dry-run -- lib/features/hrm/

NARROW (domain-specific — when that domain changed)
  pnpm lint:drizzle-journal          drizzle/*.sql or schema.ts
  pnpm lint:fixtures-parity          messages/en.json or fixtures
  pnpm ask-docs:check                content/ask-docs/**
  pnpm lint:design-contract          app/globals.css or design tokens

DEBUG (full test picture — lean by default)
  pnpm test:changed                  fastest — git-changed tests only + failure digest
  pnpm test:audit:changed            same, via audit entry
  pnpm test:failures                 reprint last digest (no re-run)
  pnpm test:audit                    full suite + .artifacts/vitest-failures.txt
  pnpm test:fast:node                skip jsdom project when DOM untouched
  pnpm test:audit -- --coverage      slow — before push only

FORBIDDEN edit-loop habit
  pnpm lint:full && pnpm gate:push && pnpm build && pnpm test:e2e
  → replays CI locally (~8–15+ min on Windows)

Docs: docs/decisions/0033-verify-gate-ladder-naming.md
Rules: .cursor/rules/targeted-verification.mdc
`.trimStart()

console.log(HELP)
