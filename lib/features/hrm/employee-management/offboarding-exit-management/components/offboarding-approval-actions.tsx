import { getTranslations } from "next-intl/server"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"

import { reviewOffboardingApprovalFormAction } from "../actions/offboarding.actions"
import type { OffboardingSurfaceCapabilities } from "../data/offboarding-capabilities.shared"

type OffboardingApprovalActionsProps = {
  orgSlug: string
  employeeId: string
  instanceId: string
  capabilities: OffboardingSurfaceCapabilities
}

export async function OffboardingApprovalActions({
  orgSlug,
  employeeId,
  instanceId,
  capabilities,
}: OffboardingApprovalActionsProps) {
  const t = await getTranslations("Dashboard.Hrm.offboarding")

  if (!capabilities.canUpdate) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("readOnlyApproval")}
      </span>
    )
  }

  return (
    <div className="flex min-w-[14rem] flex-col gap-2">
      <form
        action={reviewOffboardingApprovalFormAction}
        className="flex flex-col gap-1"
      >
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="instanceId" value={instanceId} />
        <input type="hidden" name="decision" value="approved" />
        <Input
          name="reviewNote"
          placeholder={t("approvalNotePlaceholder")}
          className="h-8 text-xs"
        />
        <Button type="submit" size="sm" variant="secondary">
          {t("approveSubmit")}
        </Button>
      </form>
      <form
        action={reviewOffboardingApprovalFormAction}
        className="flex flex-col gap-1"
      >
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="instanceId" value={instanceId} />
        <input type="hidden" name="decision" value="rejected" />
        <Button type="submit" size="sm" variant="outline">
          {t("rejectSubmit")}
        </Button>
      </form>
    </div>
  )
}
