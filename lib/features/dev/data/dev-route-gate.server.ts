import "server-only"

import { redirect } from "next/navigation"

/** Dev gallery routes are unavailable outside local development. */
export function redirectIfProductionDevRoute(): void {
  if (process.env.NODE_ENV !== "development") {
    redirect("/")
  }
}
