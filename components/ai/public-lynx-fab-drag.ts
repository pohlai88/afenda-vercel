"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { LYNX_TRIGGER_SIZE_PX } from "#lib/ask-docs/lynx-brand.shared"

/** Persisted FAB position for Ask Lynx on public ask-docs. */
export const PUBLIC_LYNX_FAB_STORAGE_KEY = "afenda:public-lynx-fab-pos"

const PUBLIC_LYNX_FAB_SIZE_PX = LYNX_TRIGGER_SIZE_PX
const PUBLIC_LYNX_FAB_EDGE_PADDING_PX = 16
const PUBLIC_LYNX_FAB_DRAG_THRESHOLD_PX = 8

function clampPublicLynxFabPosition(
  right: number,
  bottom: number
): { right: number; bottom: number } {
  if (typeof window === "undefined") {
    return { right, bottom }
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxRight = Math.max(
    PUBLIC_LYNX_FAB_EDGE_PADDING_PX,
    vw - PUBLIC_LYNX_FAB_SIZE_PX - PUBLIC_LYNX_FAB_EDGE_PADDING_PX
  )
  const maxBottom = Math.max(
    PUBLIC_LYNX_FAB_EDGE_PADDING_PX,
    vh - PUBLIC_LYNX_FAB_SIZE_PX - PUBLIC_LYNX_FAB_EDGE_PADDING_PX
  )
  return {
    right: Math.min(maxRight, Math.max(PUBLIC_LYNX_FAB_EDGE_PADDING_PX, right)),
    bottom: Math.min(
      maxBottom,
      Math.max(PUBLIC_LYNX_FAB_EDGE_PADDING_PX, bottom)
    ),
  }
}

/**
 * Draggable fixed FAB position for Public Lynx (`right` / `bottom`), persisted in
 * {@link PUBLIC_LYNX_FAB_STORAGE_KEY}. Tap vs drag uses the same threshold pattern
 * as {@link useLynxSummonFabDrag} and the dev sign-in panel.
 */
export function usePublicLynxFabDrag() {
  const [pos, setPos] = useState({
    right: PUBLIC_LYNX_FAB_EDGE_PADDING_PX,
    bottom: PUBLIC_LYNX_FAB_EDGE_PADDING_PX,
  })
  const posRef = useRef(pos)

  useLayoutEffect(() => {
    posRef.current = pos
  }, [pos])

  const [isDragging, setIsDragging] = useState(false)
  const suppressClickRef = useRef(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startRight: number
    startBottom: number
  } | null>(null)
  const removeActiveDragListenersRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(PUBLIC_LYNX_FAB_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as {
            right?: unknown
            bottom?: unknown
          }
          const right = Number(parsed.right)
          const bottom = Number(parsed.bottom)
          if (Number.isFinite(right) && Number.isFinite(bottom)) {
            setPos(clampPublicLynxFabPosition(right, bottom))
            return
          }
        }
      } catch {
        /* ignore corrupt storage */
      }
      setPos((prev) => clampPublicLynxFabPosition(prev.right, prev.bottom))
    })
    return () => cancelAnimationFrame(handle)
  }, [])

  useEffect(() => {
    function onResize() {
      setPos((prev) => clampPublicLynxFabPosition(prev.right, prev.bottom))
    }
    window.addEventListener("resize", onResize, { passive: true })
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    return () => {
      removeActiveDragListenersRef.current?.()
      removeActiveDragListenersRef.current = null
    }
  }, [])

  const persistPos = useCallback((next: { right: number; bottom: number }) => {
    try {
      localStorage.setItem(PUBLIC_LYNX_FAB_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const consumeClickSuppression = useCallback(() => {
    if (!suppressClickRef.current) return false
    suppressClickRef.current = false
    return true
  }, [])

  const fabPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      removeActiveDragListenersRef.current?.()

      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startRight: posRef.current.right,
        startBottom: posRef.current.bottom,
      }
      suppressClickRef.current = false
      setIsDragging(true)

      const applyMove = (ev: PointerEvent) => {
        const d = dragRef.current
        if (!d || ev.pointerId !== d.pointerId) return
        const dx = ev.clientX - d.startX
        const dy = ev.clientY - d.startY
        if (
          Math.abs(dx) > PUBLIC_LYNX_FAB_DRAG_THRESHOLD_PX ||
          Math.abs(dy) > PUBLIC_LYNX_FAB_DRAG_THRESHOLD_PX
        ) {
          suppressClickRef.current = true
        }
        const next = clampPublicLynxFabPosition(
          d.startRight - dx,
          d.startBottom - dy
        )
        setPos(next)
      }

      const finishDrag = (ev: PointerEvent) => {
        const d = dragRef.current
        if (!d || ev.pointerId !== d.pointerId) return

        removeActiveDragListenersRef.current?.()
        removeActiveDragListenersRef.current = null
        dragRef.current = null
        setIsDragging(false)

        let next: { right: number; bottom: number }
        if (ev.type === "pointercancel") {
          next = clampPublicLynxFabPosition(
            posRef.current.right,
            posRef.current.bottom
          )
        } else {
          const dx = ev.clientX - d.startX
          const dy = ev.clientY - d.startY
          if (
            Math.abs(dx) > PUBLIC_LYNX_FAB_DRAG_THRESHOLD_PX ||
            Math.abs(dy) > PUBLIC_LYNX_FAB_DRAG_THRESHOLD_PX
          ) {
            suppressClickRef.current = true
          }
          next = clampPublicLynxFabPosition(
            d.startRight - dx,
            d.startBottom - dy
          )
        }
        setPos(next)
        persistPos(next)
      }

      const remove = () => {
        window.removeEventListener("pointermove", applyMove)
        window.removeEventListener("pointerup", finishDrag)
        window.removeEventListener("pointercancel", finishDrag)
      }
      removeActiveDragListenersRef.current = remove

      window.addEventListener("pointermove", applyMove)
      window.addEventListener("pointerup", finishDrag)
      window.addEventListener("pointercancel", finishDrag)
    },
    [persistPos]
  )

  return {
    fabPosition: pos,
    isDraggingFab: isDragging,
    fabPointerDown,
    consumeClickSuppression,
  }
}
