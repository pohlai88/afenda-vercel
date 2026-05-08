"use client"

import { useCallback, useState } from "react"
import { useTranslations } from "next-intl"

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

import {
  executeLynxTodoNlDemoSqlAction,
  generateLynxTodoNlDemoSqlAction,
} from "../actions/todo-nl-demo.actions"
import type { LynxNlDemoResultRow } from "../schemas/nl-sql-demo.schema"

export function TodoNlDemoClient() {
  const t = useTranslations("Dashboard.Lynx.nlDemoTodo")
  const [question, setQuestion] = useState("")
  const [sqlText, setSqlText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<LynxNlDemoResultRow[]>([])
  const [columns, setColumns] = useState<string[]>([])

  const runPipeline = useCallback(async () => {
    const q = question.trim()
    if (!q) return

    setBusy(true)
    setError(null)
    setRows([])
    setColumns([])

    try {
      const gen = await generateLynxTodoNlDemoSqlAction(q)
      if (!gen.ok) {
        setError(gen.error)
        return
      }
      setSqlText(gen.sql)

      const ran = await executeLynxTodoNlDemoSqlAction(gen.sql)
      if (!ran.ok) {
        setError(ran.error)
        return
      }
      setRows(ran.rows)
      setColumns(ran.columns)
    } catch {
      setError(t("errorGeneric"))
    } finally {
      setBusy(false)
    }
  }, [question, t])

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div>
        <h2 className="font-medium">{t("sectionTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("sectionDescription")}
        </p>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="lynx-todo-nl-q">
          {t("labelQuestion")}
        </label>
        <Input
          id="lynx-todo-nl-q"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("placeholderQuestion")}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={runPipeline} disabled={busy}>
          {busy ? t("pending") : t("submit")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setQuestion("")
            setSqlText("")
            setError(null)
            setRows([])
            setColumns([])
          }}
        >
          {t("clear")}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {sqlText ? (
        <div>
          <h3 className="mb-1 text-sm font-medium">{t("headingSql")}</h3>
          <pre className="max-h-40 overflow-auto rounded-md border bg-muted p-3 text-xs">
            {sqlText}
          </pre>
        </div>
      ) : null}
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c}>{String(row[c] ?? "")}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </section>
  )
}
