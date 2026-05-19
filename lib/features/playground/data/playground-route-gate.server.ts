import "server-only"

import { redirect } from "next/navigation"

/** Playground gallery routes are unavailable outside local development. */
export function redirectIfProductionPlaygroundRoute(): void {
  if (process.env.NODE_ENV !== "development") {
    redirect("/")
  }
}
