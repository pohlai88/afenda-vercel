import { Card, CardContent } from "#components2/ui/card"

import type {
  OperatorContext,
  OrgContext,
  SystemReadiness,
} from "#features/nexus"

/**
 * Orientation band — Section A of the Nexus Field.
 *
 * Answers: "Where am I? · What organization/system context is active?"
 * Material stays `shell` here so the band reads as chrome, not an active reasoning surface.
 */
export type NexusOrientationBandProps = {
  org: OrgContext
  operator: OperatorContext
  readiness: SystemReadiness
}

export function NexusOrientationBand({
  org,
  operator,
  readiness,
}: NexusOrientationBandProps) {
  const operatorDisplay = operator.name?.trim() || operator.email
  const roleLabel = formatRole(org.role)
  const lynxLabel = formatLynxState(readiness.lynxState)
  const readinessLabel = formatReadiness(readiness.status)

  return (
    <Card className="border border-border" size="sm">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Nexus
          </div>
          <div className="text-lg font-semibold text-foreground">
            {org.orgName}
          </div>
          <div className="text-xs text-muted-foreground">
            {operatorDisplay}
            {roleLabel ? ` · ${roleLabel}` : ""}
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <Field label="Operating day" value={operator.operatingDay} />
          <Field
            label="Environment"
            value={formatEnvironment(org.environment)}
          />
          <Field label="Readiness" value={readinessLabel} />
          <Field label="Lynx" value={lynxLabel} />
        </dl>
      </CardContent>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

const ENVIRONMENT_LABEL: Record<OrgContext["environment"], string> = {
  production: "Production",
  staging: "Staging",
  development: "Development",
}

const READINESS_LABEL: Record<SystemReadiness["status"], string> = {
  ready: "Ready",
  degraded: "Degraded",
  outage: "Outage",
}

const LYNX_STATE_LABEL: Record<SystemReadiness["lynxState"], string> = {
  idle: "Idle",
  thinking: "Thinking",
  resolving: "Resolving",
}

function formatRole(role: OrgContext["role"]): string {
  if (!role) return ""
  const labels: Record<NonNullable<OrgContext["role"]>, string> = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
  }
  return labels[role]
}

function formatEnvironment(env: OrgContext["environment"]): string {
  return ENVIRONMENT_LABEL[env]
}

function formatReadiness(status: SystemReadiness["status"]): string {
  return READINESS_LABEL[status]
}

function formatLynxState(state: SystemReadiness["lynxState"]): string {
  return LYNX_STATE_LABEL[state]
}
