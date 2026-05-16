import type { ElementType, ReactNode } from "react"
import { AlertCircle, AlertTriangle, ArrowRight, Info, X } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { cn } from "#lib/utils"

/**
 * MDX blocks for public help-docs — composed from `#components2/ui` (shadcn)
 * so documentation matches Afenda shell semantics (spacing, cards, alerts)
 * while `body:has(.fd-docs-surface)` neutralises design tokens on this route.
 */

export function HelpDocsCards({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  )
}

type DocLinkProps = {
  href: string
  children?: ReactNode
  className?: string
}

export function HelpDocsCard({
  href,
  title,
  children,
  DocLink,
}: {
  href: string
  title: string
  children?: ReactNode
  /** From `createRelativeLink(source, page)` — passed by `useMDXComponents`. */
  DocLink?: ElementType<DocLinkProps>
}) {
  const L = DocLink ?? ("a" as ElementType<DocLinkProps>)

  return (
    <Card
      className="not-prose group h-full shadow-none transition-colors hover:bg-muted/50"
      size="sm"
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base leading-snug">
          <L
            href={href}
            className="text-foreground no-underline after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {title}
          </L>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardTitle>
        {children ? (
          <CardDescription className="leading-relaxed">
            {children}
          </CardDescription>
        ) : null}
      </CardHeader>
    </Card>
  )
}

const CALLOUT_VARIANTS = {
  default: {
    icon: Info,
    className: "border-border/60",
  },
  info: {
    icon: Info,
    className: "border-primary/30 bg-primary/5 text-foreground",
  },
  warn: {
    icon: AlertTriangle,
    className:
      "border-warning/40 bg-warning/10 text-foreground [&_[data-slot=alert-description]]:text-muted-foreground",
  },
  error: {
    icon: X,
    className: "border-destructive/40 bg-destructive/5 text-destructive",
  },
  success: {
    icon: AlertCircle,
    className: "border-success/40 bg-success/10 text-foreground",
  },
} as const

export function HelpDocsCallout({
  type = "default",
  title,
  children,
}: {
  type?: keyof typeof CALLOUT_VARIANTS | string
  title?: string
  children?: ReactNode
}) {
  const config =
    CALLOUT_VARIANTS[type as keyof typeof CALLOUT_VARIANTS] ??
    CALLOUT_VARIANTS.default
  const Icon = config.icon
  const isDestructive = type === "error"

  return (
    <Alert
      className={cn("not-prose my-6", config.className)}
      variant={isDestructive ? "destructive" : "default"}
    >
      <Icon />
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export function HelpDocsBanner({ children }: { children: ReactNode }) {
  return (
    <Alert className="not-prose rounded-none border-x-0 border-t-0 py-3 ring-0">
      <Info />
      <AlertDescription className="font-medium">{children}</AlertDescription>
    </Alert>
  )
}

export function HelpDocsSteps({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-8 flex flex-col gap-8 border-l border-border pl-6">
      {children}
    </div>
  )
}

export function HelpDocsStep({ children }: { children: ReactNode }) {
  return (
    <section className="relative scroll-m-20">
      <span
        aria-hidden
        className="absolute top-2 -left-[calc(0.75rem+1px)] flex size-3 rounded-full border border-border bg-background"
      />
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}
