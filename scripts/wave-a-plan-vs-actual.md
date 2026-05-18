# Wave A — Plan vs actual (closed 2026-05-18)

Scope: **Skill-guided Phase 1 polish** on existing pilots (not big-bang Tier 1 delete).

Skills applied: **shadcn-metadata**, **frontend-design-review**, **frontend-skill** (Apps), **tailwind-v4-shadcn**, **Next.js MCP** (dev server + route/error probe).

**Status: closed.** Wave B (Tier 1 migration) **closed 2026-05-18** — see `scripts/legacy-ui-inventory.md` (Tier 1: 0).

**Wave C (section composition)** — C1+C2 shipped: `GovernedSurfaceSectionCard`, `GovernedPatternCListSection`, onboarding + benefits + training + offboarding dashboard.

**Wave C2.5 (deferred Pattern C surfaces)** — **closed 2026-05-18**: policies leave types, claim/leave inboxes, leave-my-panel, attendance recent events, offboarding employee panel, training session roster. Primitive extensions: `layout="embedded"`, `loadError`, `contentAfterList`.

---

## Planned vs shipped

| # | Plan item | Status |
|---|-----------|--------|
| 1 | Contacts `table-only` — single chrome owner | **Done** |
| 2 | `GovernedEmpty` forbidden (not `<p>`) | **Done** |
| 3 | Compact density + `af-material-opaque` on list tables | **Done** |
| 4 | Stat-card M3 typescale | **Done** |
| 5 | Shape-matched contacts + performance loading | **Done** |
| 6 | shadcn `NativeSelect` (not raw `<select>`) | **Done** |
| 7 | Remove empty `<p>` bypass (claims recent) | **Done** |
| 8 | Module page header tokens + gap | **Done** |
| 9 | Contacts i18n (`Dashboard.Contacts`) | **Done** |
| 10 | Performance forbidden i18n | **Done** |
| 11 | Locale-aware list cells (`useLocale`) | **Done** |
| 12 | ESLint + typecheck + unit test | **Done** |
| 13 | Design review artifact | **Done** — `scripts/wave-a-design-review.md` |

---

## Wave B — closed 2026-05-18

| Item | Status |
|------|--------|
| `scripts/legacy-ui-inventory.md` | **Tier 1: 0** (Tier 3 allowlist: calendars, matrix, detail, portal library) |
| `scripts/check-feature-table-imports.mjs` | **In CI** — `lint:feature-table-imports` |
| `scripts/check-list-surface-table-imports.mjs` | Pattern C allowlist extended (training, onboarding, portal, offboarding) |
| Skills / training / leave / benefits / policies | **Done** — Pattern C sections + builders |
| Employee portal (12 pages) | **Done** — `employee-portal-governed-table.tsx` + shared builders |
| Onboarding / offboarding panels | **Done** — governed list surfaces |

---

## Wave C2.5 — closed 2026-05-18

| Surface | Status |
|---------|--------|
| `policies-leave-types-section.tsx` | **Done** — `GovernedPatternCListSection` + archive toggle |
| `claim-pending-inbox.tsx` / `claim-exception-inbox.tsx` | **Done** — embedded + `loadError` |
| `leave-pending-inbox.tsx` / `leave-recent-table.tsx` | **Done** — embedded |
| `leave-my-panel.tsx` | **Done** — embedded balances + history |
| `attendance-recent-events.tsx` | **Done** — embedded + correction trailing |
| `offboarding-panel.tsx` | **Done** — `GovernedSurfaceSectionCard` + per-instance embedded lists |
| `training-session-roster-section.tsx` | **Done** — async blocks + `contentAfterList` assign form |

---

## Wave C4 — closed 2026-05-18

| Deliverable | Status |
|-------------|--------|
| Dev gallery `/en/dev/pattern-c-section-gallery` | **Done** — forbidden, invalid, empty, trailing-disabled |
| `data-testid` on `GovernedPatternCListSection` | **Done** — `governed-list-section:{surfaceKey}` |
| Playwright smoke | **Done** — `tests/e2e/governed-pattern-c-section.spec.ts` |
| Section composition score doc | **Done** — `docs/architecture/governed-section-composition-score.md` |
| HRM route mounts (onboarding + leave pending) | **Done** — production `data-testid` assertions |

---

## Wave C5 — closed 2026-05-18

| Surface | Status |
|---------|--------|
| `performance-cycles-section.tsx` | **Done** — `GovernedPatternCListSection` + trailing metadata |
| `performance-reviews-section.tsx` | **Done** |
| `hrm-performance-page.tsx` | **Done** — thin page; create-cycle card only |
| `hrm-skills-catalog-section.tsx` | **Done** |
| `hrm-skills-page.tsx` | **Done** — catalog + matrix panel |
| E2E performance + skills mounts | **Done** |

**Remaining Pattern C direct imports:** `employee-portal-governed-table.tsx` only (portal shared helper).

---

## Wave C3 — closed 2026-05-18

| Deliverable | Status |
|-------------|--------|
| `listSurfaceRowTrailingActionSchema` on `ListSurfaceRow` | **Done** — `hidden` \| `disabled` \| `ready` + `disabledReason` + optional `ActionDescriptor` |
| `resolveListSurfaceRowTrailingAction` (shared) | **Done** |
| `resolveListSurfaceRowTrailingActionForErpPermission` (server) | **Done** |
| `GovernedTrailingActionSlot` (`#features/governed-surface/client`) | **Done** — tooltip on disabled |
| Pilots: onboarding, leave pending inbox, leave my-history cancel | **Done** |
| Unit tests | **Done** — `tests/unit/governed-surface/list-surface-trailing-action.test.ts` |

---

## Next.js MCP

- Dev server port 3000 — MCP connected when `pnpm dev` running
- Routes: `dashboard/contacts`, `dashboard/hrm/performance`, `dashboard/hrm/training`
- `get_errors` needs browser session for runtime UI errors

---

## Files touched (Wave A)

```
lib/features/governed-surface/schemas/list-surface-renderer.schema.ts
lib/features/governed-surface/components/module-page-header.tsx
lib/features/contacts/data/contacts-surface-builders.server.ts
lib/features/contacts/components/contacts-page.tsx
messages/en.json (Dashboard.Contacts)
lib/features/hrm/talent-management/performance-appraisals/components/hrm-performance-page.tsx
lib/features/hrm/talent-management/performance-appraisals/components/performance-cycle-row-actions.client.tsx
app/(main)/[locale]/o/[orgSlug]/apps/hrm/performance/loading.tsx
lib/features/hrm/payroll-compensation/expenses-reimbursement/components/claim-recent-table.tsx
components2/metadata/renderers/list-surface-table.tsx
components2/metadata/renderers/list-surface.renderer.tsx
components2/metadata/renderers/stat-card.renderer.tsx
components2/metadata/renderers/list-surface-cell.client.tsx
app/(main)/[locale]/o/[orgSlug]/dashboard/contacts/loading.tsx
tests/unit/lib/features/contacts/contacts-surface-builders.test.ts
scripts/wave-a-design-review.md
```

---

## Expected VQ impact (pilot routes)

| Dimension | Before → after (estimate) |
|-----------|---------------------------|
| Page hierarchy | 5.5 → **7** |
| Spacing / density | 6 → **7.5** |
| Semantic / states | 7 → **8.5** |
| Loading UX | 6 → **7.5** |
| **Weighted VQ (pilots)** | ~62 → **~68–70** |

Full **~72–78** requires Wave B completion + Wave C (toolbar, charts, Playwright smoke).
