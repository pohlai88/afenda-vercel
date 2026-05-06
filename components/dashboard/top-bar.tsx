import Link from "next/link"

import { SignOutButton } from "#components/sign-out-button"
import { Button } from "#components/ui/button"
import { CardTitle } from "#components/ui/card"

type DashboardTopBarProps = {
  userEmail: string
}

export function DashboardTopBar({ userEmail }: DashboardTopBarProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <CardTitle className="text-2xl">Dashboard</CardTitle>
        <p className="text-sm text-muted-foreground">Signed in as {userEmail}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SignOutButton />
        <Button variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  )
}
