"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type NexusCommandContextValue = {
  open: boolean
  openCommand: () => void
  closeCommand: () => void
  toggleCommand: () => void
}

const NexusCommandContext = createContext<NexusCommandContextValue | null>(null)

export function NexusCommandProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openCommand = useCallback(() => setOpen(true), [])
  const closeCommand = useCallback(() => setOpen(false), [])
  const toggleCommand = useCallback(() => setOpen((v) => !v), [])

  const value = useMemo<NexusCommandContextValue>(
    () => ({ open, openCommand, closeCommand, toggleCommand }),
    [open, openCommand, closeCommand, toggleCommand]
  )

  return (
    <NexusCommandContext.Provider value={value}>
      {children}
    </NexusCommandContext.Provider>
  )
}

export function useNexusCommand(): NexusCommandContextValue {
  const ctx = useContext(NexusCommandContext)
  if (!ctx) {
    throw new Error("useNexusCommand must be used within NexusCommandProvider")
  }
  return ctx
}
