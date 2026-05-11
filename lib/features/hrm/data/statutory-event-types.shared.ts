/**
 * Maps each `StatutoryPackType` to the canonical outbound event-type string
 * registered in `ORG_EVENT_TYPES` (see `lib/features/org-admin/constants.ts`
 * and AGENTS.md §IAM audit policy + draft hrm-v2 §4.5).
 *
 * Shared (no `server-only`) so both Server Actions and RSC composers can
 * resolve which event type a given pack type publishes to without pulling
 * the org-admin server graph.
 */

import type { StatutoryPackType } from "./payroll-rule-pack.server"

export const STATUTORY_PACK_TO_EVENT_TYPE: Record<StatutoryPackType, string> = {
  epf_monthly: "erp.hrm.statutory.epf.submitted",
  socso_monthly: "erp.hrm.statutory.socso.submitted",
  eis_monthly: "erp.hrm.statutory.eis.submitted",
  pcb_monthly: "erp.hrm.statutory.pcb.submitted",
  ea_annual: "erp.hrm.statutory.ea.published",
  borang_e_annual: "erp.hrm.statutory.ea.published",
}

export function eventTypeForStatutoryPack(packType: string): string | null {
  return (
    (STATUTORY_PACK_TO_EVENT_TYPE as Record<string, string | undefined>)[
      packType
    ] ?? null
  )
}
