import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import { organizationAppsPath } from "#lib/org-apps-module-paths"

import { Button } from "#components2/ui/button"
import { Field, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import {
  listDepartmentsForOrg,
  listJobGradesForOrg,
  listPositionsForOrg,
} from "../../../employee-management/organizational-chart-hierarchy/data/org-structure.queries.server"
import type { SftRosterListFilters } from "../data/sft-roster.queries.server"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

export async function SftRosterFilters({
  organizationId,
  orgSlug,
  rangeStart,
  rangeEnd,
  filters,
}: {
  organizationId: string
  orgSlug: string
  rangeStart: string
  rangeEnd: string
  filters: SftRosterListFilters
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")

  const rosterPath = `${organizationAppsPath(orgSlug, "hrm")}/shift-scheduling`
  const clearHref = `${rosterPath}?rangeStart=${encodeURIComponent(rangeStart)}&rangeEnd=${encodeURIComponent(rangeEnd)}`

  const [departments, jobGrades, positions] = await Promise.all([
    listDepartmentsForOrg(organizationId, { includeArchived: false }),
    listJobGradesForOrg(organizationId, { includeArchived: false }),
    listPositionsForOrg(organizationId, { includeArchived: false }),
  ])

  const legalEntities = departments.filter(
    (dept) => dept.orgUnitType === "legal_entity"
  )
  const teams = departments.filter((dept) => dept.orgUnitType === "team")

  return (
    <form method="get" className="flex flex-col gap-3">
      <input type="hidden" name="rangeStart" value={rangeStart} />
      <input type="hidden" name="rangeEnd" value={rangeEnd} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="sft-roster-dept">
            {t("rosterFilterDepartment")}
          </FieldLabel>
          <select
            id="sft-roster-dept"
            name="departmentId"
            className={SELECT_CLASS}
            defaultValue={filters.departmentId ?? ""}
          >
            <option value="">{t("rosterFilterAll")}</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.code} · {dept.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-roster-legal">
            {t("rosterFilterLegalEntity")}
          </FieldLabel>
          <select
            id="sft-roster-legal"
            name="legalEntityOrgUnitId"
            className={SELECT_CLASS}
            defaultValue={filters.legalEntityOrgUnitId ?? ""}
          >
            <option value="">{t("rosterFilterAll")}</option>
            {legalEntities.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.code} · {dept.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-roster-team">
            {t("rosterFilterTeam")}
          </FieldLabel>
          <select
            id="sft-roster-team"
            name="teamOrgUnitId"
            className={SELECT_CLASS}
            defaultValue={filters.teamOrgUnitId ?? ""}
          >
            <option value="">{t("rosterFilterAll")}</option>
            {teams.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.code} · {dept.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-roster-position">
            {t("rosterFilterPosition")}
          </FieldLabel>
          <select
            id="sft-roster-position"
            name="positionId"
            className={SELECT_CLASS}
            defaultValue={filters.positionId ?? ""}
          >
            <option value="">{t("rosterFilterAll")}</option>
            {positions.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.code} · {pos.title}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-roster-grade">
            {t("rosterFilterJobGrade")}
          </FieldLabel>
          <select
            id="sft-roster-grade"
            name="jobGradeId"
            className={SELECT_CLASS}
            defaultValue={filters.jobGradeId ?? ""}
          >
            <option value="">{t("rosterFilterAll")}</option>
            {jobGrades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.code} · {grade.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-roster-loc">
            {t("rosterFilterLocation")}
          </FieldLabel>
          <Input
            id="sft-roster-loc"
            name="locationCode"
            maxLength={64}
            defaultValue={filters.locationCode ?? ""}
            placeholder={t("rosterFilterLocationPlaceholder")}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="secondary">
          {t("rosterFilterApply")}
        </Button>
        <Button type="button" size="sm" variant="ghost" asChild>
          <Link href={clearHref}>{t("rosterFilterClear")}</Link>
        </Button>
      </div>
    </form>
  )
}
