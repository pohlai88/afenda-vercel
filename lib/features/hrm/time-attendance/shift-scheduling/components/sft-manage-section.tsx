import { getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { listActiveEmployeeChoicesForSft } from "../data/sft.queries.server"
import type { SftRosterListFilters } from "../data/sft-roster.queries.server"
import { listAllShiftTemplatesForOrg } from "../data/sft-template.queries.server"
import {
  listRecurrenceRulesForOrg,
  listRotationCyclesForOrg,
} from "../data/sft-recurrence.queries.server"
import { listShiftRosterReportDefinitions } from "../data/sft-report-definition.server"
import { SftExportReportPanel } from "./sft-export-report-panel.client"
import {
  SftApplyRecurrenceForm,
  SftApplyRotationForm,
  SftAssignShiftForm,
  SftBulkAssignForm,
  SftPublishRosterForm,
} from "./sft-manage-forms.client"

export async function SftManageSection({
  organizationId,
  rangeStart,
  rangeEnd,
  rosterFilters = {},
}: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
  rosterFilters?: SftRosterListFilters
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")

  const [
    employees,
    templates,
    recurrenceRules,
    rotationCycles,
    reportDefinitions,
  ] = await Promise.all([
    listActiveEmployeeChoicesForSft(organizationId),
    listAllShiftTemplatesForOrg(organizationId),
    listRecurrenceRulesForOrg(organizationId),
    listRotationCyclesForOrg(organizationId),
    listShiftRosterReportDefinitions({ organizationId }),
  ])

  const templateChoices = templates.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
  }))

  const ruleChoices = recurrenceRules.map((row) => ({
    id: row.id,
    employeeName: row.employeeName,
    templateCode: row.templateCode,
    weekday: row.weekday,
  }))

  const rotationChoices = rotationCycles.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
  }))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("assignTitle")}</CardTitle>
          <CardDescription>{t("assignDescription")}</CardDescription>
          <CardAction>
            <SftExportReportPanel
              key={[
                rangeStart,
                rangeEnd,
                rosterFilters.departmentId ?? "",
                rosterFilters.jobGradeId ?? "",
                rosterFilters.locationCode ?? "",
                rosterFilters.legalEntityOrgUnitId ?? "",
                rosterFilters.teamOrgUnitId ?? "",
                rosterFilters.positionId ?? "",
              ].join("|")}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              rosterFilters={rosterFilters}
              reportDefinitions={reportDefinitions}
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          <SftAssignShiftForm
            employees={employees}
            templates={templateChoices}
            defaultDate={rangeStart}
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("bulkAssignTitle")}</CardTitle>
          <CardDescription>{t("bulkAssignDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SftBulkAssignForm
            employees={employees}
            templates={templateChoices}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("publishTitle")}</CardTitle>
          <CardDescription>{t("publishDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SftPublishRosterForm rangeStart={rangeStart} rangeEnd={rangeEnd} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("recurrenceApplyTitle")}</CardTitle>
          <CardDescription>{t("recurrenceApplyDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <SftApplyRecurrenceForm
            rules={ruleChoices}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
          <SftApplyRotationForm
            employees={employees}
            rotationCycles={rotationChoices}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        </CardContent>
      </Card>
    </div>
  )
}
