import type { LynxNlDemoChartConfig } from "../schemas/nl-sql-demo.schema"

type InputDataPoint = Record<string, string | number | null>

interface TransformedDataPoint {
  [key: string]: string | number | null
}

interface TransformationResult {
  data: TransformedDataPoint[]
  xAxisField: string
  lineFields: string[]
}

/** Pivot wide-format rows for multi-series line charts (demo parity). */
export function transformLynxNlDemoDataForMultiLineChart(
  data: InputDataPoint[],
  chartConfig: LynxNlDemoChartConfig
): TransformationResult {
  const { xKey, lineCategories, measurementColumn } = chartConfig

  if (data.length === 0) {
    return { data: [], xAxisField: xKey, lineFields: lineCategories ?? [] }
  }

  const fields = Object.keys(data[0]!)
  const xAxisField = xKey
  const lineField =
    fields.find((field) => lineCategories?.includes(String(data[0]![field]))) ??
    ""

  const xAxisValues = Array.from(
    new Set(data.map((item) => String(item[xAxisField])))
  )

  const transformedData: TransformedDataPoint[] = xAxisValues.map((xValue) => {
    const dataPoint: TransformedDataPoint = { [xAxisField]: xValue }
    lineCategories?.forEach((category) => {
      const matchingItem = data.find(
        (item) =>
          String(item[xAxisField]) === xValue &&
          String(item[lineField]) === category
      )
      dataPoint[category] = matchingItem
        ? matchingItem[measurementColumn ?? ""]
        : null
    })
    return dataPoint
  })

  transformedData.sort((a, b) => Number(a[xAxisField]) - Number(b[xAxisField]))

  return {
    data: transformedData,
    xAxisField,
    lineFields: lineCategories ?? [],
  }
}
