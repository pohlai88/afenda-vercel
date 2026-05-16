# ADR-0022: HRM policies capability scope

**Status:** Accepted  
**Date:** 2026-05-16

## Context

Mid-market HRIS products expose handbook policies, procedure documents, and employee acknowledgement workflows. Afenda already models **leave policies** (`hrm_leave_type`, accrual tiers) and **compliance evidence** separately. The `policies` capability in `HRM_CAPABILITIES` must not duplicate leave accrual or statutory pack delivery.

## Decision

The **policies** capability covers:

1. **Written HR policies** — versioned policy documents (handbook sections, code-of-conduct, remote-work policy) stored as governed documents with effective dates.
2. **Acknowledgement workflows** — per-employee acknowledgement records tied to policy version + evidence in `iam_audit_event` (`erp.hrm.policy.acknowledge`).
3. **Procedure documents** — operational procedures that employees must read before execution (distinct from compliance statutory submissions).

### Out of scope (owned elsewhere)

| Concern | Owner |
| --- | --- |
| Leave accrual / tiers | `leave` capability + `leave-policy.schema.ts` |
| Statutory filing packs | `compliance` capability |
| Contract / boarding signatures | `signatures` + boarding bridge |
| Generic document vault | `documents` capability |

### Schema direction (incremental)

- Reuse `hrm_document` + `documentType = policy` for storage until volume warrants `hrm_policy_version`.
- Acknowledgements link `(organizationId, employeeId, documentId, acknowledgedAt)` with audit on commit.

### RBAC

- Read: `hrm.policy.read`
- Publish version: `hrm.policy.update`
- Acknowledge (portal): employee subject + `hrm.policy.acknowledge` on self

## Consequences

- Leave-type Zod schemas remain the unit-test anchor for policy **validation grammar** until dedicated policy tables ship.
- Compliance evidence store receives acknowledgement metadata references, not duplicate policy blobs.
- Help-docs and ask-docs gain a `policies` section describing acknowledgement vs leave-policy distinction.
