# ADR-0041 — Afenda Demo Showcase: three lanes for public tour, dev E2E, and engineering lab

| Field | Value |
| ----- | ----- |
| **Status** | Accepted |
| **Date** | 2026-05-20 |
| **Relates to** | [ADR-0035 — Three-layer surface IDE anti-drift](0035-three-layer-surface-ide-anti-drift.md) · [ADR-0020 — Portal control plane](0020-portal-control-plane.md) · [`.cursor/rules/portal-directory.mdc`](../../.cursor/rules/portal-directory.mdc) |
| **Implements in code** | `app/(main)/[locale]/demo/**` · `lib/features/demo/` · `components2/demo/` · `RouteSurface: "demo"` · `scripts/seed-demo-erp.mjs` |
| **Operator doc** | [`docs/dev/demo-surfaces.md`](../dev/demo-surfaces.md) |

---

## 1. Context

Local development mixed three concerns:

1. **Public product understanding** — prospects and new staff need a login-free tour.
2. **Authenticated dev E2E** — developers need real `/p/*` and `/o/*` after seed.
3. **Engineering lab** — playground and simulation must not be mistaken for customer-facing demo data.

The dev sign-in panel targeted `/p/demo-org-employee/employee/leave` but `pnpm dev:seed` only populated `neon_auth`, causing `notFound()` from portal guards. Browsing on port **3002** (workflow dev) instead of **3000** (UI) compounded confusion.

---

## 2. Decision

### 2.1 Three lanes

| Lane | URL / tool | Auth | Data |
| ---- | ----------- | ---- | ---- |
| **A — Demo Showcase** | `/{locale}/demo/*` | None | Fixtures in `lib/features/demo/data/` |
| **B — Dev tenant** | `/{locale}/p/*`, `/o/*` | Neon Auth | Real DB after `dev:seed` + `dev:seed:demo-erp` |
| **C — Lab** | `/playground/*`, simulation | Dev / env | Mocks / audit replay |

Lane A is a **Product Operating Manual**: product tour, usage guidelines (`DemoGuidePanel`), and implementation reference (Pattern C list surfaces). It is not anonymous `/p/*`.

### 2.2 Lane A rules

- No Server Actions, no `#lib/db`, no session guards on demo routes.
- Reuse governed list builders from `#features/hrm/server`; do not import production portal pages with mutations.
- `proxy.ts` does not require a session cookie for `/demo`.
- Production enablement: `NEXT_PUBLIC_AFENDA_DEMO_SHOWCASE=1`; development is always allowed.

### 2.3 Lane B rules

- `pnpm dev:seed:demo-erp` after `pnpm dev:seed` inserts portal, employee, and portal access for `demo-org-employee`.
- UI and `AUTH_URL` for seeding target **port 3000**.

---

## 3. Consequences

- New three-layer product `demo` (ADR-0035) alongside `playground` and `legal-docs`.
- AGENTS.md quickstart gains a Demo Showcase row.
- Contract test `tests/unit/demo-route-contract.test.ts` guards thin routes and forbidden imports.

---

## 4. Rejected alternatives

- Public anonymous `/p/demo-org-employee/*` — IDOR and cache risk.
- Using simulation replay as demo UI fixtures — wrong subsystem.
- Renaming module `showcase` or `tour` — IDE drift under PRIORITY #2.
