import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { Button } from "#components2/ui/button"

import { submitArchiveDependent } from "../actions/dependent.actions"
import { buildEmployeeDependentsListSurfaceConfiguration } from "../data/employee-dependents-list-surface.server"
import type { EmployeeDetailDependentListRow } from "../data/employee-dependents-list-surface.server"

const DEPENDENT_RELATIONSHIP_MESSAGE_KEY = {
  spouse: "dependentRelationships.spouse",
  child: "dependentRelationships.child",
  parent: "dependentRelationships.parent",
  other: "dependentRelationships.other",
} as const

function relationshipKey(
  value: string
): keyof typeof DEPENDENT_RELATIONSHIP_MESSAGE_KEY {
  if (
    value === "spouse" ||
    value === "child" ||
    value === "parent" ||
    value === "other"
  ) {
    return value
  }
  return "other"
}

export type EmployeeDetailDependentsListSectionProps = {
  orgSlug: string
  dependents: readonly EmployeeDetailDependentListRow[]
  canArchive: boolean
}

export async function EmployeeDetailDependentsListSection({
  orgSlug,
  dependents,
  canArchive,
}: EmployeeDetailDependentsListSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.workforce"),
    getFormatter(),
  ])

  const listConfiguration = buildEmployeeDependentsListSurfaceConfiguration(
    dependents,
    {
      empty: t("dependentsEmpty"),
      colName: t("dependentLegalNameLabel"),
      colRelationship: t("dependentRelationshipLabel"),
      colDateOfBirth: t("dependentDobLabel"),
      colTaxDependent: t("dependentTaxLabel"),
      relationshipLabelFor: (relationship) =>
        t(DEPENDENT_RELATIONSHIP_MESSAGE_KEY[relationshipKey(relationship)]),
      formatDateOfBirth: (value) =>
        value ? format.dateTime(value, { dateStyle: "medium" }) : "—",
      taxDependentLabelFor: (taxDependent) =>
        taxDependent ? t("dependentTaxYes") : t("dependentTaxNo"),
    },
    { canArchive }
  )

  const dependentById = new Map(dependents.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:employee:dependents"
      trailingColumn={{
        header: " ",
        render: (surfaceRow) => {
          const trailingAction = surfaceRow.trailingAction
          const dependent = dependentById.get(surfaceRow.id)
          if (
            !dependent ||
            !isListSurfaceTrailingActionRenderable(trailingAction)
          ) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <form action={submitArchiveDependent}>
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <input type="hidden" name="dependentId" value={dependent.id} />
                <Button type="submit" variant="outline" size="sm">
                  {t("dependentArchiveSubmit")}
                </Button>
              </form>
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
