"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react"

export const DEV_SIGNIN_PANEL_STORAGE_KEY = "afenda:dev-signin-panel-pos"

const DEV_SIGNIN_PANEL_EDGE_PADDING_PX = 16
const DEV_SIGNIN_PANEL_DRAG_THRESHOLD_PX = 8
/** Fallback when `offsetWidth` / `offsetHeight` are not yet measurable. */
const DEV_SIGNIN_PANEL_FALLBACK_WIDTH_PX = 320
const DEV_SIGNIN_PANEL_FALLBACK_HEIGHT_PX = 280

function readPanelSize(el: HTMLElement | null): { w: number; h: number } {
  if (!el) {
    return {
      w: DEV_SIGNIN_PANEL_FALLBACK_WIDTH_PX,
      h: DEV_SIGNIN_PANEL_FALLBACK_HEIGHT_PX,
    }
  }
  const w = el.offsetWidth || DEV_SIGNIN_PANEL_FALLBACK_WIDTH_PX
  const h = el.offsetHeight || DEV_SIGNIN_PANEL_FALLBACK_HEIGHT_PX
  return { w, h }
}

function clampDevSignInPanelPosition(
  left: number,
  bottom: number,
  size: { w: number; h: number }
): { left: number; bottom: number } {
  if (typeof window === "undefined") {
    return { left, bottom }
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const pad = DEV_SIGNIN_PANEL_EDGE_PADDING_PX
  const maxLeft = Math.max(pad, vw - size.w - pad)
  const maxBottom = Math.max(pad, vh - size.h - pad)
  return {
    left: Math.min(maxLeft, Math.max(pad, left)),
    bottom: Math.min(maxBottom, Math.max(pad, bottom)),
  }
}

/**
 * Draggable `fixed` position for the dev sign-in panel (`left` / `bottom` offsets),
 * persisted in `localStorage` under {@link DEV_SIGNIN_PANEL_STORAGE_KEY}.
 * When `onTapIfNotDrag` is set, distinguishes tap from drag via a pixel threshold
 * (same pattern as Lynx summon FAB).
 */
export function useDevSignInPanelDrag(
  panelRef: RefObject<HTMLDivElement | null>,
  onTapIfNotDrag?: () => void
) {
  const [pos, setPos] = useState({
    left: DEV_SIGNIN_PANEL_EDGE_PADDING_PX,
    bottom: DEV_SIGNIN_PANEL_EDGE_PADDING_PX,
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
    startLeft: number
    startBottom: number
  } | null>(null)
  const removeActiveDragListenersRef = useRef<(() => void) | null>(null)
  const onTapIfNotDragRef = useRef(onTapIfNotDrag)
  useLayoutEffect(() => {
    onTapIfNotDragRef.current = onTapIfNotDrag
  }, [onTapIfNotDrag])

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(DEV_SIGNIN_PANEL_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as {
            left?: unknown
            bottom?: unknown
          }
          const left = Number(parsed.left)
          const bottom = Number(parsed.bottom)
          if (Number.isFinite(left) && Number.isFinite(bottom)) {
            const size = readPanelSize(panelRef.current)
            setPos(clampDevSignInPanelPosition(left, bottom, size))
            return
          }
        }
      } catch {
        /* ignore corrupt storage */
      }
      const size = readPanelSize(panelRef.current)
      setPos((prev) =>
        clampDevSignInPanelPosition(prev.left, prev.bottom, size)
      )
    })
    return () => cancelAnimationFrame(handle)
  }, [panelRef])

  useEffect(() => {
    function onResize() {
      const size = readPanelSize(panelRef.current)
      setPos((prev) =>
        clampDevSignInPanelPosition(prev.left, prev.bottom, size)
      )
    }
    window.addEventListener("resize", onResize, { passive: true })
    return () => window.removeEventListener("resize", onResize)
  }, [panelRef])

  useEffect(() => {
    return () => {
      removeActiveDragListenersRef.current?.()
      removeActiveDragListenersRef.current = null
    }
  }, [])

  const persistPos = useCallback((next: { left: number; bottom: number }) => {
    try {
      localStorage.setItem(DEV_SIGNIN_PANEL_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const dragPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      removeActiveDragListenersRef.current?.()

      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: posRef.current.left,
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
          Math.abs(dx) > DEV_SIGNIN_PANEL_DRAG_THRESHOLD_PX ||
          Math.abs(dy) > DEV_SIGNIN_PANEL_DRAG_THRESHOLD_PX
        ) {
          suppressClickRef.current = true
        }
        const size = readPanelSize(panelRef.current)
        const next = clampDevSignInPanelPosition(
          d.startLeft + dx,
          d.startBottom - dy,
          size
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

        const size = readPanelSize(panelRef.current)
        let next: { left: number; bottom: number }
        if (ev.type === "pointercancel") {
          next = clampDevSignInPanelPosition(
            posRef.current.left,
            posRef.current.bottom,
            size
          )
        } else {
          const dx = ev.clientX - d.startX
          const dy = ev.clientY - d.startY
          if (
            Math.abs(dx) > DEV_SIGNIN_PANEL_DRAG_THRESHOLD_PX ||
            Math.abs(dy) > DEV_SIGNIN_PANEL_DRAG_THRESHOLD_PX
          ) {
            suppressClickRef.current = true
          }
          next = clampDevSignInPanelPosition(
            d.startLeft + dx,
            d.startBottom - dy,
            size
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
    [panelRef, persistPos]
  )

  const dragClick = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    if (suppressClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClickRef.current = false
      return
    }
    onTapIfNotDragRef.current?.()
  }, [])

  const clampPanelToViewport = useCallback(() => {
    const size = readPanelSize(panelRef.current)
    setPos((prev) => clampDevSignInPanelPosition(prev.left, prev.bottom, size))
  }, [panelRef])

  return {
    panelPosition: pos,
    isDraggingPanel: isDragging,
    dragPointerDown,
    dragClick,
    clampPanelToViewport,
  }
}
