import { Badge } from "#components2/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "#components2/ui/card"
import { GovernedEmpty } from "#features/governed-surface/client"
import {
  parseGovernedApprovalTimelineConfiguration,
  type ApprovalTimelineDataNature,
  type ApprovalTimelineStepStatus,
} from "#features/governed-surface/schemas/approval-timeline.schema"
import { cn } from "#lib/utils"

import type { GovernedComponentRendererDiagnostics } from "../registry"

const DATA_NATURE_CLASS: Record<ApprovalTimelineDataNature, string> = {
  "approval-flow": "@container flex flex-col gap-3",
}

const STATUS_VARIANT: Record<
  ApprovalTimelineStepStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  active: "default",
  complete: "secondary",
  rejected: "destructive",
  skipped: "outline",
}

export type ApprovalTimelineRendererProps = {
  configuration: unknown
  diagnostics?: GovernedComponentRendererDiagnostics
}

export function ApprovalTimelineRenderer({
  configuration,
  diagnostics = "user",
}: ApprovalTimelineRendererProps) {
  const parsed = parseGovernedApprovalTimelineConfiguration(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Timeline unavailable",
          description:
            diagnostics === "operator"
              ? "The approval timeline configuration failed validation."
              : "This timeline could not be loaded safely.",
        }}
      />
    )
  }

  const { dataNature, title, steps } = parsed.data

  return (
    <section
      aria-label={title ?? "Approval timeline"}
      className={DATA_NATURE_CLASS[dataNature]}
    >
      <Card>
        {title ? (
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
        ) : null}
        <CardContent className={cn("flex flex-col gap-3", title && "pt-0")}>
          <ol className="flex flex-col gap-3">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    <Badge variant={STATUS_VARIANT[step.status]}>
                      {step.status}
                    </Badge>
                  </div>
                  {step.actorLabel ? (
                    <p className="text-xs text-muted-foreground">
                      {step.actorLabel}
                    </p>
                  ) : null}
                  {step.note ? (
                    <p className="text-xs text-muted-foreground">{step.note}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  )
}
