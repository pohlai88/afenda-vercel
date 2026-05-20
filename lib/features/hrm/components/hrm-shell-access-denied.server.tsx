import { getTranslations } from "next-intl/server"

import { ErpAccessDenied } from "#features/erp-rbac/client"

/** ERP RBAC gate copy — uses `Dashboard.Hrm.shell` so segment namespaces are not unioned with `cards.*` / `placeholders.*`. */
export async function HrmShellAccessDenied({ surface }: { surface: string }) {
  const t = await getTranslations("Dashboard.Hrm.shell")

  return (
    <ErpAccessDenied
      title={t("accessDeniedTitle")}
      description={t("accessDeniedDescription", { surface })}
    />
  )
}

export async function HrmShellAccessDeniedFromNav({
  navKey,
}: {
  navKey:
    | "imports"
    | "kpi"
    | "lifecycle"
    | "onboarding"
    | "performance"
    | "skills"
    | "snapshot"
    | "training"
    | "signatures"
    | "attendance"
    | "advances"
    | "claims"
    | "leave"
    | "payroll"
    | "benefits"
    | "documents"
    | "compliance"
    | "organization"
    | "recruitment"
    | "employees"
    | "offboarding"
    | "policies"
    | "compensation-planning"
    | "salary-benchmarking"
    | "bonus-incentives"
}) {
  const [tShell, tNav] = await Promise.all([
    getTranslations("Dashboard.Hrm.shell"),
    getTranslations("Dashboard.Hrm.nav"),
  ])

  return (
    <ErpAccessDenied
      title={tShell("accessDeniedTitle")}
      description={tShell("accessDeniedDescription", { surface: tNav(navKey) })}
    />
  )
}

export async function HrmShellAccessDeniedDetail({
  surface,
}: {
  surface: string
}) {
  const t = await getTranslations("Dashboard.Hrm.shell")

  return (
    <ErpAccessDenied
      title={t("accessDeniedDetailTitle")}
      description={t("accessDeniedDetailDescription", { surface })}
    />
  )
}

export async function HrmWorkbenchOverviewAccessDenied() {
  const t = await getTranslations("Dashboard.Hrm.shell")

  return (
    <ErpAccessDenied
      title={t("accessDeniedWorkbenchTitle")}
      description={t("accessDeniedWorkbenchDescription")}
    />
  )
}

export async function HrmWorkbenchCapabilityAccessDenied() {
  const t = await getTranslations("Dashboard.Hrm.shell")

  return (
    <ErpAccessDenied
      title={t("accessDeniedCapabilityTitle")}
      description={t("accessDeniedCapabilityDescription")}
    />
  )
}

export async function HrmComplianceEvidenceAccessDenied() {
  const t = await getTranslations("Dashboard.Hrm.shell")

  return (
    <ErpAccessDenied
      title={t("accessDeniedComplianceEvidenceTitle")}
      description={t("accessDeniedComplianceEvidenceDescription")}
    />
  )
}
