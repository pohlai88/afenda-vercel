import "server-only"

import { redirect } from "next/navigation"

/** Public demo routes are off in production unless explicitly enabled. */
export function redirectIfDemoShowcaseDisabled(): void {
  if (process.env.NODE_ENV === "development") {
    return
  }
  if (process.env.NEXT_PUBLIC_AFENDA_DEMO_SHOWCASE === "1") {
    return
  }
  redirect("/")
}
