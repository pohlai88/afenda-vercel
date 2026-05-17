import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { listEvalRunsForOrganization } from "../data/eval-run.queries.server"

export async function KnowledgeEvalHistoryTile({
  organizationId,
  orgSlug,
}: {
  organizationId: string
  orgSlug: string
}) {
  const t = await getTranslations("OrgAdmin.knowledge")
  const rows = await listEvalRunsForOrganization({ organizationId, limit: 10 })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("evalHistoryTitle")}</CardTitle>
        <CardDescription>{t("evalHistoryDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("evalHistoryEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {t("evalHistoryRow", {
                      recall: row.recallAtK.toFixed(3),
                      mrr: row.meanReciprocalRank.toFixed(3),
                      total: row.totalCases,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.retrievalMode} · topK {row.topK} ·{" "}
                    {row.createdAt.toISOString()}
                  </p>
                </div>
                <Link
                  href={`/o/${orgSlug}/admin/knowledge/sources/runs/${row.id}`}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("evalHistoryViewRun")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
