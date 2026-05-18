# Governed section composition score (Pattern C)

**Platform/kernel maturity:** [metadata-maturity-score.md](./metadata-maturity-score.md) (91/100 — renderer + schema + CI).

**This document** scores **one ERP block** built with `GovernedPatternCListSection` — shell, permissions, single render path, trailing metadata.

Canonical recipe: [ADR-0026 § Pattern C](../decisions/0026-metadata-driven-ui-architecture.md).

---

## Two layers (do not conflate)

| Layer | Measures | Typical score |
| --- | --- | --- |
| **Platform / kernel** | Renderers, Zod, generators, gallery, CI | **~91/100** |
| **Section composition** | One Pattern C block on a production route | **~9.8/10** after Pattern C 9.8 polish |

---

## Rubric

| # | Criterion | Points | Evidence |
| --- | --- | --- | --- |
| 1 | Single section primitive (`GovernedPatternCListSection`) | 1 | No hand-rolled `Card` + parse + table fork |
| 2 | Permission gate before render | 1 | `parentAccessAllowed` + `resolveConfiguredPermission` → `requiresErpPermission` |
| 3 | Invalid config path | 1 | Zod failure → `GovernedEmpty` error variant |
| 4 | Empty path | 1 | Parsed `rows.length === 0` → `GovernedEmpty` via `surface.empty` |
| 5 | Ready / empty from parsed rows | 1 | Single `ListSurfaceTable` path; `data-governed-list-state` + structured render log |
| 6 | Trailing metadata (`trailingAction` on rows) | 1 | Wave C3 — builders encode hidden/disabled/ready |
| 7 | Disabled reason UX | 1 | `GovernedTrailingActionSlot` + tooltip |
| 8 | Domain builder owns list config | 1 | `*-list-surface.server.ts`, `ListSurfaceRendererConfigurationInput` |
| 9 | E2E smoke | 1 | `tests/e2e/governed-pattern-c-section.spec.ts` + dev gallery |
| 10 | No duplicate permission branches in section | 1 | Section reads `surfaceRow.trailingAction`, not re-implements ERP matrix |

**Target for mass Pattern C rollout:** **≥ 9.4/10** per section; **10/10** when list kernel criteria below are met.

### List renderer kernel (10/10)

| Criterion | Evidence |
| --- | --- |
| Unified empty + ready render | `ListSurfaceTable` only — no `GovernedComponentRenderer` fork |
| `surfaceKey` on section + list | `data-testid` + `data-governed-surface-key` |
| Density / nature / columns trace | `data-governed-table-density`, `data-governed-data-nature`, `data-governed-columns-id` |
| Row + trailing diagnostics | `data-testid` per row; `data-trailing-action-state` on trailing cells |
| Structured server log (dev / opt-in) | `logGovernedListSurfaceRender` — deduped per request via `React.cache`; `GOVERNED_LIST_SURFACE_DIAGNOSTICS=1` |

---

## Reference implementations (2026-05-18)

| Module | Section | Score (est.) |
| --- | --- | --- |
| Onboarding | `hrm-onboarding-section.tsx` | 9.8 |
| Claims recent | `claim-recent-table.tsx` | 9.8 |
| Leave pending | `leave-pending-inbox.tsx` | 9.8 |
| Benefits / training / offboarding dashboard | C2 migrations | 9.5–9.8 |
| Performance cycles / reviews | `performance-cycles-section.tsx`, `performance-reviews-section.tsx` | 9.8 |
| Skills catalog | `hrm-skills-catalog-section.tsx` | 9.8 |

---

## Verification

| Gate | Command / path |
| --- | --- |
| Dev fixtures | `/en/dev/pattern-c-section-gallery` |
| Playwright smoke | `pnpm test:e2e -- tests/e2e/governed-pattern-c-section.spec.ts` |
| Unit (trailing metadata) | `pnpm test:fast -- tests/unit/governed-surface/list-surface-trailing-action.test.ts` |
| Unit (list identity / diagnostics) | `pnpm test:fast -- tests/unit/governed-surface/list-surface-identity.test.ts` |

---

## Wave C program status

| Phase | Status |
| --- | --- |
| C1 — `GovernedSurfaceSectionCard` + onboarding pilot | Done |
| C2 — HRM Pattern C rollout | Done |
| C2.5 — deferred surfaces | Done |
| C3 — trailing `action` metadata + `disabledReason` | Done |
| C4 — gallery + Playwright + composition score doc | Done |
| C5 — performance + skills Pattern C completion | Done |
| C6 — claim-recent-table + portal embedded helper alignment | Done |

### Onboarding empty header UX

When `rows.length === 0` and read access is allowed, `hrm-onboarding-section` uses **empty copy in the Card header** (`emptyTitle` / `emptyBody`) while `surface.empty` renders the in-body muted empty state — intentional dual emphasis, not a second render path.
