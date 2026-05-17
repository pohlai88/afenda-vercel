import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Separator } from "#components2/ui/separator"

import { InitiateOffboardingForm } from "../../offboarding-exit-management/components/initiate-offboarding-form"
import { OffboardingPanel } from "../../offboarding-exit-management/components/offboarding-panel"
import {
  RecordExitInterviewFeedbackForm,
  ScheduleExitInterviewForm,
  SetRehireEligibilityForm,
  UpdateSettlementReadinessForm,
} from "../../offboarding-exit-management/components/offboarding-hr-actions"
import type { OffboardingSurfaceCapabilities } from "../../offboarding-exit-management/data/offboarding-capabilities.shared"
import { listOpenOffboardingForEmployee } from "../../offboarding-exit-management/data/offboarding.queries.server"

type EmployeeDetailOffboardingSectionProps = {
  orgSlug: string
  organizationId: string
  employeeId: string
  capabilities: OffboardingSurfaceCapabilities
}

export async function EmployeeDetailOffboardingSection({
  orgSlug,
  organizationId,
  employeeId,
  capabilities,
}: EmployeeDetailOffboardingSectionProps) {
  const [t, instances] = await Promise.all([
    getTranslations("Dashboard.Hrm.workforce"),
    listOpenOffboardingForEmployee(organizationId, employeeId),
  ])

  const hasOpenInstances = instances.length > 0
  const canInitiate = !hasOpenInstances && capabilities.canCreate

  if (!hasOpenInstances && !canInitiate) {
    return null
  }

  return (
    <Card id="offboarding" size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("offboardingSectionTitle")}</CardTitle>
        <CardDescription>{t("offboardingSectionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasOpenInstances ? (
          <>
            <OffboardingPanel
              orgSlug={orgSlug}
              employeeId={employeeId}
              instances={instances}
              canCompleteTasks={capabilities.canUpdate}
            />
            {capabilities.canUpdate
              ? instances
                  .filter((inst) => inst.status === "open")
                  .map((inst) => (
                    <div key={inst.id} className="flex flex-col gap-4">
                      <Separator />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        HR Actions
                      </p>

                      {/* Exit interview */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Exit interview</p>
                          {inst.exitInterviewScheduledAt ? (
                            <Badge variant="outline" className="text-xs">
                              Scheduled {inst.exitInterviewScheduledAt.toLocaleDateString()}
                            </Badge>
                          ) : null}
                          {inst.exitInterviewCompletedAt ? (
                            <Badge variant="success" className="text-xs">
                              Completed
                            </Badge>
                          ) : null}
                        </div>
                        {!inst.exitInterviewScheduledAt ? (
                          <ScheduleExitInterviewForm
                            orgSlug={orgSlug}
                            instanceId={inst.id}
                            employeeId={employeeId}
                          />
                        ) : !inst.exitInterviewCompletedAt ? (
                          <RecordExitInterviewFeedbackForm
                            orgSlug={orgSlug}
                            instanceId={inst.id}
                            employeeId={employeeId}
                          />
                        ) : null}
                      </div>

                      {/* Settlement readiness */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Settlement readiness</p>
                          <Badge variant="outline" className="text-xs">
                            {inst.settlementReadinessStatus}
                          </Badge>
                        </div>
                        <UpdateSettlementReadinessForm
                          orgSlug={orgSlug}
                          instanceId={inst.id}
                          employeeId={employeeId}
                        />
                      </div>

                      {/* Rehire eligibility */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Rehire eligibility</p>
                          {inst.rehireEligibility ? (
                            <Badge variant="secondary" className="text-xs">
                              {inst.rehireEligibility}
                            </Badge>
                          ) : null}
                        </div>
                        <SetRehireEligibilityForm
                          orgSlug={orgSlug}
                          instanceId={inst.id}
                          employeeId={employeeId}
                        />
                      </div>
                    </div>
                  ))
              : null}
          </>
        ) : null}
        {!hasOpenInstances && canInitiate ? (
          <InitiateOffboardingForm orgSlug={orgSlug} employeeId={employeeId} />
        ) : null}
      </CardContent>
    </Card>
  )
}
