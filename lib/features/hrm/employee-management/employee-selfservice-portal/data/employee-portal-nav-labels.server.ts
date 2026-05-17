import "server-only"

import { getTranslations } from "next-intl/server"

import type { EmployeePortalSection } from "#lib/portal"

export async function getEmployeePortalSectionNavLabels(): Promise<
  Record<EmployeePortalSection, string>
> {
  const nav = await getTranslations("Dashboard.Hrm.portalNav")
  return {
    leave: nav("leave"),
    payslips: nav("payslips"),
    advances: nav("advances"),
    claims: nav("claims"),
    benefits: nav("benefits"),
    training: nav("training"),
    attendance: nav("attendance"),
    documents: nav("documents"),
    signatures: nav("signatures"),
    requests: nav("requests"),
    profile: nav("profile"),
    performance: nav("performance"),
    offboarding: nav("offboarding"),
  }
}
