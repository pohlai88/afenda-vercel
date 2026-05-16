import en from "../../messages/en.json"

/** Employee portal section nav labels — parity with `Dashboard.Hrm.portalNav`. */
export const HRM_PORTAL_NAV_COPY = {
  leave: en.Dashboard.Hrm.portalNav.leave,
  payslips: en.Dashboard.Hrm.portalNav.payslips,
  advances: en.Dashboard.Hrm.portalNav.advances,
  claims: en.Dashboard.Hrm.portalNav.claims,
  benefits: en.Dashboard.Hrm.portalNav.benefits,
  training: en.Dashboard.Hrm.portalNav.training,
  attendance: en.Dashboard.Hrm.portalNav.attendance,
  documents: en.Dashboard.Hrm.portalNav.documents,
  signatures: en.Dashboard.Hrm.portalNav.signatures,
  profile: en.Dashboard.Hrm.portalNav.profile,
  performance: en.Dashboard.Hrm.portalNav.performance,
  offboarding: en.Dashboard.Hrm.portalNav.offboarding,
} as const

export const HRM_PORTAL_PAGE_HEADINGS = {
  profile: en.Dashboard.Hrm.portalProfile.pageTitle,
  performance: en.Dashboard.Hrm.portalPerformance.pageTitle,
  offboarding: en.Dashboard.Hrm.portalOffboarding.pageTitle,
  advances: en.Dashboard.Hrm.portalAdvances.portalPageTitle,
  signatures: en.Dashboard.Hrm.portalSignatures.pageTitle,
  training: en.Dashboard.Hrm.training.portalPageTitle,
} as const
