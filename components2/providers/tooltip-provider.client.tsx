"use client"

import type { ReactNode } from "react"

import { TooltipProvider } from "../ui/tooltip"

/**
 * Shell-scoped TooltipProvider with app-standard delay.
 * Mount once at the AppShell root — all shadcn Tooltip components beneath
 * share the same delay without each needing their own provider.
 */
export function AppShellTooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
}
