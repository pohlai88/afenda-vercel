"use client"

import { useEffect, useState } from "react"
import { Check, LayoutGrid } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "./workbench-utility-round-control-class"
import { WorkbenchUtilityTriggerTooltip } from "./workbench-utility-trigger-tooltip"

const LAYOUT_DENSITIES = ["comfortable", "compact", "relaxed"] as const
type LayoutDensity = (typeof LAYOUT_DENSITIES)[number]

const STORAGE_KEY = "afenda.layoutDensity"

function isLayoutDensity(value: string | null): value is LayoutDensity {
  return value === "compact" || value === "comfortable" || value === "relaxed"
}

function applyLayoutDensity(next: LayoutDensity) {
  if (typeof document === "undefined") return
  document.documentElement.dataset.layoutDensity = next
}

function readLayoutDensity(): LayoutDensity {
  if (typeof window === "undefined") return "comfortable"
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    return isLayoutDensity(storedValue) ? storedValue : "comfortable"
  } catch {
    return "comfortable"
  }
}

export function WorkbenchUtilityLayoutDensity() {
  const t = useTranslations("Dashboard.shell.utilityBar.density")
  const [density, setDensity] = useState<LayoutDensity>(() =>
    readLayoutDensity()
  )

  useEffect(() => {
    applyLayoutDensity(density)
  }, [density])

  const selectDensity = (next: LayoutDensity) => {
    setDensity(next)
    applyLayoutDensity(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <DropdownMenu>
      <WorkbenchUtilityTriggerTooltip tooltip={t("tooltip")} align="end">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            className={cn(WORKBENCH_UTILITY_ROUND_CONTROL_CLASS)}
          >
            <LayoutGrid
              className="size-[15px] shrink-0"
              aria-hidden
              strokeWidth={2}
            />
          </button>
        </DropdownMenuTrigger>
      </WorkbenchUtilityTriggerTooltip>

      <DropdownMenuContent align="end" className="min-w-[12rem]">
        {LAYOUT_DENSITIES.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => selectDensity(option)}
            className="flex items-center gap-2"
          >
            <span>{t(option)}</span>
            {density === option ? (
              <Check className="ml-auto size-3.5 text-muted-foreground" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
