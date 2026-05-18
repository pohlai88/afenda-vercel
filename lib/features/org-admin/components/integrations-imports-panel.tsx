import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { listJobFailures, listOrgImportJobs } from "../data/import-jobs.queries"

import { IntegrationsImportJobForm } from "./integrations-import-job-form"
import { OrgAdminIntegrationsImportsListSection } from "./org-admin-integrations-imports-list-section"

/**
 * Server-rendered list of organizational ingestion jobs. Job state is
 * authoritative on the server; the UI only mutates via Server Actions.
 */
export async function IntegrationsImportsPanel({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("OrgAdmin.integrations.imports")
  const jobs = await listOrgImportJobs(organizationId)

  const failuresByJob = await Promise.all(
    jobs.map(async (job) => ({
      jobId: job.id,
      failures: await listJobFailures(job.id, 5),
    }))
  )
  const failureMap = new Map(
    failuresByJob.map((entry) => [entry.jobId, entry.failures])
  )

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("createTitle")}</CardTitle>
          <CardDescription>{t("createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationsImportJobForm />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">{t("listTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("listDescription")}
          </p>
        </div>
        <OrgAdminIntegrationsImportsListSection
          jobs={jobs}
          failuresByJobId={failureMap}
        />
      </section>
    </div>
  )
}
