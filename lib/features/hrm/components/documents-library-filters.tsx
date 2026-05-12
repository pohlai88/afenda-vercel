"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Field, FieldLabel } from "#components/ui/field"

import {
  HRM_DOCUMENT_CLASSIFICATIONS,
  HRM_DOCUMENT_TYPES,
} from "../data/hrm-document-display.shared"
import type { DocumentEmployeeChoiceRow } from "../data/hrm-document.queries.server"

type DocumentsLibraryFiltersProps = {
  orgSlug: string
  employees: DocumentEmployeeChoiceRow[]
  selectedEmployeeId: string | null
  selectedDocumentType: string | null
  selectedClassification: string | null
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

/**
 * URL-driven filter chips for the documents vault library.
 *
 * Submits as a plain `GET` form so the resulting view is a deep link —
 * refresh and back-button produce the exact same filtered library.
 * Reset clears the search params via a separate anchor (no client
 * state at all), which keeps the picker free of `useEffect` /
 * `useState` and lets it stream alongside the suspended library
 * without a roundtrip.
 *
 * Server-side validation lives in the page composer (`isHrmDocumentType`,
 * `isHrmDocumentClassification`, employee id must appear in the active
 * picker); this component is a thin form, not a permission boundary.
 */
export function DocumentsLibraryFilters({
  orgSlug,
  employees,
  selectedEmployeeId,
  selectedDocumentType,
  selectedClassification,
}: DocumentsLibraryFiltersProps) {
  const t = useTranslations("Dashboard.Hrm.documents")
  const documentTypeId = useId()
  const classificationId = useId()
  const employeeId = useId()
  const action = `/o/${orgSlug}/dashboard/hrm/documents`

  return (
    <form
      method="get"
      action={action}
      className="flex flex-wrap items-end gap-3"
    >
      <Field className="min-w-[14rem] flex-1">
        <FieldLabel htmlFor={documentTypeId}>
          {t("filterTypeLabel")}
        </FieldLabel>
        <select
          id={documentTypeId}
          name="documentType"
          defaultValue={selectedDocumentType ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">{t("filterTypeAll")}</option>
          {HRM_DOCUMENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`documentTypes.${value}`)}
            </option>
          ))}
        </select>
      </Field>

      <Field className="min-w-[12rem] flex-1">
        <FieldLabel htmlFor={classificationId}>
          {t("filterClassificationLabel")}
        </FieldLabel>
        <select
          id={classificationId}
          name="classification"
          defaultValue={selectedClassification ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">{t("filterClassificationAll")}</option>
          {HRM_DOCUMENT_CLASSIFICATIONS.map((value) => (
            <option key={value} value={value}>
              {t(`documentClassifications.${value}`)}
            </option>
          ))}
        </select>
      </Field>

      <Field className="min-w-[16rem] flex-1">
        <FieldLabel htmlFor={employeeId}>{t("filterEmployeeLabel")}</FieldLabel>
        <select
          id={employeeId}
          name="employeeId"
          defaultValue={selectedEmployeeId ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">{t("filterEmployeeAll")}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.legalName} · {employee.employeeNumber}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {t("filterApply")}
        </Button>
        <Button asChild type="button" size="sm" variant="ghost">
          <a href={action}>{t("filterReset")}</a>
        </Button>
      </div>
    </form>
  )
}
