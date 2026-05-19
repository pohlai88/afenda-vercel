"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "#components2/ui/chart"
import type { GovernedChartConfiguration } from "#features/governed-surface/schemas/chart.schema"

type ChartRendererBodyProps = {
  configuration: GovernedChartConfiguration
}

function buildChartConfig(
  series: GovernedChartConfiguration["series"]
): ChartConfig {
  return Object.fromEntries(
    series.map((entry, index) => [
      entry.id,
      {
        label: entry.label,
        color: entry.color ?? `var(--chart-${(index % 5) + 1})`,
      },
    ])
  )
}

function flattenSeries(
  series: GovernedChartConfiguration["series"]
): Array<Record<string, string | number>> {
  const byX = new Map<string, Record<string, string | number>>()

  for (const entry of series) {
    for (const point of entry.points) {
      const row = byX.get(point.x) ?? { x: point.x }
      row[entry.id] = point.y
      byX.set(point.x, row)
    }
  }

  return [...byX.values()]
}

export function ChartRendererBody({ configuration }: ChartRendererBodyProps) {
  const chartConfig = buildChartConfig(configuration.series)
  const data = flattenSeries(configuration.series)
  const seriesKeys = configuration.series.map((entry) => entry.id)

  return (
    <ChartContainer config={chartConfig} className="min-h-[12rem] w-full">
      {configuration.chartKind === "bar" ? (
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="x" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {seriesKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              radius={4}
            />
          ))}
        </BarChart>
      ) : configuration.chartKind === "area" ? (
        <AreaChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="x" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {seriesKeys.map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${key})`}
              fill={`var(--color-${key})`}
              fillOpacity={0.25}
            />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="x" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {seriesKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      )}
    </ChartContainer>
  )
}
