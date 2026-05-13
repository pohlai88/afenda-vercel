/**
 * Shared keyboard helpers for Workbench client modules (command layer, global shortcuts).
 * Pure functions — safe to import from any `"use client"` boundary.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}
