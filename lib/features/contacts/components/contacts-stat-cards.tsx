"use client"

import { Mail, Percent, Users } from "lucide-react"

import { Card, CardContent } from "#components/ui/card"
import { Progress } from "#components/ui/progress"

type ContactsStatCardsProps = {
  totalContacts: number
  withEmailCount: number
}

export function ContactsStatCards({
  totalContacts,
  withEmailCount,
}: ContactsStatCardsProps) {
  const coverage =
    totalContacts === 0 ? 0 : Math.round((withEmailCount / totalContacts) * 100)

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {/* Total contacts */}
      <Card size="sm">
        <CardContent className="pt-surface-md">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Total contacts
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                {totalContacts}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                All directory records
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-4" aria-hidden />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* With email */}
      <Card size="sm">
        <CardContent className="pt-surface-md">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                With email
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                {withEmailCount}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Reachable by email
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-info/15 text-info">
              <Mail className="size-4" aria-hidden />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email coverage */}
      <Card size="sm">
        <CardContent className="pt-surface-md">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Email coverage
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                {coverage}%
              </p>
              {/* Only render the progress track once there are contacts to measure */}
              {totalContacts > 0 ? (
                <Progress
                  value={coverage}
                  className="mt-2 h-1.5"
                  aria-label={`Email coverage ${coverage}%`}
                />
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add contacts to track
                </p>
              )}
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
              <Percent className="size-4" aria-hidden />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
