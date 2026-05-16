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
    claims: nav("claims"),
    benefits: nav("benefits"),
    attendance: nav("attendance"),
    documents: nav("documents"),
  }
}
