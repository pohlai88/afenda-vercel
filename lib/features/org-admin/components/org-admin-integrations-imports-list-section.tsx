import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildOrgIntegrationsImportsListSurfaceConfiguration } from "../data/org-admin-integrations-list-surface.server"
import type { OrgImportJobFailureSummary, OrgImportJobSummary } from "../types"

import { IntegrationsImportJobActions } from "./integrations-import-job-actions.client"

type OrgAdminIntegrationsImportsListSectionProps = {
  jobs: readonly OrgImportJobSummary[]
  failuresByJobId: ReadonlyMap<string, readonly OrgImportJobFailureSummary[]>
}

export async function OrgAdminIntegrationsImportsListSection({
  jobs,
  failuresByJobId,
}: OrgAdminIntegrationsImportsListSectionProps) {
  const t = await getTranslations("OrgAdmin.integrations.imports")

  const listConfiguration = buildOrgIntegrationsImportsListSurfaceConfiguration(
    jobs,
    failuresByJobId,
    {
      empty: t("listEmpty"),
      colAdapter: "Adapter",
      colSummary: "Progress",
      colFile: "File",
      colRecent: t("recentFailuresTitle"),
      noRecent: "—",
      noFile: "—",
      adapterLabel: (adapter) => t(`adapter.${adapter}`),
      rowSummary: (job) =>
        t("rowSummary", {
          total: job.totalRows,
          applied: job.successCount,
          failed: job.failureCount,
          state: job.state,
        }),
    }
  )

  const jobById = new Map(jobs.map((job) => [job.id, job]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="org-admin:integrations:imports"
      resolveConfiguredPermission={false}
      trailingColumn={{
        header: "Actions",
        render: (surfaceRow) => {
          const job = jobById.get(surfaceRow.id)
          if (!job) return null
          return (
            <IntegrationsImportJobActions jobId={job.id} state={job.state} />
          )
        },
      }}
    />
  )
}
