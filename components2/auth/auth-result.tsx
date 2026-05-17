import type { Route } from "next"
import { Link } from "#i18n/navigation"

import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import type { AuthResultVariant } from "#lib/auth/auth-status-copy"
import { cn } from "#lib/utils"

export type AuthResultAction = {
  label: string
  href: Route
}

type AuthResultProps = {
  variant?: AuthResultVariant
  title: string
  description: string
  trustNote?: string
  primaryAction: AuthResultAction
  secondaryAction?: AuthResultAction
  supportReference?: string
  className?: string
}

export function AuthResult({
  variant = "neutral",
  title,
  description,
  trustNote,
  primaryAction,
  secondaryAction,
  supportReference,
  className,
}: AuthResultProps) {
  return (
    <Card
      role="region"
      aria-labelledby="auth-result-title"
      aria-describedby="auth-result-desc"
      className={cn(
        "w-full border-border/80 shadow-elevation-1",
        variant === "warning" &&
          "border-l-4 border-l-warning bg-warning/5 dark:bg-warning/10",
        variant === "destructive" &&
          "border-l-4 border-l-destructive bg-destructive/5 dark:bg-destructive/10",
        variant === "neutral" && "border-l-4 border-l-muted-foreground/25",
        className
      )}
    >
      <CardHeader className="space-y-2 pb-4">
        <CardTitle
          id="auth-result-title"
          className="text-xl font-semibold tracking-tight"
        >
          {title}
        </CardTitle>

        <p
          id="auth-result-desc"
          className="text-sm leading-relaxed text-pretty text-muted-foreground"
        >
          {description}
        </p>
      </CardHeader>

      {trustNote ? (
        <CardContent className="pt-0">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {trustNote}
          </p>
        </CardContent>
      ) : null}

      <CardFooter className="flex flex-col gap-2 border-t pt-6 sm:flex-row sm:justify-end">
        {secondaryAction ? (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        ) : null}

        <Button asChild className="w-full sm:w-auto">
          <Link href={primaryAction.href}>{primaryAction.label}</Link>
        </Button>
      </CardFooter>

      {supportReference ? (
        <div className="border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Reference:{" "}
            <span className="font-mono text-foreground">
              {supportReference}
            </span>
          </p>
        </div>
      ) : null}
    </Card>
  )
}
