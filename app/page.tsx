import type { Metadata } from "next"
import Link from "next/link"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { ModeToggle } from "#components/mode-toggle"
import { Button } from "#components/ui/button"
import { SITE_DESCRIPTION, SITE_NAME } from "#lib/site"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
}

export default function Page() {
  return (
    <div className="relative flex min-h-svh flex-col p-6">
      <header className="absolute end-6 top-6">
        <ModeToggle />
      </header>
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div className="flex justify-start">
          <AfendaBrandLockup
            className="max-w-[200px]"
            imgClassName="object-left"
          />
        </div>
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="secondary">Button</Button>
          </div>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          Theme: menu (top right) or press{" "}
          <kbd className="rounded border px-1">d</kbd> to flip light/dark.
        </div>
      </div>
    </div>
  )
}
