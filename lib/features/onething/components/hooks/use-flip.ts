"use client"

import { useCallback, useLayoutEffect, useRef } from "react"

/**
 * Tiny FLIP (First, Last, Invert, Play) helper for ranker reconciliation.
 *
 * The ranker is authoritative — a freshly-captured row may belong at #8 in
 * the ranked queue, not #1. Teleporting it from the top of the list to its
 * eventual home would thrash the operator's spatial memory. Instead, the
 * draft pins to the top during pending; on commit, the row's natural DOM
 * position changes, this hook measures the delta and animates the visible
 * box from the old rect into the new one.
 *
 * Position + opacity only — no transform-style cascading. Honors the user's
 * `prefers-reduced-motion` preference. ~30 lines of behavior, no library.
 */

const ANIMATION_DURATION_MS = 180
const ANIMATION_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)"

export function useFlip<TKey extends string>(
  keys: readonly TKey[]
): (key: TKey) => (node: HTMLElement | null) => void {
  const nodeRefs = useRef(new Map<TKey, HTMLElement>())
  const previousRects = useRef(new Map<TKey, DOMRect>())

  // Measure all known nodes BEFORE the next paint so we can compare against
  // their positions after the next render commits.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      previousRects.current.clear()
      for (const [key, node] of nodeRefs.current) {
        previousRects.current.set(key, node.getBoundingClientRect())
      }
      return
    }

    for (const [key, node] of nodeRefs.current) {
      const prev = previousRects.current.get(key)
      const next = node.getBoundingClientRect()
      previousRects.current.set(key, next)
      if (!prev) continue

      const dx = prev.left - next.left
      const dy = prev.top - next.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue

      node.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)`, opacity: 0.85 },
          { transform: "translate(0, 0)", opacity: 1 },
        ],
        {
          duration: ANIMATION_DURATION_MS,
          easing: ANIMATION_EASING,
          fill: "both",
        }
      )
    }
  }, [keys])

  return useCallback((key: TKey) => {
    return (node: HTMLElement | null) => {
      if (node) {
        nodeRefs.current.set(key, node)
      } else {
        nodeRefs.current.delete(key)
        previousRects.current.delete(key)
      }
    }
  }, [])
}
