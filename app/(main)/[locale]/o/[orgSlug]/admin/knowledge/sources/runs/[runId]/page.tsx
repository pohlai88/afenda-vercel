import type { Route } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import { getEvalRunById } from "#features/knowledge"
import { requireOrgSession } from "#lib/tenant"

export default async function OrgAdminKnowledgeRunDetailPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/knowledge/sources/runs/[runId]">) {
  const { orgSlug, runId } = await params
  const t = await getTranslations("OrgAdmin.knowledge")
  const session = await requireOrgSession()
  const run = await getEvalRunById(session.organizationId, runId)

  if (!run) notFound()

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("runDetailTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("runDetailSummary", {
            recall: run.recallAtK.toFixed(3),
            mrr: run.meanReciprocalRank.toFixed(3),
            total: run.totalCases,
          })}
        </p>
      </div>

      <ul className="space-y-2">
        {run.cases.map((item) => (
          <li key={item.caseId} className="rounded border p-3 text-sm">
            <p className="font-medium">{item.question}</p>
            <p className="text-xs text-muted-foreground">
              hit: {item.hit ? "yes" : "no"} · rr:{" "}
              {item.reciprocalRank.toFixed(3)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              expected: {item.expectedEvidenceIds.join(", ") || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              retrieved: {item.retrievedEvidenceIds.join(", ") || "—"}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted-foreground">
        <Link
          href={`/o/${orgSlug}/admin/knowledge/sources` as Route}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("runDetailBack")}
        </Link>
      </p>
    </div>
  )
}
