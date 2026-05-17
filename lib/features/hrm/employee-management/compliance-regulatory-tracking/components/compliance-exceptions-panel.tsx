import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Input } from "#components2/ui/input"
import { Textarea } from "#components2/ui/textarea"
import { requireOrgSession } from "#lib/auth"

import {
  assignComplianceCorrectiveActionFormAction,
  resolveComplianceExceptionFormAction,
  updateComplianceCorrectiveActionProgressFormAction,
  waiveComplianceExceptionFormAction,
} from "../actions/compliance-exception.actions"
import { listComplianceExceptionsForOrg } from "../data/compliance-exception.queries.server"
import type { ComplianceSurfaceCapabilities } from "../data/compliance-capabilities.shared"

type ComplianceExceptionsPanelProps = {
  orgSlug: string
  capabilities: ComplianceSurfaceCapabilities
}

export async function ComplianceExceptionsPanel({
  orgSlug,
  capabilities,
}: ComplianceExceptionsPanelProps) {
  const { organizationId } = await requireOrgSession()
  const [t, rows] = await Promise.all([
    getTranslations("Dashboard.Hrm.compliance.exceptions"),
    listComplianceExceptionsForOrg(organizationId),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.title}</span>
                  <Badge variant="outline">{row.status}</Badge>
                  <Badge variant="secondary">{row.complianceArea}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.legalName ?? t("orgLevel")} · {row.severity}
                </p>
                {capabilities.canUpdate ? (
                  <div className="grid gap-2 lg:grid-cols-4">
                    <form
                      action={assignComplianceCorrectiveActionFormAction}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="exceptionId" value={row.id} />
                      <Input
                        name="correctiveActionOwnerUserId"
                        required
                        placeholder="Owner user id"
                      />
                      <Input
                        name="correctiveActionDueDate"
                        required
                        type="date"
                      />
                      <Textarea
                        name="correctiveActionDescription"
                        required
                        placeholder="Corrective action"
                        rows={2}
                      />
                      <Button type="submit" size="sm">
                        Assign
                      </Button>
                    </form>
                    <form
                      action={updateComplianceCorrectiveActionProgressFormAction}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="exceptionId" value={row.id} />
                      <Textarea
                        name="progressNote"
                        required
                        placeholder="Progress note"
                        rows={2}
                      />
                      <Input
                        name="evidenceDocumentId"
                        placeholder="Evidence document id"
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        Progress
                      </Button>
                    </form>
                    <form
                      action={resolveComplianceExceptionFormAction}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="exceptionId" value={row.id} />
                      <Textarea
                        name="resolutionNote"
                        required
                        placeholder={t("resolvePlaceholder")}
                        rows={2}
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        {t("resolveSubmit")}
                      </Button>
                    </form>
                    <form
                      action={waiveComplianceExceptionFormAction}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="exceptionId" value={row.id} />
                      <Textarea
                        name="waiverReason"
                        required
                        placeholder={t("waiveReasonPlaceholder")}
                        rows={2}
                      />
                      <Input
                        name="approvalReference"
                        required
                        placeholder={t("waiveRefPlaceholder")}
                      />
                      <Button type="submit" size="sm" variant="outline">
                        {t("waiveSubmit")}
                      </Button>
                    </form>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("readOnlyActions")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
