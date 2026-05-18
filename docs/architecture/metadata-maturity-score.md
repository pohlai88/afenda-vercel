# Metadata-driven UI — maturity score (2026-05-18)

Canonical architecture: [ADR-0026](../decisions/0026-metadata-driven-ui-architecture.md).

**Section composition (Pattern C):** separate rubric — [governed-section-composition-score.md](./governed-section-composition-score.md) (~9/10 on migrated HRM sections after Wave C4).

## Summary

| Metric               | Value                                                                      |
| -------------------- | -------------------------------------------------------------------------- |
| **Weighted score**   | **91 / 100**                                                               |
| **Band**             | Mature platform (86–100)                                                   |
| **Mass ERP default** | **Go** — Pattern B/C pilots proven; run mass rollout as a separate program |

Re-scored after score-90 gate: `governed:chart` + `governed:approval-timeline`, gallery playground, visual matrix, contacts + performance pilots, `requiresErpPermission`, dispatch OTEL spans.

## Dimension scores

| Dimension                 | Weight | Score | Notes                                                                               |
| ------------------------- | ------ | ----- | ----------------------------------------------------------------------------------- |
| Architecture & boundaries | 15%    | 10    | ADR-0026; Pattern C allowlisted; four-layer ESLint gates                            |
| Schema kernel             | 12%    | 9     | 13-type union; `requiresErpPermission` on list-surface + action-bar                 |
| Renderer coverage         | 10%    | 9     | **10/13** shipped (`chart`, `approval-timeline` added)                              |
| Automation & CI           | 12%    | 10    | Full `lint:renderer-*` + `lint:list-surface-table-imports`                          |
| Generator & DX            | 10%    | 9     | `pnpm gen governed-renderer` + dev gallery fixture editor + JSON Schema export      |
| Testing                   | 12%    | 9     | Unit tests per shipped renderer; builder tests; gallery visual matrix (280/480/720) |
| Documentation             | 8%     | 10    | ADR-0026 + AGENTS rollout playbook                                                  |
| Production adoption       | 10%    | 8     | Contacts Pattern B; performance Pattern B+C; accounting Pattern A                   |
| Feature completeness      | 6%     | 8     | ERP permission gates; OTEL dispatch spans                                           |
| Design enforcement        | 5%     | 9     | Container-query lint; gallery width presets                                         |

## Go / no-go checklist (mass rollout)

| Gate                                          | Status                                                          |
| --------------------------------------------- | --------------------------------------------------------------- |
| Weighted score ≥ 90                           | **Pass (91)**                                                   |
| Shipped renderers ≥ 10/13                     | **Pass (10)**                                                   |
| Renderer unit + visual tests for registry ids | **Pass**                                                        |
| ≥ 3 modules on Pattern B (incl. pilots)       | **Pass** (contacts, HRM performance, HRM workforce/recruitment) |
| Pattern C allowlisted + pilot                 | **Pass** (claims, performance reviews)                          |
| `pnpm verify:parallel`                        | Run before merge                                                |

## Deferred (post mass rollout)

- Mass conversion of remaining `ModulePageHeader`-only HRM pages
- Production adoption of `governed:multi-step-form`, `governed:kanban-board`, `governed:scorecard-form` beyond pilots (renderers shipped)
- Draft Drizzle → `*-surface-builders.server.ts` inferencer (`pnpm gen surface-draft`)
- Figma Code Connect per renderer
- Production low-code / stored layout JSON
