import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { getOrCreateShiftSchedulingPolicy } from "../data/sft-policy.server"
import { SftPolicyForm } from "./sft-authoring-forms.client"

export async function SftPolicySection({
  organizationId,
  canManage,
}: {
  organizationId: string
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")
  const policy = await getOrCreateShiftSchedulingPolicy(organizationId)

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("policyTitle")}</CardTitle>
        <CardDescription>
          {canManage
            ? t("policyDescriptionManage")
            : t("policySummary", {
                minRest: policy.minRestMinutesBetweenShifts,
                maxWeekly: policy.maxScheduledMinutesPerWeek,
                warn: policy.warnOnConflict ? t("yes") : t("no"),
                block: policy.blockOnConflict ? t("yes") : t("no"),
              })}
        </CardDescription>
      </CardHeader>
      {canManage ? (
        <CardContent>
          <SftPolicyForm
            minRestMinutesBetweenShifts={policy.minRestMinutesBetweenShifts}
            maxScheduledMinutesPerWeek={policy.maxScheduledMinutesPerWeek}
            warnOnConflict={policy.warnOnConflict}
            blockOnConflict={policy.blockOnConflict}
          />
        </CardContent>
      ) : null}
    </Card>
  )
}
