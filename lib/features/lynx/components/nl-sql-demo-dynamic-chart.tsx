"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { Label } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "#components2/ui/chart"

import { transformLynxNlDemoDataForMultiLineChart } from "../data/nl-sql-demo-rechart.shared"
import type {
  LynxNlDemoChartConfig,
  LynxNlDemoResultRow,
} from "../schemas/nl-sql-demo.schema"

const palette = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

function toTitleCase(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function NlSqlDemoDynamicChart({
  chartData,
  chartConfig,
}: {
  chartData: LynxNlDemoResultRow[]
  chartConfig: LynxNlDemoChartConfig
}) {
  const renderChart = () => {
    if (!chartData.length || !chartConfig) {
      return <div className="text-sm text-muted-foreground">No chart data</div>
    }

    const parsedChartData = chartData.map((item) => {
      const parsedItem: Record<string, string | number | null> = {}
      for (const [key, value] of Object.entries(item)) {
        if (value === null) {
          parsedItem[key] = null
        } else if (typeof value === "number") {
          parsedItem[key] = value
        } else {
          const n = Number(value)
          parsedItem[key] = Number.isNaN(n) ? value : n
        }
      }
      return parsedItem
    })

    let data = parsedChartData

    const trimForBarPie = (rows: typeof data, chartType: string) => {
      if (chartType === "bar" || chartType === "pie") {
        return rows.length <= 8 ? rows : rows.slice(0, 20)
      }
      return rows
    }

    data = trimForBarPie(data, chartConfig.type)

    switch (chartConfig.type) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartConfig.xKey}>
              <Label
                value={toTitleCase(chartConfig.xKey)}
                offset={0}
                position="insideBottom"
              />
            </XAxis>
            <YAxis>
              <Label
                value={toTitleCase(chartConfig.yKeys[0] ?? "")}
                angle={-90}
                position="insideLeft"
              />
            </YAxis>
            <ChartTooltip content={<ChartTooltipContent />} />
            {chartConfig.legend ? <Legend /> : null}
            {chartConfig.yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={palette[index % palette.length]}
              />
            ))}
          </BarChart>
        )
      case "line": {
        const {
          data: pivoted,
          xAxisField,
          lineFields,
        } = transformLynxNlDemoDataForMultiLineChart(data, chartConfig)
        const useTransformedData =
          Boolean(chartConfig.multipleLines) &&
          Boolean(chartConfig.measurementColumn) &&
          chartConfig.yKeys.includes(chartConfig.measurementColumn ?? "")

        const lineKeys = useTransformedData ? lineFields : chartConfig.yKeys
        const chartBody = useTransformedData ? pivoted : data

        return (
          <LineChart data={chartBody}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={useTransformedData ? xAxisField : chartConfig.xKey}>
              <Label
                value={toTitleCase(
                  useTransformedData ? xAxisField : chartConfig.xKey
                )}
                offset={0}
                position="insideBottom"
              />
            </XAxis>
            <YAxis>
              <Label
                value={toTitleCase(chartConfig.yKeys[0] ?? "")}
                angle={-90}
                position="insideLeft"
              />
            </YAxis>
            <ChartTooltip content={<ChartTooltipContent />} />
            {chartConfig.legend ? <Legend /> : null}
            {lineKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={palette[index % palette.length]}
              />
            ))}
          </LineChart>
        )
      }
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartConfig.xKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            {chartConfig.legend ? <Legend /> : null}
            {chartConfig.yKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                fill={palette[index % palette.length]}
                stroke={palette[index % palette.length]}
              />
            ))}
          </AreaChart>
        )
      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={chartConfig.yKeys[0]}
              nameKey={chartConfig.xKey}
              cx="50%"
              cy="50%"
              outerRadius={120}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={palette[index % palette.length]}
                />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            {chartConfig.legend ? <Legend /> : null}
          </PieChart>
        )
      default:
        return (
          <div className="text-sm text-muted-foreground">
            Unsupported chart type
          </div>
        )
    }
  }

  const chartDefinition = chartConfig.yKeys.reduce(
    (acc, key, index) => {
      acc[key] = {
        label: key,
        color: palette[index % palette.length],
      }
      return acc
    },
    {} as Record<string, { label: string; color: string }>
  )

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <h3 className="mb-2 text-lg font-semibold">{chartConfig.title}</h3>
      <ChartContainer config={chartDefinition} className="h-[320px] w-full">
        {renderChart()}
      </ChartContainer>
      <div className="w-full">
        <p className="mt-4 text-sm text-muted-foreground">
          {chartConfig.description}
        </p>
        <p className="mt-2 text-sm">{chartConfig.takeaway}</p>
      </div>
    </div>
  )
}
