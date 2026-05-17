import { Card, CardContent, CardHeader, CardTitle } from "#components2/ui/card"
import { GovernedEmpty } from "#features/governed-surface"
import {
  parseGovernedChartConfiguration,
  type ChartDataNature,
} from "#features/governed-surface/schemas/chart.schema"

import type { GovernedComponentRendererDiagnostics } from "../registry"
import { ChartRendererBody } from "./chart-renderer-body.client"

const DATA_NATURE_CLASS: Record<ChartDataNature, string> = {
  "time-series": "@container min-h-[14rem]",
  categorical: "@container min-h-[14rem]",
}

export type ChartRendererProps = {
  configuration: unknown
  diagnostics?: GovernedComponentRendererDiagnostics
}

export function ChartRenderer({
  configuration,
  diagnostics = "user",
}: ChartRendererProps) {
  const parsed = parseGovernedChartConfiguration(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Chart unavailable",
          description:
            diagnostics === "operator"
              ? "The chart configuration failed validation."
              : "This chart could not be loaded safely.",
        }}
      />
    )
  }

  const { dataNature, title } = parsed.data

  return (
    <section
      aria-label={title ?? "Chart"}
      className={DATA_NATURE_CLASS[dataNature]}
    >
      <Card>
        {title ? (
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
        ) : null}
        <CardContent className={title ? "pt-0" : undefined}>
          <ChartRendererBody configuration={parsed.data} />
        </CardContent>
      </Card>
    </section>
  )
}
