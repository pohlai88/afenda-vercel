"use client"

import { useCallback, useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import {
  executeLynxNlDemoSqlAction,
  explainLynxNlDemoSqlAction,
  generateLynxNlDemoSqlAction,
  suggestLynxNlDemoChartAction,
} from "../actions/nl-sql-demo.actions"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs"

import {
  stableNlDemoExplanationKeys,
  stableNlDemoResultRowKeys,
} from "../schemas/nl-sql-demo-list-keys.shared"
import type {
  LynxNlDemoChartConfig,
  LynxNlDemoResultRow,
} from "../schemas/nl-sql-demo.schema"

import { NlSqlDemoDynamicChart } from "./nl-sql-demo-dynamic-chart"

type ExplainRow = { section: string; explanation: string }

export function NlSqlDemoClient() {
  const t = useTranslations("Dashboard.Lynx.nlDemo")
  const [question, setQuestion] = useState("")
  const [sqlText, setSqlText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<LynxNlDemoResultRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [chartConfig, setChartConfig] = useState<LynxNlDemoChartConfig | null>(
    null
  )
  const [explanations, setExplanations] = useState<ExplainRow[] | null>(null)

  const rowKeys = useMemo(
    () => stableNlDemoResultRowKeys(rows, columns),
    [rows, columns]
  )

  const explanationKeys = useMemo(
    () =>
      explanations?.length
        ? stableNlDemoExplanationKeys(explanations)
        : null,
    [explanations]
  )

  const reset = useCallback(() => {
    setQuestion("")
    setSqlText("")
    setError(null)
    setRows([])
    setColumns([])
    setChartConfig(null)
    setExplanations(null)
  }, [])

  const runPipeline = useCallback(async () => {
    const q = question.trim()
    if (!q) return

    setBusy(true)
    setError(null)
    setRows([])
    setColumns([])
    setChartConfig(null)
    setExplanations(null)

    try {
      const gen = await generateLynxNlDemoSqlAction(q)
      if (!gen.ok) {
        setError(gen.error)
        return
      }
      setSqlText(gen.sql)

      const ran = await executeLynxNlDemoSqlAction(gen.sql)
      if (!ran.ok) {
        setError(ran.error)
        return
      }
      setRows(ran.rows)
      setColumns(ran.columns)

      if (
        ran.rows.length >= 2 &&
        ran.columns.length >= 2 &&
        Object.keys(ran.rows[0] ?? {}).length >= 2
      ) {
        const chart = await suggestLynxNlDemoChartAction(q, ran.rows)
        if (chart.ok) {
          setChartConfig(chart.config)
        }
      }
    } catch {
      setError(t("errorGeneric"))
    } finally {
      setBusy(false)
    }
  }, [question, t])

  const loadExplanation = useCallback(async () => {
    const q = question.trim()
    if (!q || !sqlText.trim()) return
    setBusy(true)
    setError(null)
    try {
      const exp = await explainLynxNlDemoSqlAction(q, sqlText)
      if (!exp.ok) {
        setError(exp.error)
        return
      }
      setExplanations(exp.explanations)
    } catch {
      setError(t("errorGeneric"))
    } finally {
      setBusy(false)
    }
  }, [question, sqlText, t])

  const chartDisabled =
    rows.length < 2 ||
    columns.length < 2 ||
    Object.keys(rows[0] ?? {}).length <= 1

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div>
        <h2 className="font-medium">{t("sectionTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("sectionDescription")}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <label htmlFor="lynx-nl-demo-q" className="text-sm font-medium">
            {t("labelQuestion")}
          </label>
          <Input
            id="lynx-nl-demo-q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("placeholderQuestion")}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void runPipeline()
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void runPipeline()}
            disabled={busy || !question.trim()}
          >
            {busy ? t("pending") : t("submit")}
          </Button>
          {(sqlText || rows.length > 0) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={busy}
            >
              {t("clear")}
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {sqlText ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("headingSql")}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadExplanation()}
              disabled={busy}
            >
              {t("explainSql")}
            </Button>
          </div>
          <pre className="max-h-48 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
            {sqlText}
          </pre>
        </div>
      ) : null}

      {explanations && explanationKeys ? (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">{t("headingExplain")}</h3>
          <ul className="space-y-2 text-sm">
            {explanations.map((row, i) => (
              <li
                key={explanationKeys[i]}
                className="rounded-lg border bg-muted/30 px-3 py-2"
              >
                <p className="font-mono text-xs text-muted-foreground">
                  {row.section}
                </p>
                {row.explanation ? (
                  <p className="mt-1">{row.explanation}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="border-t pt-4">
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table">{t("tabTable")}</TabsTrigger>
              <TabsTrigger value="charts" disabled={chartDisabled}>
                {t("tabChart")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="table" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, ri) => (
                    <TableRow key={rowKeys[ri]}>
                      {columns.map((col) => (
                        <TableCell key={col}>
                          {row[col] === null || row[col] === undefined
                            ? "—"
                            : String(row[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="charts" className="mt-4">
              {chartConfig ? (
                <NlSqlDemoDynamicChart
                  chartData={rows}
                  chartConfig={chartConfig}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("chartPending")}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </section>
  )
}
