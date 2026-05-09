"use client"

/**
 * Distributed-keyboard event names for the OneThing shell.
 *
 * The shell intentionally does not lift composer / toolbar state to a
 * single keyboard handler — each component owns its own keys via its own
 * `useEffect` listener. A small set of cross-component intents are
 * dispatched on `window` so consumers can react without prop drilling:
 *
 *   - `onething:focus-composer` — fired by `useResolveWithFocusHandoff`
 *      when the queue runs dry, so the composer takes the cursor.
 *   - `onething:toggle-resolve` — fired by the shell's keyboard listener
 *      on `R` so the detail toolbar opens (or closes) its resolve
 *      expander even though the toolbar's `mode` state is local.
 *
 * Keep this list small. Custom events are an escape hatch for the rare
 * case where prop drilling would force unwanted state lifting; they are
 * not a general-purpose event bus.
 */

export const ONETHING_FOCUS_COMPOSER_EVENT = "onething:focus-composer"
export const ONETHING_TOGGLE_RESOLVE_EVENT = "onething:toggle-resolve"
