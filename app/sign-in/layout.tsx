import type { ReactNode } from "react"
import type { Metadata } from "next"

import { SITE_NAME } from "#lib/site"

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
  openGraph: { title: `Sign in | ${SITE_NAME}` },
}

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children
}
