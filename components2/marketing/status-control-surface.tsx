import type { Route } from "next"
import { Activity, CalendarClock, CircleAlert, ShieldCheck } from "lucide-react"

import { AfendaBrandLockup } from "#components2/afenda-brand"
import { Button } from "#components2/ui/button"
import type {
  OpenStatusEvent,
  OpenStatusPublicSnapshot,
  OpenStatusPublicState,
} from "#features/public-trust"
import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

function stateLabel(state: OpenStatusPublicState | string): string {
  switch (state) {
    case "operational":
      return "Operational"
    case "degraded":
      return "Degraded"
    case "maintenance":
      return "Maintenance"
    case "incident":
      return "Incident"
    default:
      return state
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
  }
}

function stateClassName(state: OpenStatusPublicState | string): string {
  switch (state) {
    case "operational":
      return "border-emerald-500/35 bg-emerald-500/10 text-foreground dark:bg-emerald-500/15"
    case "degraded":
      return "border-warning/40 bg-warning/10 text-foreground"
    case "maintenance":
      return "border-info/40 bg-info/10 text-foreground"
    case "incident":
      return "border-critical/45 bg-critical/10 text-foreground"
    default:
      return "border-border bg-muted text-foreground"
  }
}

function StatePill({
  state,
}: {
  readonly state: OpenStatusPublicState | string
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 text-[0.72rem] font-bold tracking-[0.08em] uppercase",
        stateClassName(state)
      )}
    >
      {stateLabel(state)}
    </span>
  )
}

function EventList({
  emptyLabel,
  events,
}: {
  readonly emptyLabel: string
  readonly events: readonly OpenStatusEvent[]
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        {emptyLabel}
      </p>
    )
  }

  return (
    <ul className="grid list-none gap-3 p-0">
      {events.slice(0, 5).map((event) => (
        <li
          key={`${event.title}-${event.date ?? event.status}`}
          className="grid gap-2"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <strong className="text-sm leading-snug text-foreground">
              {event.title}
            </strong>
            <StatePill state={event.status} />
          </div>
          {event.message ? (
            <p className="m-0 text-sm leading-relaxed text-muted-foreground">
              {event.message}
            </p>
          ) : null}
          {event.date ? (
            <span className="text-xs text-muted-foreground">{event.date}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function StatusControlSurface({
  snapshot,
}: {
  readonly snapshot: OpenStatusPublicSnapshot
}) {
  return (
    <main className="min-h-svh bg-background pb-16 text-foreground">
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-4 sm:px-6">
        <header className="border-b border-border pt-4 pb-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <Link
              href={"/" as Route}
              className="inline-flex max-w-[214px] shrink-0 text-inherit no-underline"
              aria-label="Afenda home"
            >
              <AfendaBrandLockup
                className="max-w-[min(214px,58vw)]"
                imgClassName="object-left"
                priority
              />
            </Link>

            <div className="flex flex-col items-start gap-2.5 sm:items-end">
              <p className="text-[0.7rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                Public availability evidence
              </p>
              <Link
                href={"/legal-docs/trust" as Route}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground"
              >
                Trust surface
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.95fr)] lg:items-end">
            <div>
              <p className="text-[0.72rem] font-bold tracking-[0.16em] text-primary uppercase">
                OpenStatus authority
              </p>
              <h1 className="mt-3.5 text-[2.52rem] leading-[0.98] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[4.4rem]">
                Status
              </h1>
              <p className="mt-5 max-w-[760px] text-[0.96rem] leading-relaxed text-muted-foreground sm:text-[1.08rem] sm:leading-loose">
                OpenStatus is the public availability authority. Afenda reflects
                that source here without publishing a separate uptime claim.
              </p>
            </div>

            <section className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-elevation-1">
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-2">
                  <span className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                    Overall status
                  </span>
                  <h2 className="text-xl leading-tight font-semibold">
                    {snapshot.title}
                  </h2>
                </div>
                <StatePill state={snapshot.overallStatus} />
              </div>
              <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                {snapshot.summary}
              </p>
              <div className="grid gap-2 border-t border-border pt-3">
                <span className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Source state
                </span>
                <span className="text-sm font-semibold">
                  {snapshot.available
                    ? "OpenStatus feed available"
                    : snapshot.configured
                      ? "OpenStatus feed temporarily unavailable"
                      : "OpenStatus configuration pending"}
                </span>
              </div>
              {snapshot.publicStatusUrl ? (
                <Button variant="outline" asChild>
                  <a
                    href={snapshot.publicStatusUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View full OpenStatus page
                  </a>
                </Button>
              ) : null}
            </section>
          </div>
        </header>

        <section className="grid gap-6 border-b border-border py-8 md:grid-cols-3">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              Evidence rule
            </div>
            <p className="m-0 text-sm leading-relaxed text-muted-foreground">
              Status is sourced from OpenStatus. Afenda does not hardcode uptime
              percentages or invent incident history.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4 text-primary" aria-hidden />
              Health endpoint
            </div>
            <p className="m-0 text-sm leading-relaxed text-muted-foreground">
              The public health check exposes only app, database, and runtime
              states without provider or secret details.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="size-4 text-primary" aria-hidden />
              Maintenance
            </div>
            <p className="m-0 text-sm leading-relaxed text-muted-foreground">
              Scheduled maintenance and incident reports are published through
              OpenStatus, not through private logs.
            </p>
          </div>
        </section>

        {!snapshot.available ? (
          <section className="mt-8 rounded-lg border border-warning/35 bg-warning/10 p-5">
            <div className="flex gap-3">
              <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="grid gap-2">
                <h2 className="text-base leading-snug font-semibold">
                  Status source not fully connected
                </h2>
                <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                  The Afenda status wrapper is live, but the OpenStatus feed is
                  not currently available to this deployment. Use the full
                  OpenStatus page when a public source URL is configured.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.52fr)]">
          <section className="grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
              <div>
                <p className="text-[0.72rem] font-bold tracking-[0.14em] text-primary uppercase">
                  Components
                </p>
                <h2 className="mt-2 text-2xl leading-tight font-semibold">
                  Monitored services
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Checked {snapshot.checkedAt}
              </span>
            </div>
            {snapshot.components.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {snapshot.components.map((component) => (
                  <article
                    key={component.name}
                    className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-elevation-1"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="m-0 text-base leading-snug font-semibold">
                        {component.name}
                      </h3>
                      <StatePill state={component.status} />
                    </div>
                    {component.description ? (
                      <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                        {component.description}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                No public component feed is available yet.
              </p>
            )}
          </section>

          <aside className="grid content-start gap-6">
            <section className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-elevation-1">
              <div>
                <p className="text-[0.72rem] font-bold tracking-[0.14em] text-primary uppercase">
                  Incidents
                </p>
                <h2 className="mt-2 text-xl leading-tight font-semibold">
                  Active reports
                </h2>
              </div>
              <EventList
                events={snapshot.incidents}
                emptyLabel="No active public incident reports are available from the feed."
              />
            </section>

            <section className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-elevation-1">
              <div>
                <p className="text-[0.72rem] font-bold tracking-[0.14em] text-primary uppercase">
                  Maintenance
                </p>
                <h2 className="mt-2 text-xl leading-tight font-semibold">
                  Scheduled windows
                </h2>
              </div>
              <EventList
                events={snapshot.maintenances}
                emptyLabel="No scheduled maintenance windows are available from the feed."
              />
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
