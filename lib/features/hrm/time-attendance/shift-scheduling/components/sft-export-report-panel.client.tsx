"use client"

import { useActionState, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import type { SftCoverageFormState } from "../../../types"
import {
  deleteShiftRosterReportDefinitionAction,
  exportShiftRosterCsvAction,
  saveShiftRosterReportDefinitionAction,
} from "#features/hrm/client"
import type { RosterListFiltersInput } from "../schemas/sft.schema"

type ReportDefinitionChoice = {
  readonly id: string
  readonly name: string
  readonly filters: RosterListFiltersInput
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

function appendFilters(formData: FormData, filters: RosterListFiltersInput) {
  if (filters.departmentId) formData.set("departmentId", filters.departmentId)
  if (filters.jobGradeId) formData.set("jobGradeId", filters.jobGradeId)
  if (filters.locationCode) formData.set("locationCode", filters.locationCode)
  if (filters.legalEntityOrgUnitId) {
    formData.set("legalEntityOrgUnitId", filters.legalEntityOrgUnitId)
  }
  if (filters.teamOrgUnitId)
    formData.set("teamOrgUnitId", filters.teamOrgUnitId)
  if (filters.positionId) formData.set("positionId", filters.positionId)
}

export function SftExportReportPanel({
  rangeStart,
  rangeEnd,
  rosterFilters = {},
  reportDefinitions,
}: {
  rangeStart: string
  rangeEnd: string
  rosterFilters?: RosterListFiltersInput
  reportDefinitions: readonly ReportDefinitionChoice[]
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const mergedDefaultFilters: RosterListFiltersInput = {
    ...rosterFilters,
  }
  const [activeFilters, setActiveFilters] =
    useState<RosterListFiltersInput>(mergedDefaultFilters)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportPending, startExport] = useTransition()
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("")

  const [saveState, saveAction, savePending] = useActionState<
    SftCoverageFormState | undefined,
    FormData
  >(saveShiftRosterReportDefinitionAction, undefined)

  const [deleteState, deleteAction, deletePending] = useActionState<
    SftCoverageFormState | undefined,
    FormData
  >(deleteShiftRosterReportDefinitionAction, undefined)

  const activeDefinition = reportDefinitions.find(
    (row) => row.id === selectedDefinitionId
  )

  return (
    <div className="flex flex-col gap-3">
      {reportDefinitions.length > 0 ? (
        <Field>
          <FieldLabel htmlFor="sft-report-preset">
            {t("reportDefinitionApply")}
          </FieldLabel>
          <select
            id="sft-report-preset"
            className={SELECT_CLASS}
            value={selectedDefinitionId}
            onChange={(event) => {
              const id = event.target.value
              setSelectedDefinitionId(id)
              const preset = reportDefinitions.find((row) => row.id === id)
              if (preset) setActiveFilters(preset.filters)
            }}
          >
            <option value="">{t("reportDefinitionSelect")}</option>
            {reportDefinitions.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("reportDefinitionEmpty")}
        </p>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={exportPending}
        onClick={() => {
          setExportError(null)
          startExport(async () => {
            const formData = new FormData()
            formData.set("rangeStart", rangeStart)
            formData.set("rangeEnd", rangeEnd)
            appendFilters(formData, activeFilters)
            const result = await exportShiftRosterCsvAction(formData)
            if (!result.ok) {
              setExportError(result.error)
              return
            }
            const blob = new Blob([result.csv], {
              type: "text/csv;charset=utf-8",
            })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement("a")
            anchor.href = url
            anchor.download = result.filename
            anchor.click()
            URL.revokeObjectURL(url)
          })
        }}
      >
        {exportPending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("exportReportSubmitting")}
          </>
        ) : (
          t("exportReport")
        )}
      </Button>
      {exportError ? (
        <span className="text-xs text-destructive">{exportError}</span>
      ) : null}

      <form action={saveAction} className="flex flex-col gap-2 border-t pt-3">
        <Field>
          <FieldLabel htmlFor="sft-report-name">
            {t("reportDefinitionName")}
          </FieldLabel>
          <Input id="sft-report-name" name="name" required maxLength={120} />
        </Field>
        {Object.entries(activeFilters).map(([key, value]) =>
          value ? (
            <input key={key} type="hidden" name={key} value={value} />
          ) : null
        )}
        {saveState && !saveState.ok && saveState.errors?.form ? (
          <Alert variant="destructive">
            <AlertDescription>{saveState.errors.form}</AlertDescription>
          </Alert>
        ) : null}
        {saveState?.ok ? (
          <p className="text-xs text-muted-foreground">
            {t("reportDefinitionSaveSuccess")}
          </p>
        ) : null}
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={savePending}
        >
          {savePending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            t("reportDefinitionSave")
          )}
        </Button>
      </form>

      {activeDefinition ? (
        <form action={deleteAction} className="flex flex-col gap-2">
          <input
            type="hidden"
            name="definitionId"
            value={activeDefinition.id}
          />
          {deleteState && !deleteState.ok && deleteState.errors?.form ? (
            <FieldError>{deleteState.errors.form}</FieldError>
          ) : null}
          <Button
            type="submit"
            size="sm"
            variant="destructive"
            disabled={deletePending}
          >
            {t("reportDefinitionDelete", { name: activeDefinition.name })}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
