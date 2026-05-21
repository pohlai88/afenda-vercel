import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildSftEmbeddedListSurfaceErrorConfiguration } from "../data/sft-embedded-list-surface-error.server"
import { buildSftRecurrenceRulesListSurfaceConfiguration } from "../data/sft-surface-builders.server"
import { listRecurrenceRulesForOrg } from "../data/sft-recurrence.queries.server"
import { listActiveEmployeeChoicesForSft } from "../data/sft.queries.server"
import { listAllShiftTemplatesForOrg } from "../data/sft-template.queries.server"
import { SFT_LIST_SURFACE_IDS } from "../data/sft-surface-metadata.shared"
import { listRotationCyclesWithStepsForOrg } from "../data/sft-rotation.queries.server"
import { SftCreateRecurrenceRuleForm } from "./sft-manage-forms.client"
import {
  SftAddRotationStepForm,
  SftCreateRotationCycleForm,
} from "./sft-authoring-forms.client"

const WEEKDAY_KEYS = [
  "weekdaySun",
  "weekdayMon",
  "weekdayTue",
  "weekdayWed",
  "weekdayThu",
  "weekdayFri",
  "weekdaySat",
] as const

export async function SftRecurrenceSection({
  organizationId,
  canManage = false,
  rangeStart,
}: {
  organizationId: string
  canManage?: boolean
  rangeStart?: string
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")

  type EmployeeChoices = Awaited<
    ReturnType<typeof listActiveEmployeeChoicesForSft>
  >
  type TemplateRows = Awaited<ReturnType<typeof listAllShiftTemplatesForOrg>>

  const manageContextPromise: Promise<
    [
      EmployeeChoices,
      TemplateRows,
      Awaited<ReturnType<typeof listRotationCyclesWithStepsForOrg>>,
    ]
  > = canManage
    ? Promise.all([
        listActiveEmployeeChoicesForSft(organizationId),
        listAllShiftTemplatesForOrg(organizationId),
        listRotationCyclesWithStepsForOrg(organizationId),
      ])
    : Promise.resolve([[], [], []])

  let rows: Awaited<ReturnType<typeof listRecurrenceRulesForOrg>>
  let employees: EmployeeChoices = []
  let templates: TemplateRows = []
  let rotationCycles: Awaited<
    ReturnType<typeof listRotationCyclesWithStepsForOrg>
  > = []

  try {
    const [manageContext, ruleRows] = await Promise.all([
      manageContextPromise,
      listRecurrenceRulesForOrg(organizationId),
    ])
    rows = ruleRows
    ;[employees, templates, rotationCycles] = manageContext
  } catch (err) {
    logUnexpectedServerError("sft-recurrence-section: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("recurrenceTitle")}</CardTitle>
          <CardDescription>{t("recurrenceDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildSftEmbeddedListSurfaceErrorConfiguration({
              columnsId: SFT_LIST_SURFACE_IDS.recurrenceRules,
              emptyTitle: t("recurrenceEmpty"),
              firstColumn: { id: "employee", header: t("colEmployee") },
            })}
            surfaceKey="hrm:shift-scheduling:recurrence-rules:error"
            resolveConfiguredPermission={false}
            loadError={{ variant: "error", title: t("recurrenceLoadFailed") }}
          />
        </CardContent>
      </Card>
    )
  }

  const weekdayLabel = (weekday: number) => {
    const key = WEEKDAY_KEYS[weekday]
    return key ? t(key) : String(weekday)
  }

  const listConfiguration = buildSftRecurrenceRulesListSurfaceConfiguration(
    rows,
    {
      empty: t("recurrenceEmpty"),
      colEmployee: t("colEmployee"),
      colShift: t("colShift"),
      colWeekday: t("colWeekday"),
      colRange: t("colRecurrenceRange"),
      weekdayLabel,
    }
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("recurrenceTitle")}</CardTitle>
        <CardDescription>{t("recurrenceDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {canManage ? (
          <>
            <div className="rounded-md border border-border p-4">
              <h4 className="text-sm font-medium">
                {t("recurrenceCreateTitle")}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("recurrenceCreateDescription")}
              </p>
              <div className="mt-4">
                <SftCreateRecurrenceRuleForm
                  employees={employees}
                  templates={templates.map((row) => ({
                    id: row.id,
                    code: row.code,
                    name: row.name,
                  }))}
                  defaultStartDate={rangeStart ?? ""}
                />
              </div>
            </div>
            <div className="rounded-md border border-border p-4">
              <h4 className="text-sm font-medium">
                {t("rotationCreateTitle")}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("rotationCreateDescription")}
              </p>
              <div className="mt-4">
                <SftCreateRotationCycleForm
                  templates={templates.map((row) => ({
                    id: row.id,
                    code: row.code,
                    name: row.name,
                  }))}
                />
              </div>
            </div>
            <div className="rounded-md border border-border p-4">
              <h4 className="text-sm font-medium">{t("rotationStepsTitle")}</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("rotationStepsDescription")}
              </p>
              {rotationCycles.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {rotationCycles.map((cycle) => (
                    <li
                      key={cycle.id}
                      className="rounded border border-border/60 px-3 py-2"
                    >
                      <span className="font-medium">
                        {cycle.code} · {cycle.name}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {cycle.steps.length}/{cycle.cycleLengthDays}{" "}
                        {t("rotationStepsLabel")}
                      </span>
                      {cycle.steps.length > 0 ? (
                        <ol className="mt-1 list-decimal pl-5 text-muted-foreground">
                          {cycle.steps.map((step) => (
                            <li key={step.id}>
                              {t("rotationStepLine", {
                                index: step.stepIndex,
                                template: `${step.templateCode} · ${step.templateName}`,
                              })}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("rotationStepsEmpty")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("rotationCyclesEmpty")}
                </p>
              )}
              <div className="mt-4">
                <SftAddRotationStepForm
                  cycles={rotationCycles}
                  templates={templates.map((row) => ({
                    id: row.id,
                    code: row.code,
                    name: row.name,
                  }))}
                />
              </div>
            </div>
          </>
        ) : null}
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={listConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.recurrenceRules}
          invalid={{
            variant: "error",
            title: t("recurrenceLoadFailed"),
          }}
          data-testid={`governed-list-section:${SFT_LIST_SURFACE_IDS.recurrenceRules}`}
        />
      </CardContent>
    </Card>
  )
}
