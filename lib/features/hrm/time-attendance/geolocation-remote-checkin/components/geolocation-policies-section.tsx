import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { buildRemoteCheckinPoliciesListSurfaceConfiguration } from "../data/geolocation-surface-builders.server"
import type { RemoteCheckinPolicyRow } from "../data/geolocation.queries.server"

import { RemoteCheckinPolicyDialog } from "./remote-checkin-policy-form.client"

const POLICY_FORM_SCOPES = [
  "org",
  "department",
  "position",
  "employment_type",
  "policy_group",
  "employee",
] as const

type PolicyFormScope = (typeof POLICY_FORM_SCOPES)[number]

function toFormScope(value: string): PolicyFormScope {
  return (POLICY_FORM_SCOPES as readonly string[]).includes(value)
    ? (value as PolicyFormScope)
    : "org"
}

export async function GeolocationPoliciesSection({
  orgSlug,
  rows,
  canManage,
}: {
  orgSlug: string
  rows: readonly RemoteCheckinPolicyRow[]
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.Geolocation.policies")
  const tCommon = await getTranslations("Dashboard.Hrm.Geolocation")
  const yesNo = (value: boolean) => (value ? tCommon("yes") : tCommon("no"))

  const listConfiguration = buildRemoteCheckinPoliciesListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colScope: t("fieldScopeKind"),
      colMinAccuracy: t("fieldMinGpsAccuracyMeters"),
      colShiftWindow: t("fieldShiftWindowMinutes"),
      colDevice: t("fieldRequireRegisteredDevice"),
      colSelfie: t("fieldRequireSelfie"),
      colSpoof: t("fieldDetectSpoofing"),
      colActive: t("fieldIsActive"),
      yesNo,
      editLabel: t("editOpen"),
    },
    { canManage }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={t("title")}
      description={t("description")}
      surfaceKey="hrm:geolocation:policies"
      listConfiguration={listConfiguration}
      headerSlot={
        canManage ? (
          <div className="flex justify-end">
            <RemoteCheckinPolicyDialog orgSlug={orgSlug} mode="create" />
          </div>
        ) : null
      }
      trailingColumn={{
        header: t("editOpen"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          if (
            !row ||
            !isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)
          ) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={surfaceRow.trailingAction}>
              <RemoteCheckinPolicyDialog
                orgSlug={orgSlug}
                mode="edit"
                defaults={{
                  policyId: row.id,
                  scopeKind: toFormScope(row.scopeKind),
                  scopeRef: row.scopeRef,
                  minGpsAccuracyMeters: row.minGpsAccuracyMeters,
                  allowedRadiusBufferMeters: row.allowedRadiusBufferMeters,
                  shiftWindowMinutes: row.shiftWindowMinutes,
                  breakWindowMinutes: row.breakWindowMinutes,
                  requireRegisteredDevice: row.requireRegisteredDevice,
                  requireSelfie: row.requireSelfie,
                  detectSpoofing: row.detectSpoofing,
                  allowEligibilityException: row.allowEligibilityException,
                  isActive: row.isActive,
                }}
              />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
