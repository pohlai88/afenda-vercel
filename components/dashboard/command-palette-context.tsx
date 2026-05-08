"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"

type CommandPaletteContextValue = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  toggle: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null
)

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false)

  const setOpen = useCallback((value: SetStateAction<boolean>) => {
    setOpenState(value)
  }, [])

  const toggle = useCallback(() => {
    setOpenState((v) => !v)
  }, [])

  const value = useMemo<CommandPaletteContextValue>(
    () => ({ open, setOpen, toggle }),
    [open, setOpen, toggle]
  )

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider"
    )
  }
  return ctx
}
