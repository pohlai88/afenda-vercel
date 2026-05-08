import { Suspense } from "react"

import { DevSignInPanel } from "./dev-signin-panel"

/**
 * CNA-style dev overlay: quick links to sign-in with preset emails.
 * Renders only when `NODE_ENV === "development"` and
 * `NEXT_PUBLIC_DEV_SIGNIN_PANEL` is not `"0"`.
 */
export function DevSignInPanelGate() {
  if (process.env.NODE_ENV !== "development") return null
  if (process.env.NEXT_PUBLIC_DEV_SIGNIN_PANEL === "0") return null
  return (
    <Suspense fallback={null}>
      <DevSignInPanel />
    </Suspense>
  )
}
