# Orbit Benchmark Strategy: Beat Linear, Not Jira

## Summary

Use **Linear** as the primary benchmark. It is the closest serious comparator because it is fast, opinionated, triage-heavy, keyboard-driven, and built around execution flow rather than broad configurable process. Jira and Asana are too broad to chase first; Motion and Todoist are too personal-productivity oriented.

Winning strategy: make Orbit the **Linear for ERP operations**, but with a stronger moat: every unit of work is causally tied to ERP truth, audit evidence, operational pressure, and automation outcomes. Do not compete by copying generic issue tracking. Compete by making Orbit the place where Afenda answers: **what operational truth needs action now, why, who owns it, what evidence proves it, and what closed the loop.**

References used:
[Linear Triage](https://linear.app/docs/triage?tabs=36dbc0f97e0d), [Linear Projects](https://linear.app/docs/projects), [Linear Initiatives](https://linear.app/docs/initiatives?noRedirect=1), [Linear Customer Requests](https://linear.app/docs/customer-requests), [Linear AI Agents](https://linear.app/docs/agents-in-linear), [Linear Docs Overview](https://linear.app/docs)

## Strategic Positioning

- Benchmark target: `Linear`.
- Category Orbit should own: `ERP Operational Execution`.
- Avoided category: generic project management, kanban boards, personal task planning.
- Core wedge: Linear tracks work; Orbit explains and proves operational causality.
- Product promise: “From ERP signal to accountable resolution with evidence.”

Primary differentiators to build around:

- `Signals` as first-class pressure intake, not just created tasks.
- `PlannerLink` / ERP attachment as first-class causal evidence.
- `Pressure` ranking instead of manual priority-only sorting.
- `Sessions`, comments, attachments, notices, and audit history as an execution record.
- Automation failure handling as a native operations loop.

## Development Strategy

- Phase 1: Linear-Parity Operator Core
  Build the missing high-frequency workflow polish: triage inbox, command-first create/promote/assign/schedule, keyboard shortcuts, batch transitions, saved views for all surfaces, fast filters, and clearer detail panes. Orbit should feel as fast as Linear for daily execution before expanding into management layers.

- Phase 2: Orbit Causality Moat
  Add an “Evidence Graph” around each item and signal: ERP links, related signals/items, audit events, automation notices, attachments, comments, and sessions in one causality timeline. This is where Orbit should clearly beat Linear.

- Phase 3: Operational Programs
  Add a lightweight planning layer above items without becoming Asana/Jira: `OperationalProgram` or `OrbitProgram` to group work by ERP outcome, incident, compliance cycle, import run, payroll close, month-end process, or HRM compliance window. Keep it queue/timeline-first, not board-first.

- Phase 4: Automation And Agent Loop
  Benchmark Linear’s AI agent direction, but adapt it for ERP accountability. Agents can propose, summarize, correlate, draft resolution evidence, or execute bounded workflow actions, but a human owner remains accountable. Store every agent action as audit-linked activity.

- Phase 5: Executive And Control Views
  Add dashboards for blocked work, aging pressure, recurring failures, unresolved automation notices, SLA breach risk, and module-level operational health. This is not portfolio theater; it should surface where business operations are degrading.

## Key Product Additions

- Add `Orbit Triage` as a dedicated surface for unprocessed signals, automation failures, and imported operational pressure.
- Add `Orbit Programs` for ERP outcome grouping across items/signals/sessions/links.
- Add `Orbit Evidence Graph` inside detail panels.
- Add batch operations for assign, transition, suppress, promote, schedule, and close notices.
- Add typed saved views across `queue`, `today`, `timeline`, `signals`, `sessions`, and `links`.
- Add operator-ready empty/error/loading states for every new surface.
- Add role-aware controls for admin-only notice closure and future program governance.

## Public Interfaces And Types

- Add `PlannerProgram` / `OrbitProgram` only if the first implementation needs grouping across multiple items/signals; otherwise keep grouping as saved views.
- Add `PlannerTriageRule` for deterministic routing of incoming signals by module, class, pressure, and linked ERP entity.
- Extend detail query outputs to include an evidence graph shape rather than forcing UI components to compose unrelated lists manually.
- Keep `PlannerSignal`, `PlannerItem`, `PlannerSession`, and `PlannerLink` as separate primitives.
- Preserve existing locale-first route helpers and App Router Server Component boundaries.

## Test Plan

- Unit tests for triage rule matching, pressure ordering, evidence graph composition, and tenant scoping.
- Route tests for org and personal Orbit surfaces, including locale-aware paths.
- Component/render tests for triage empty state, evidence graph, program detail, and permission-gated controls.
- E2E operator loop covering signal intake, triage, promote, assign, ERP link, session, evidence attachment, resolution, and audit-visible closure.
- Regression checks for `pnpm typecheck`, `pnpm lint:eslint`, focused planner Vitest, `pnpm build`, and Orbit Playwright. Existing unrelated repo failures should be tracked separately before claiming full production readiness.

## Assumptions

- Orbit should not try to match Jira configurability or Asana portfolio breadth in the next development cycle.
- Linear is the best benchmark because it represents the strongest version of fast, opinionated execution software.
- Orbit wins by becoming more causally trustworthy than Linear, not by becoming a clone with ERP labels.
- Board/kanban views remain secondary and should not define Orbit’s product identity.
