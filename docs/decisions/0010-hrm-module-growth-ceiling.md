# ADR-0010 — HRM module growth ceiling

## Status

Accepted

## Context

The `lib/features/hrm` module is the primary workforce, payroll, compliance, and lifecycle surface. Unbounded growth risks reviewability, test surface, and generator alignment. This ADR records a **soft file-count ceiling** and the trigger for splitting work across modules.

## Decision

- **Current baseline:** approximately **146** TypeScript / TSX files under `lib/features/hrm/` (count varies with merges; treat as order-of-magnitude governance, not CI enforcement).
- **Soft cap:** **175** files in that tree before a change must either stay within the cap or execute the split trigger below.
- **Split trigger:** When a proposed feature would push the tree **past 175** files, the owning PR must either (a) refactor to stay under the cap, or (b) open a **sibling module** (for example `lib/features/hrm-performance/` for dedicated performance products) **or** extract a coherent subdomain (for example `lib/features/hrm-compliance/`) with a new public barrel and AGENTS.md contract update in the same change.
- **Enforcement:** `scripts/check-agent-contract.mjs` does **not** auto-fail on file count; reviewers use this ADR as a **merge checklist** item for large HRM diffs.

## Consequences

- New capabilities should prefer extending existing registry-driven surfaces (`HRM_CAPABILITIES`, `#lib/hrm-dashboard.shared`) before adding parallel constants.
- Crossing the ceiling without an ADR amendment and directory contract update is treated as an architecture process violation, not a silent expansion.

## Related

- [`ADR-0009`](./0009-capability-generators-canonical-birth-mechanism.md) — canonical birth mechanism for new ERP slices.
- `AGENTS.md` §6 — module vocabulary and public import doors.
