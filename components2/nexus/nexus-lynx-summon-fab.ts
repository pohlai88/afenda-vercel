"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

const LYNX_SUMMON_FAB_STORAGE_KEY = "afenda:lynx-summon-fab-pos"
const LYNX_SUMMON_FAB_SIZE_PX = 80
const LYNX_SUMMON_FAB_EDGE_PADDING_PX = 16
const LYNX_SUMMON_FAB_DRAG_THRESHOLD_PX = 8

function clampLynxSummonFabPosition(
  right: number,
  bottom: number
): { right: number; bottom: number } {
  if (typeof window === "undefined") {
    return { right, bottom }
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxRight = Math.max(
    LYNX_SUMMON_FAB_EDGE_PADDING_PX,
    vw - LYNX_SUMMON_FAB_SIZE_PX - LYNX_SUMMON_FAB_EDGE_PADDING_PX
  )
  const maxBottom = Math.max(
    LYNX_SUMMON_FAB_EDGE_PADDING_PX,
    vh - LYNX_SUMMON_FAB_SIZE_PX - LYNX_SUMMON_FAB_EDGE_PADDING_PX
  )
  return {
    right: Math.min(maxRight, Math.max(LYNX_SUMMON_FAB_EDGE_PADDING_PX, right)),
    bottom: Math.min(
      maxBottom,
      Math.max(LYNX_SUMMON_FAB_EDGE_PADDING_PX, bottom)
    ),
  }
}

/**
 * Manages draggable FAB position, persisted in `localStorage`.
 * Distinguishes tap (open/close) from drag (reposition) via a pixel threshold.
 */
export function useLynxSummonFabDrag(onTap: () => void) {
  const [pos, setPos] = useState({
    right: LYNX_SUMMON_FAB_EDGE_PADDING_PX,
    bottom: LYNX_SUMMON_FAB_EDGE_PADDING_PX,
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
  /** Always cleared on drag end or unmount — window listeners must not leak. */
  const removeActiveDragListenersRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(LYNX_SUMMON_FAB_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as {
            right?: unknown
            bottom?: unknown
          }
          const right = Number(parsed.right)
          const bottom = Number(parsed.bottom)
          if (Number.isFinite(right) && Number.isFinite(bottom)) {
            setPos(clampLynxSummonFabPosition(right, bottom))
            return
          }
        }
      } catch {
        /* ignore corrupt storage */
      }
      setPos((prev) => clampLynxSummonFabPosition(prev.right, prev.bottom))
    })
    return () => cancelAnimationFrame(handle)
  }, [])

  useEffect(() => {
    function onResize() {
      setPos((prev) => clampLynxSummonFabPosition(prev.right, prev.bottom))
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
      localStorage.setItem(LYNX_SUMMON_FAB_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
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
          Math.abs(dx) > LYNX_SUMMON_FAB_DRAG_THRESHOLD_PX ||
          Math.abs(dy) > LYNX_SUMMON_FAB_DRAG_THRESHOLD_PX
        ) {
          suppressClickRef.current = true
        }
        const next = clampLynxSummonFabPosition(
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
          next = clampLynxSummonFabPosition(
            posRef.current.right,
            posRef.current.bottom
          )
        } else {
          const dx = ev.clientX - d.startX
          const dy = ev.clientY - d.startY
          if (
            Math.abs(dx) > LYNX_SUMMON_FAB_DRAG_THRESHOLD_PX ||
            Math.abs(dy) > LYNX_SUMMON_FAB_DRAG_THRESHOLD_PX
          ) {
            suppressClickRef.current = true
          }
          next = clampLynxSummonFabPosition(
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

  const fabClick = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      if (suppressClickRef.current) {
        e.preventDefault()
        e.stopPropagation()
        suppressClickRef.current = false
        return
      }
      onTap()
    },
    [onTap]
  )

  return {
    fabPosition: pos,
    isDraggingFab: isDragging,
    fabPointerDown,
    fabClick,
  }
}
