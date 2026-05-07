---
name: V8 coverage RTL ratchet
overview: Strict 95% on IAM-sensitive shared paths immediately; global coverage ratcheted from measured baseline toward 80%; no coverage.all yet; App Router via Playwright; KISS jsdom + RTL.
todos:
  - id: phase1-thresholds
    content: Enable coverage.thresholds at 95% for lib/auth/**/*.shared.ts and lib/auth/callback-path.ts only (Phase 1)
  - id: phase2-global-ratchet
    content: Set global executed-coverage floor to current baseline (~60–65%), document ratchet ladder 65→70→75→80; do not enable coverage.all
  - id: agents-docs
    content: Paste agreed AGENTS.md coverage + RTL block (below); note App Router covered by Playwright not Vitest for now
  - id: ci-verify
    content: Ensure pnpm test:ci passes after thresholds; adjust baseline number after first coverage run
---

# V8 coverage, Testing Library, and ratcheting governance

## Verdict (anti–fake governance)

Do **not** jump straight to global **80%** while the repo is ~**61%** executed coverage — that produces CI noise, not quality.

**Policy:** strict where IAM truth is deterministic; **progressive** breadth via ratchet.

---

## Threshold table

| Area | Threshold | Notes |
|------|-----------:|-------|
| Global **executed** coverage | Start at **current baseline** (~60–65%), then **ratchet** | Steps **65 → 70 → 75 → 80** as tests land |
| `lib/auth/**/*.shared.ts` | **95%** | Phase 1 — ship immediately |
| `lib/auth/callback-path.ts` | **95%** | Phase 1 — ship immediately |
| App Router `app/**` pages | **Not** a Vitest coverage target for now | **Playwright** owns route-level confidence |

---

## Phase 1 — Strict where it matters

Add **95%** thresholds immediately for:

```txt
lib/auth/**/*.shared.ts
lib/auth/callback-path.ts
```

Identity-sensitive and deterministic — justified strict coverage.

Implementation: Vitest `coverage.thresholds` glob keys + `{ 95: true }` or explicit per-metric 95 ([Vitest docs](https://vitest.dev/config/#coverage-thresholds)).

---

## Phase 2 — Ratchet global coverage

- Measure real baseline after `pnpm test:coverage` (expect ~**60–65%** on executed graph).
- Set **global** `lines` / `statements` / `functions` / `branches` to that floor (or slightly rounded down so CI is stable).
- **Ratchet** upward in small PRs: **65 → 70 → 75 → 80**.
- **Do not** enable **`coverage.all: true`** yet — it counts untouched files as 0% and punishes the repo before breadth exists.

---

## coverage.all and include

- Keep default behavior: coverage reflects **executed** modules unless/until policy matures.
- Defer **`coverage.include`** + **`coverage.all: true`** until intentional breadth exists.

---

## RTL / jsdom — KISS (no projects)

- **`// @vitest-environment jsdom`** at top of DOM tests only.
- **Do not** add Vitest **`projects`** until DOM suites justify the split (same as existing AGENTS stance).

Use **Testing Library** only for:

- Auth client islands  
- Form behavior  
- Component accessibility  
- OTP input behavior  
- Password visibility toggle  
- Loading / error states  

Keep **pure `lib/**`** tests **Node-only**.

Prefer naming: **`*.dom.test.tsx`** for DOM specs.

---

## AGENTS.md wording (paste into §2 / Testing directory contract)

```md
Vitest is Node-first by default. Use `// @vitest-environment jsdom`
only for small DOM/RTL tests, preferably named `*.dom.test.tsx`.
Do not introduce Vitest projects until DOM suites become large enough to
justify the split.

Coverage uses V8. IAM-sensitive shared auth files require 95% coverage.
Global coverage is ratcheted from the current baseline toward 80%; do not
enable `coverage.all` until the repo has enough intentional coverage breadth.

App Router surfaces are validated with Playwright for now; do not treat
`app/**` as a Vitest coverage gate until the strategy changes.
```

*(Last paragraph added to encode “pages → Playwright” explicitly.)*

---

## CI / tooling

- Keep `@vitest/coverage-v8` aligned with Vitest.
- Optional: upload `coverage/lcov.info` as a GitHub Actions artifact — non-blocking.

---

## Verification

- `pnpm test:ci` passes with Phase 1 (95% globs) + Phase 2 global floor at measured baseline.
- Sensitive globs stay green; global ratchet documented for follow-up PRs.

---

## Governance framing

> **Strict on auth truth, progressive on product breadth.**
