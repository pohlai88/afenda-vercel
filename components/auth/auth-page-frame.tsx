import { Link } from "#i18n/navigation"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { cn } from "#lib/utils"

export function AuthPageFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative min-h-svh bg-background text-foreground",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-muted/50 via-background to-background dark:from-muted/25"
      />
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-elevation-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to form
      </a>
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
        <div className="flex justify-center">
          <Link
            href="/"
            className="rounded-md outline-offset-4 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <AfendaBrandLockup priority />
          </Link>
        </div>
        <main id="auth-main" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}
