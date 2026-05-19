import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Textarea } from "#components2/ui/textarea"

import {
  assignComplianceCorrectiveActionFormAction,
  resolveComplianceExceptionFormAction,
  updateComplianceCorrectiveActionProgressFormAction,
  waiveComplianceExceptionFormAction,
} from "../actions/compliance-exception.actions"
import { buildComplianceExceptionsListSurfaceConfiguration } from "../data/compliance-list-surface.server"
import type { ComplianceExceptionListRow } from "../data/compliance-exception.queries.server"

type ComplianceExceptionsListSectionProps = {
  orgSlug: string
  canUpdate: boolean
  rows: readonly ComplianceExceptionListRow[]
}

export async function ComplianceExceptionsListSection({
  orgSlug,
  canUpdate,
  rows,
}: ComplianceExceptionsListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.compliance.exceptions")

  const trailingContext = {
    showActionsColumn: canUpdate,
    canUpdate,
  }

  const listConfiguration = buildComplianceExceptionsListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colTitle: t("colTitle"),
      colArea: t("colArea"),
      colSeverity: t("colSeverity"),
      colStatus: t("colStatus"),
      colSubject: t("orgLevel"),
    },
    trailingContext
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:compliance:exceptions"
      trailingColumn={
        canUpdate
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const trailingAction = surfaceRow.trailingAction
                const row = rowById.get(surfaceRow.id)
                if (
                  !row ||
                  !isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return null
                }
                return (
                  <GovernedTrailingActionSlot trailingAction={trailingAction}>
                    <div className="grid min-w-[18rem] gap-2">
                      <form
                        action={assignComplianceCorrectiveActionFormAction}
                        className="flex flex-col gap-2"
                      >
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input
                          type="hidden"
                          name="exceptionId"
                          value={row.id}
                        />
                        <Input
                          name="correctiveActionOwnerUserId"
                          required
                          placeholder={t("ownerUserIdPlaceholder")}
                          className="text-xs"
                        />
                        <Input
                          name="correctiveActionDueDate"
                          required
                          type="date"
                          className="text-xs"
                        />
                        <Textarea
                          name="correctiveActionDescription"
                          required
                          placeholder={t("correctiveActionPlaceholder")}
                          rows={2}
                          className="text-xs"
                        />
                        <Button type="submit" size="sm" className="w-fit">
                          {t("assignSubmit")}
                        </Button>
                      </form>
                      <form
                        action={
                          updateComplianceCorrectiveActionProgressFormAction
                        }
                        className="flex flex-col gap-2"
                      >
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input
                          type="hidden"
                          name="exceptionId"
                          value={row.id}
                        />
                        <Textarea
                          name="progressNote"
                          required
                          placeholder={t("progressNotePlaceholder")}
                          rows={2}
                          className="text-xs"
                        />
                        <Input
                          name="evidenceDocumentId"
                          placeholder={t("evidenceDocumentIdPlaceholder")}
                          className="text-xs"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          className="w-fit"
                        >
                          {t("progressSubmit")}
                        </Button>
                      </form>
                      <form
                        action={resolveComplianceExceptionFormAction}
                        className="flex flex-col gap-2"
                      >
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input
                          type="hidden"
                          name="exceptionId"
                          value={row.id}
                        />
                        <Textarea
                          name="resolutionNote"
                          required
                          placeholder={t("resolvePlaceholder")}
                          rows={2}
                          className="text-xs"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          className="w-fit"
                        >
                          {t("resolveSubmit")}
                        </Button>
                      </form>
                      <form
                        action={waiveComplianceExceptionFormAction}
                        className="flex flex-col gap-2"
                      >
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input
                          type="hidden"
                          name="exceptionId"
                          value={row.id}
                        />
                        <Textarea
                          name="waiverReason"
                          required
                          placeholder={t("waiveReasonPlaceholder")}
                          rows={2}
                          className="text-xs"
                        />
                        <Input
                          name="approvalReference"
                          required
                          placeholder={t("waiveRefPlaceholder")}
                          className="text-xs"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="w-fit"
                        >
                          {t("waiveSubmit")}
                        </Button>
                      </form>
                    </div>
                  </GovernedTrailingActionSlot>
                )
              },
            }
          : undefined
      }
    />
  )
}
