"use client"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import type { WorkbenchRailContextItem } from "./workbench-rail.types"

type WorkbenchRailContextProps = {
  context: WorkbenchRailContextItem[]
  contextLabel: string
}

export function WorkbenchRailContext({
  context,
  contextLabel,
}: WorkbenchRailContextProps) {
  if (context.length === 0) return null

  return (
    <section className="space-y-2.5 pt-6">
      {contextLabel ? (
        <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {contextLabel}
        </p>
      ) : null}
      {/*
       * Plain <div> grid — <dl> cannot have <a> as a direct child (HTML spec:
       * only <div>/<dt>/<dd> are valid), and <dt>/<dd> inside <a> is also
       * invalid. Using <p> pairs inside <div>/<Link> preserves the same
       * visual structure without violating the HTML content model.
       */}
      <div className="grid gap-2 text-sm">
        {context.map((item) =>
          item.href ? (
            <Link
              key={`${item.label}-${item.value}`}
              href={item.href}
              className="rounded-xl px-3 py-2 transition-colors hover:bg-muted/45"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className={cn(
                  "pt-0.5 text-sm font-medium",
                  item.tone === "positive" &&
                    "text-emerald-700 dark:text-emerald-300",
                  item.tone === "attention" &&
                    "text-amber-700 dark:text-amber-300",
                  (!item.tone || item.tone === "default") && "text-foreground"
                )}
              >
                {item.value}
              </p>
            </Link>
          ) : (
            <div
              key={`${item.label}-${item.value}`}
              className="rounded-xl px-3 py-2"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className={cn(
                  "pt-0.5 text-sm font-medium",
                  item.tone === "positive" &&
                    "text-emerald-700 dark:text-emerald-300",
                  item.tone === "attention" &&
                    "text-amber-700 dark:text-amber-300",
                  (!item.tone || item.tone === "default") && "text-foreground"
                )}
              >
                {item.value}
              </p>
            </div>
          )
        )}
      </div>
    </section>
  )
}
