export const COMPLIANCE_PACK_TYPE_LABELS: Record<string, string> = {
  epf_monthly: "EPF Monthly",
  socso_monthly: "SOCSO Monthly",
  eis_monthly: "EIS Monthly",
  pcb_monthly: "PCB / MTD Monthly",
  ea_annual: "EA Annual",
  borang_e_annual: "Borang E Annual",
}

export function compliancePackTypeLabel(packType: string): string {
  return COMPLIANCE_PACK_TYPE_LABELS[packType] ?? packType
}
