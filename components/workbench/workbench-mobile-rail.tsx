"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { PanelLeftIcon } from "lucide-react"

import { Button } from "#components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "#components/ui/sheet"

type MobileRailContextValue = {
  open: boolean
  openRail: () => void
  closeRail: () => void
}

const MobileRailContext = createContext<MobileRailContextValue | null>(null)

export function WorkbenchMobileRailProvider({
  children,
}: {
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const openRail = useCallback(() => setOpen(true), [])
  const closeRail = useCallback(() => setOpen(false), [])
  const value = useMemo(
    () => ({ open, openRail, closeRail }),
    [open, openRail, closeRail]
  )
  return (
    <MobileRailContext.Provider value={value}>
      {children}
    </MobileRailContext.Provider>
  )
}

export function useMobileRail(): MobileRailContextValue {
  const ctx = useContext(MobileRailContext)
  if (!ctx)
    throw new Error("useMobileRail must be inside WorkbenchMobileRailProvider")
  return ctx
}

/** Hamburger trigger — renders in the surface header on mobile. */
export function WorkbenchMobileRailTrigger({
  label = "Open navigation",
}: {
  label?: string
}) {
  const { openRail } = useMobileRail()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 md:hidden"
      aria-label={label}
      onClick={openRail}
    >
      <PanelLeftIcon className="h-4 w-4" />
    </Button>
  )
}

/** Sheet that renders the rail on mobile. */
export function WorkbenchMobileRailSheet({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  const { open, closeRail } = useMobileRail()
  return (
    <Sheet open={open} onOpenChange={(v) => !v && closeRail()}>
      <SheetContent
        side="left"
        className="w-56 border-r p-0"
        onInteractOutside={closeRail}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {description && (
          <SheetDescription className="sr-only">{description}</SheetDescription>
        )}
        {children}
      </SheetContent>
    </Sheet>
  )
}
