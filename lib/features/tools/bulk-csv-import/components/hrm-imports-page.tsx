import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedSurface } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { requireOrgSession } from "#lib/tenant"

import { buildGovernedHrmWorkbenchHeader } from "#features/hrm/server"
import { listRecentImportSessions } from "../../../hrm/employee-management/employee-records-management/data/hrm-import.queries.server.ts"
import { HrmImportRollbackButton } from "./hrm-import-rollback-button.client"
import { HrmImportWizard } from "./hrm-import-wizard"

type HrmImportsPageProps = {
  orgSlug: string
}

export async function HrmImportsPage({ orgSlug }: HrmImportsPageProps) {
  const { organizationId } = await requireOrgSession()
  const [t, sessions, format, header] = await Promise.all([
    getTranslations("Dashboard.Hrm.imports"),
    listRecentImportSessions(organizationId),
    getFormatter(),
    buildGovernedHrmWorkbenchHeader(orgSlug, "Dashboard.Hrm.imports", {
      eyebrow: "eyebrow",
      title: "title",
      description: "description",
    }),
  ])

  return (
    <GovernedSurface header={header} className="flex flex-col gap-6 p-6">
      <HrmImportWizard orgSlug={orgSlug} />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("recentTitle")}</CardTitle>
          <CardDescription>{t("recentDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("recentEmpty")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{s.importType}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("rowsLabel")}: {s.rowCount}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {s.status === "committed" ? (
                      <HrmImportRollbackButton
                        orgSlug={orgSlug}
                        sessionId={s.id}
                      />
                    ) : null}
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{s.status}</p>
                      <p>
                        {format.dateTime(s.updatedAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </GovernedSurface>
  )
}
