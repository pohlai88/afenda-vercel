# Demo surfaces — three lanes

**Public name:** Afenda Demo Showcase  
**Routes:** `/{locale}/demo/*`  
**Doctrine:** [ADR-0041](../decisions/0041-demo-showcase-three-lanes.md)

---

## Ports (local stack)

| Port | Role |
| ---- | ---- |
| **3000** | Next.js UI — open demo, portal, playground, and dev panel targets here |
| **3002** | Workflow DevKit — not for browsing ERP/portal pages |

```bash
pnpm dev          # UI on 3000
pnpm dev:stack    # workflow 3002 + UI 3000
```

---

## Lane A — Public Demo Showcase (no sign-in)

| URL | Purpose |
| --- | ------- |
| `/en/demo` | Catalog of demo pages |
| `/en/demo/employee/leave` | Employee portal leave — read-only Pattern C + usage guide |
| `/en/demo/hrm/employee-records` | Workforce directory — mirrors HRM employees list |
| `/en/demo/procurement/purchase-request` | Purchase requests — fixture list (procurement module pending) |
| `/en/demo/inventory/stock-movement` | Stock movements — fixture list (inventory ERP pending) |
| `/en/demo/workbench/shell` | AppShell regions + link to playground shell preview (dev) |

Rules: fixture data only; no mutations; banner “Demo mode — sign in to operate”.

Production: set `NEXT_PUBLIC_AFENDA_DEMO_SHOWCASE=1` on preview/marketing; off by default on production unless explicitly enabled.

---

## Lane B — Dev tenant (authenticated)

```bash
pnpm env:sync
pnpm dev:seed              # neon_auth users + demo-org membership
pnpm dev:seed:demo-erp     # portal demo-org-employee + employee + access
```

Then sign in via dev panel (**Owner**) or manually:

- `http://localhost:3000/en/p/demo-org-employee/employee/leave`

Or open the public showcase without sign-in:

- `http://localhost:3000/en/demo/employee/leave`

---

## Lane C — Engineering lab

| URL | Gate |
| --- | ---- |
| `/en/playground/shell-preview` | `NODE_ENV === "development"` |
| Simulation | `AFENDA_ENABLE_SIMULATION=1` — audit replay, not demo UI |

---

## Dev sign-in panel

- **Afenda Demo Showcase** → `/demo` (no auth)
- **Owner** → real portal leave after Lane B seed
- Footer documents `dev:seed` + `dev:seed:demo-erp` and port **3000**
