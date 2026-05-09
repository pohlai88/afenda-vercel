"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { writeClientPreferenceCookie } from "#lib/client-cookie.shared"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days — same as sidebar_state
const ARROW_STEP = 5 // px per arrow-key press

function writeCookie(name: string, value: number): void {
  writeClientPreferenceCookie({
    name,
    value,
    maxAgeSeconds: COOKIE_MAX_AGE,
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export type UseResizableWidthOptions = {
  cookieName: string
  defaultWidth: number
  minWidth: number
  maxWidth: number
  /** "left" → dragging the right edge; "right" → dragging the left edge. */
  side: "left" | "right"
}

export type DragHandleProps = {
  role: "separator"
  "aria-orientation": "vertical"
  "aria-valuemin": number
  "aria-valuemax": number
  "aria-valuenow": number
  tabIndex: 0
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void
  onDoubleClick: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void
}

export type UseResizableWidthResult = {
  width: number
  isDragging: boolean
  dragHandleProps: DragHandleProps
  reset: () => void
}

/**
 * Pointer-driven resize hook.
 *
 * - Persists the resolved width to a cookie so SSR can seed it on next load.
 * - Clamps writes to [minWidth, maxWidth] at every pointer move.
 * - Arrow Up/Right = wider; Arrow Down/Left = narrower (5 px per step).
 * - Home/End = min/max; double-click = reset to default.
 * - Touch-friendly via pointer events (mouse, touch, pen unified).
 */
export function useResizableWidth({
  cookieName,
  defaultWidth,
  minWidth,
  maxWidth,
  side,
}: UseResizableWidthOptions): UseResizableWidthResult {
  const safeDefault = Number.isFinite(defaultWidth)
    ? clamp(defaultWidth, minWidth, maxWidth)
    : minWidth

  const [width, setWidth] = useState(safeDefault)
  const [isDragging, setIsDragging] = useState(false)

  // startX and startWidth at pointer-down, stored in refs so move handler
  // closure does not capture stale state.
  const startXRef = useRef(0)
  const startWidthRef = useRef(safeDefault)

  const applyWidth = useCallback(
    (next: number) => {
      const clamped = clamp(next, minWidth, maxWidth)
      setWidth(clamped)
      writeCookie(cookieName, clamped)
    },
    [cookieName, minWidth, maxWidth]
  )

  const reset = useCallback(() => {
    const target = Number.isFinite(defaultWidth)
      ? clamp(defaultWidth, minWidth, maxWidth)
      : minWidth
    applyWidth(target)
  }, [applyWidth, defaultWidth, minWidth, maxWidth])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      startXRef.current = e.clientX
      startWidthRef.current = width
      setIsDragging(true)
    },
    [width]
  )

  // pointermove / pointerup are attached to the window while dragging so
  // the cursor can move freely beyond the handle.
  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: PointerEvent) => {
      const delta =
        side === "left"
          ? e.clientX - startXRef.current
          : startXRef.current - e.clientX
      applyWidth(startWidthRef.current + delta)
    }

    const onUp = () => setIsDragging(false)

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [isDragging, side, applyWidth])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault()
          applyWidth(width + ARROW_STEP)
          break
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault()
          applyWidth(width - ARROW_STEP)
          break
        case "Home":
          e.preventDefault()
          applyWidth(minWidth)
          break
        case "End":
          e.preventDefault()
          applyWidth(maxWidth)
          break
      }
    },
    [width, minWidth, maxWidth, applyWidth]
  )

  const dragHandleProps: DragHandleProps = {
    role: "separator",
    "aria-orientation": "vertical",
    "aria-valuemin": minWidth,
    "aria-valuemax": maxWidth,
    "aria-valuenow": width,
    tabIndex: 0,
    onPointerDown: handlePointerDown,
    onDoubleClick: reset,
    onKeyDown: handleKeyDown,
  }

  return { width, isDragging, dragHandleProps, reset }
}
