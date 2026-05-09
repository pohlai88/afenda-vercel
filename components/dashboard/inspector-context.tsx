"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { writeClientPreferenceCookie } from "#lib/client-cookie.shared"

export const INSPECTOR_COOKIE_NAME = "inspector_state"
const INSPECTOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function readInspectorCookie(): boolean {
  if (typeof document === "undefined") return false
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${INSPECTOR_COOKIE_NAME}=`))
  return match?.split("=")[1] === "true"
}

function writeInspectorCookie(value: boolean): void {
  writeClientPreferenceCookie({
    name: INSPECTOR_COOKIE_NAME,
    value,
    maxAgeSeconds: INSPECTOR_COOKIE_MAX_AGE,
  })
}

type InspectorContextValue = {
  open: boolean
  content: ReactNode
  openInspector: (node: ReactNode) => void
  closeInspector: () => void
  toggleInspector: () => void
  setContent: (node: ReactNode) => void
}

const InspectorContext = createContext<InspectorContextValue | null>(null)

export function InspectorProvider({
  children,
  defaultOpen,
}: {
  children: ReactNode
  /** Server-read initial state (from cookie). Falls back to client cookie on hydration. */
  defaultOpen?: boolean
}) {
  const [open, setOpenState] = useState<boolean>(() => {
    // On the server (SSR), use the prop passed from the layout.
    // On the client, try the cookie first for hydration consistency.
    if (typeof document !== "undefined") return readInspectorCookie()
    return defaultOpen ?? false
  })
  const [content, setContentState] = useState<ReactNode>(null)

  const contentRef = useRef<ReactNode>(null)

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value)
    writeInspectorCookie(value)
  }, [])

  const setContent = useCallback((node: ReactNode) => {
    contentRef.current = node
    setContentState(node)
  }, [])

  const openInspector = useCallback(
    (node: ReactNode) => {
      setContent(node)
      setOpen(true)
    },
    [setContent, setOpen]
  )

  const closeInspector = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  const toggleInspector = useCallback(() => {
    setOpen(!open)
  }, [open, setOpen])

  const value = useMemo<InspectorContextValue>(
    () => ({
      open,
      content,
      openInspector,
      closeInspector,
      toggleInspector,
      setContent,
    }),
    [open, content, openInspector, closeInspector, toggleInspector, setContent]
  )

  return (
    <InspectorContext.Provider value={value}>
      {children}
    </InspectorContext.Provider>
  )
}

export function useInspector(): InspectorContextValue {
  const ctx = useContext(InspectorContext)
  if (!ctx) {
    throw new Error("useInspector must be used within an InspectorProvider")
  }
  return ctx
}
