# ADR-0012 (draft): Phase 10+ governed form / detail / stepper surfaces

## Status

Draft — design reserve only; no runtime adoption gate yet.

## Context

ADR-0011 ships page chrome (headers, lists, audit panels). ERP screens still embed
ad-hoc `ModulePageHeader` and bespoke form chrome across HRM and Orbit. External
prior art (UIMF, JSON Forms, react-admin `<Resource>`) converges on:

- **Schema vs presentation** split (`governedComponentSchema` in the kernel).
- **Declarative events** (`FORM_EVENTS` + `eventHandlerMetadataSchema`).
- **Post-mutation handler hints** on `ActionResult` (`handler`, `functionsToRun`).

## Decision (target shape)

1. **Governed form** — Zod-first field list + `GovernedComponent` bindings; Server
   Actions remain the mutation boundary; metadata is built per request (RSC), not
   downloaded as opaque JSON for a client interpreter.
2. **Governed detail** — `governedDetailTabsSchema` (already shipped) becomes the
   default shell for entity surfaces (HRM employee, planner item, contact).
3. **Governed stepper** — reserved for multi-step HR flows; composes the same
   `ActionResult` envelope and event ids.

## Non-goals

See ADR-0011 amendment: no DB-stored metadata tables, no reflection-derived UI,
no raw CSS in metadata records.

## Consequences

Incremental adoption: new schemas parse today with `experimental` stability flags;
renderers and Server Actions adopt field-by-field without a flag day.
