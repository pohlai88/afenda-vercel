/**
 * Maps each `StatutoryPackType` to the canonical outbound event-type string
 * registered in `ORG_EVENT_TYPES` (see `lib/features/org-admin/constants.ts`
 * and AGENTS.md §IAM audit policy + draft hrm-v2 §4.5).
 *
 * Shared (no `server-only`) so both Server Actions and RSC composers can
 * resolve which event type a given pack type publishes to without pulling
 * the org-admin server graph.
 */

import type { StatutoryPackType } from "../../../payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server"

export const STATUTORY_PACK_TO_EVENT_TYPE: Record<StatutoryPackType, string> = {
  epf_monthly: "erp.hrm.statutory.epf.submitted",
  socso_monthly: "erp.hrm.statutory.socso.submitted",
  eis_monthly: "erp.hrm.statutory.eis.submitted",
  pcb_monthly: "erp.hrm.statutory.pcb.submitted",
  hrdf_monthly: "erp.hrm.statutory.hrdf.submitted",
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

/**
 * Maps each `StatutoryPackType` to the canonical IAM audit action emitted
 * when the bureau acknowledges receipt — mirrors `STATUTORY_PACK_TO_EVENT_TYPE`
 * with `submitted | published` replaced by `acknowledged`. Distinct from the
 * outbound event taxonomy because acknowledgement does not (currently) trigger
 * outbound delivery — the audit row is the entire artifact.
 *
 * EA + Borang E both collapse to `erp.hrm.statutory.ea.acknowledged` to mirror
 * the existing `published` mapping for those annual packs.
 */
export const STATUTORY_PACK_TO_ACK_EVENT_TYPE: Record<
  StatutoryPackType,
  string
> = {
  epf_monthly: "erp.hrm.statutory.epf.acknowledged",
  socso_monthly: "erp.hrm.statutory.socso.acknowledged",
  eis_monthly: "erp.hrm.statutory.eis.acknowledged",
  pcb_monthly: "erp.hrm.statutory.pcb.acknowledged",
  hrdf_monthly: "erp.hrm.statutory.hrdf.acknowledged",
  ea_annual: "erp.hrm.statutory.ea.acknowledged",
  borang_e_annual: "erp.hrm.statutory.ea.acknowledged",
}

export function ackEventTypeForStatutoryPack(packType: string): string | null {
  return (
    (STATUTORY_PACK_TO_ACK_EVENT_TYPE as Record<string, string | undefined>)[
      packType
    ] ?? null
  )
}

// ---------------------------------------------------------------------------
// Phase 3I: external authority lookup
// ---------------------------------------------------------------------------

/**
 * Canonical bureau / authority for each statutory pack — *derived*, not stored.
 *
 * We intentionally do NOT denormalize this onto `hrm_compliance_evidence`:
 * `packType` already determines authority with full information equivalence
 * (same `epf_monthly` always maps to KWSP; a Singapore subsidiary would use
 * `cpf_monthly` + a different mapping). Storing it would create a sync
 * footgun without adding lineage.
 *
 * Malaysian authorities (collated from KWSP / PERKESO / LHDN public docs):
 *   - EPF  -> KWSP    (Kumpulan Wang Simpanan Pekerja)
 *   - SOCSO -> PERKESO (Pertubuhan Keselamatan Sosial)
 *   - EIS  -> PERKESO (administered alongside SOCSO)
 *   - PCB  -> LHDN    (Lembaga Hasil Dalam Negeri / IRBM)
 *   - EA   -> LHDN    (employee tax statement)
 *   - Borang E -> LHDN (employer tax return)
 */
export const STATUTORY_PACK_TO_AUTHORITY: Record<StatutoryPackType, string> = {
  epf_monthly: "KWSP",
  socso_monthly: "PERKESO",
  eis_monthly: "PERKESO",
  pcb_monthly: "LHDN",
  hrdf_monthly: "HRD_CORP",
  ea_annual: "LHDN",
  borang_e_annual: "LHDN",
}

export function authorityForStatutoryPack(packType: string): string | null {
  return (
    (STATUTORY_PACK_TO_AUTHORITY as Record<string, string | undefined>)[
      packType
    ] ?? null
  )
}

// ---------------------------------------------------------------------------
// Phase 3I: acknowledgement source enum (shared so both Server Actions and
// Client UI render the same labels without re-declaring the union).
// ---------------------------------------------------------------------------

export const ACKNOWLEDGEMENT_SOURCES = [
  "manual",
  "webhook",
  "api",
  "import",
] as const
export type AcknowledgementSource = (typeof ACKNOWLEDGEMENT_SOURCES)[number]

export function isAcknowledgementSource(
  value: string | null | undefined
): value is AcknowledgementSource {
  return (
    typeof value === "string" &&
    (ACKNOWLEDGEMENT_SOURCES as readonly string[]).includes(value)
  )
}
