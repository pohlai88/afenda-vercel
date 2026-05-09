import { Cookie } from "lucide-react"
import type { Route } from "next"

import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"

type CookieConsentPreviewProps = {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly comingSoonLabel: string
  readonly acceptLabel: string
  readonly rejectLabel: string
  readonly manageLabel: string
}

export function CookieConsentPreview({
  eyebrow,
  title,
  description,
  comingSoonLabel,
  acceptLabel,
  rejectLabel,
  manageLabel,
}: CookieConsentPreviewProps) {
  return (
    <section
      aria-label={title}
      className="fixed inset-x-3 bottom-3 z-30 mx-auto grid max-w-3xl gap-3 rounded-lg border border-border bg-card/95 p-3.5 text-card-foreground shadow-elevation-3 backdrop-blur sm:inset-x-6 sm:bottom-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-4"
    >
      <div className="hidden size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground sm:flex">
        <Cookie className="size-4" aria-hidden />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="m-0 text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <span className="inline-flex min-h-6 items-center rounded-full border border-warning/35 bg-warning/10 px-2 text-[0.68rem] font-bold tracking-[0.08em] text-foreground uppercase">
            {comingSoonLabel}
          </span>
        </div>
        <h2 className="mt-1 text-base leading-snug font-semibold tracking-normal">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button type="button" variant="outline" size="sm" disabled>
          {rejectLabel}
        </Button>
        <Button type="button" size="sm" disabled>
          {acceptLabel}
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={"/cookies" as Route}>{manageLabel}</Link>
        </Button>
      </div>
    </section>
  )
}
