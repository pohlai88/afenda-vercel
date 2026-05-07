import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { listJobFailures, listOrgImportJobs } from "../data/import-jobs.queries"

import { IntegrationsImportJobForm } from "./integrations-import-job-form"
import { IntegrationsImportJobRow } from "./integrations-import-job-row"

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("createTitle")}</CardTitle>
          <CardDescription>{t("createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationsImportJobForm />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{t("listTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("listDescription")}
          </p>
        </div>
        {jobs.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("listEmpty")}
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {jobs.map((job) => (
              <li key={job.id} className="px-4 py-4">
                <IntegrationsImportJobRow
                  job={job}
                  recentFailures={failureMap.get(job.id) ?? []}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
