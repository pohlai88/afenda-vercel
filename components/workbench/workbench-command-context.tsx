"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type WorkbenchCommandContextValue = {
  open: boolean
  openCommand: () => void
  closeCommand: () => void
  toggleCommand: () => void
}

const WorkbenchCommandContext =
  createContext<WorkbenchCommandContextValue | null>(null)

export function WorkbenchCommandProvider({
  children,
}: {
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  const openCommand = useCallback(() => setOpen(true), [])
  const closeCommand = useCallback(() => setOpen(false), [])
  const toggleCommand = useCallback(() => setOpen((v) => !v), [])

  const value = useMemo<WorkbenchCommandContextValue>(
    () => ({ open, openCommand, closeCommand, toggleCommand }),
    [open, openCommand, closeCommand, toggleCommand]
  )

  return (
    <WorkbenchCommandContext.Provider value={value}>
      {children}
    </WorkbenchCommandContext.Provider>
  )
}

export function useWorkbenchCommand(): WorkbenchCommandContextValue {
  const ctx = useContext(WorkbenchCommandContext)
  if (!ctx) {
    throw new Error(
      "useWorkbenchCommand must be used within WorkbenchCommandProvider"
    )
  }
  return ctx
}
