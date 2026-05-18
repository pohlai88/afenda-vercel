# ADR-0007 — Turborepo (single-package) for verify pipeline caching

| Field | Value |
| ----- | ----- |
| **Status** | Accepted |
| **Date** | 2026-05-12 |
| **Supersedes** | None |
| **Does not supersede** | ESLint / Prettier / TypeScript incremental caches (remain nested inside Turbo tasks). Next.js framework Build Cache on Vercel (orthogonal layer — see §2.4). Tool semantics (`pnpm lint:*`, Vitest, Knip) unchanged. |
| **Implements in code** | Root [`turbo.json`](../../turbo.json); [`package.json`](../../package.json) scripts (`lint`, `verify`, `verify:parallel`, `verify:ci`, `lint:eslint`) via [`scripts/turbo-with-env.mjs`](../../scripts/turbo-with-env.mjs); [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (`pnpm verify:ci`, **`actions/cache`** on **`.turbo`**, optional Remote Cache secrets); [`scripts/check-agent-contract.mjs`](../../scripts/check-agent-contract.mjs) (`turbo.json` in `REQUIRED_FILES` + `ROOT_TOOLING_FILES`); [`.gitignore`](../../.gitignore) (`/.turbo/`); [`AGENTS.md`](../../AGENTS.md) §2–§4 / toolchain narrative; [`.env.config.example`](../../.env.config.example) Turborepo env placeholders |
| **Related docs** | [Vercel: Turborepo](https://vercel.com/docs/monorepos/turborepo) · [Turborepo: Single-package workspaces](https://turborepo.dev/docs/guides/single-package-workspaces) · [Remote caching integrity](https://turborepo.com/docs/core-concepts/remote-caching#artifact-integrity-and-authenticity-verification) |

---

## 1. Context

The repository runs a heavy **pre-merge gate**: agent-contract checks, Drizzle journal parity, fixtures/message parity, ESLint, design-contract script, three TypeScript graphs (`tsc` app / tests / scripts), Knip, Vitest `test:ci` with coverage, and Prettier `format:check`. Developers and CI repeated the full sequence even when only unrelated files changed, or when no source changed between iterations.

[Turborepo](https://turborepo.dev/) officially supports **single-package workspaces**: task-level content hashing, parallel scheduling, local filesystem cache, and optional **Vercel Remote Cache** — without adopting a monorepo layout.

Requirements:

- **No semantic change** to lint/type/test/copy thresholds — only orchestration and cache replay.
- **Fail-safe caching**: failed tasks must not poison cache entries consumers rely on for correctness.
- **Contract governance**: cache-graph edits must fail CI when governance docs drift (same discipline as other mechanical checks).

---

## 2. Decision

### 2.1 Adopt Turborepo single-package mode at the repo root

- Configuration lives in **[`turbo.json`](../../turbo.json)** with `ui: "tui"` and default local cache directory **`./.turbo/`** (gitignored), matching Vercel’s canonical [non-monorepo example](https://github.com/vercel/turborepo/tree/main/examples/non-monorepo).
- Each verify step is a **named task** aligned with **`package.json` scripts** so `turbo run <script>` invokes the same commands as before.

### 2.2 Task graph and inputs

- **Narrow inputs** for small, deterministic checks (`lint:agent-contract`, `lint:drizzle-journal`, `lint:fixtures-parity`, `lint:design-contract`) so unrelated edits skip those tasks when safe.
- **Broad inputs** (`$TURBO_DEFAULT$` + config files) for ESLint, the three typechecks, Knip, `test:ci`, and `format:check` so any material repo change invalidates appropriately.
- **`turbo.json` is an input** to `lint:agent-contract` so changing the graph re-runs the agent-contract script immediately.

### 2.3 Outputs declared for cache restoration

Restore ESLint / Prettier / `tsc` incremental artifacts and Vitest coverage outputs under **`.artifacts/`** where configured (`eslintcache`, `tsbuildinfo`, coverage trees), so warm runs replay stdout **and** restore machine-local caches.

### 2.4 Environment variable hashing discipline

- **`globalPassThroughEnv`** lists tokens and ambient vars (**`TURBO_TOKEN`**, **`TURBO_TEAM`**, **`CI`**, **`PATH`**, etc.) so **rotating credentials does not invalidate unrelated task hashes**.
- The **`build`** task declares **`env`** keys that affect compiled Next.js output (**`NEXT_PUBLIC_*`**, Sentry upload knobs, **`OTEL_SERVICE_NAME`**, **`DATABASE_URL`**) and canonical outputs **`.next/**` with **`!.next/cache/**`** excluded — aligned with Vercel’s **NEXTJS_NO_TURBO_CACHE** conformance guidance ([docs](https://vercel.com/docs/conformance/rules/NEXTJS_NO_TURBO_CACHE)).

**Important:** Vercel’s **framework Build Cache** (e.g. `.next/cache`, dependency caches on the platform) remains **separate** from Turborepo’s task cache. Both may coexist ([Vercel: Turborepo](https://vercel.com/docs/monorepos/turborepo)).

### 2.5 Scripts wired through Turbo

- **`pnpm lint`** → **`node scripts/turbo-with-env.mjs run …`** over the five lint tasks (atomic + cacheable **`lint:eslint`**).
- **`pnpm verify`** / **`pnpm verify:parallel`** → same wrapper → full verify graph with **`--output-logs=new-only`**.
- **`pnpm verify:ci`** → same wrapper → **`--concurrency=8 --output-logs=errors-only`** for CI-friendly parallelism and log volume.
- **`turbo-with-env.mjs`** loads **`.env.local`** when present (**`override: false`**) so optional **`TURBO_*`** applies locally; CI/GitHub Actions inject the same names via secrets or job env without being overwritten.

---

## 3. Consequences

### Positive

- Repeat **`pnpm verify`** / **`pnpm lint`** with **no input changes** replays cached successful tasks in milliseconds locally.
- Tasks run **in parallel** where Turbo allows; wall-clock drops on multi-core machines versus strictly sequential shell `&&` chains.

### Negative / operational

- Developers must treat **`turbo.json`** as part of the **release contract** (enforced by agent-contract `REQUIRED_FILES`).
- **Disk**: `.turbo/` grows with history of cached tasks (gitignored).
- **Windows / Vitest coverage**: parallel Turbo tasks plus Vitest’s coverage `.tmp` directory have exhibited occasional races; Vitest config already warns against external deletion of coverage temps. Flaky DOM tests remain independent correctness issues.

---

## 4. Deferred and follow-on work

### 4.1 Completed after initial Phase 1 acceptance

| Item | Notes |
| ---- | ----- |
| **GitHub Actions consolidation** | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs **`pnpm verify:ci`** as a single verify gate after install; **`actions/cache`** restores **`.turbo`**; job env sets **`TURBO_TELEMETRY_DISABLED=1`** and forwards optional **`TURBO_*`** secrets. |
| **CI telemetry** | **`TURBO_TELEMETRY_DISABLED=1`** on the **`verify`** job ([workflow](../../.github/workflows/ci.yml)). |

### 4.2 Still requires maintainer / platform action

The following remain **documented follow-ons** — not blockers for local **`pnpm verify`**:

| Item | Rationale |
| ---- | --------- |
| **Phase 2 — Vercel Remote Cache (full)** | Developers still run **`pnpm turbo login`** + **`pnpm turbo link`** for linked laptops. CI requires repository secrets **`TURBO_TOKEN`**, **`TURBO_TEAM`** (slug); optional **`TURBO_REMOTE_CACHE_SIGNATURE_KEY`** ([signing](https://turborepo.com/docs/core-concepts/remote-caching#artifact-integrity-and-authenticity-verification)). Until secrets exist, Remote Cache is off; **`actions/cache`** on **`.turbo`** still speeds repeated CI runs on the same runner image. |
| **Phase 3 — Turbo-wrap `next build` in primary CI/deploy path** | **`pnpm verify`** does not depend on **`build`**. CI still invokes **`pnpm run build`** directly after verify. Moving deploy pipelines to **`turbo run build`** (and aligning Vercel **Remote Cache** with framework cache) is deferred until env parity is validated. |
| **Test stability hardening** | Fix flaky RTL specs (e.g. Nexus utility messenger DOM tests) and any Vitest coverage concurrency edge cases — orthogonal to Turbo adoption but improves **`pnpm verify`** reliability. |

---

## 5. Compliance

- **AGENTS.md** remains the operator-facing command reference; it mirrors this ADR’s phased rollout.
- **`scripts/check-agent-contract.mjs`** must keep **`turbo.json`** in **`REQUIRED_FILES`** when this ADR is accepted.

---

## 6. Revision history

| Date | Change |
| ---- | ------ |
| 2026-05-12 | Initial acceptance — Phase 1 local cache + script wiring; Phase 2–3 deferred per §4 |
| 2026-05-19 | Gate ladder naming — see [ADR-0033](./0033-verify-gate-ladder-naming.md) (`gate`, `lint:full`, `typecheck:full`) |
| 2026-05-12 | **`turbo-with-env.mjs`**, CI **`pnpm verify:ci`** + **`.turbo`** cache + telemetry env; §4 split into completed vs still-open follow-ons |
