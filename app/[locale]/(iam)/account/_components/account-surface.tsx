"use client"

import { useContext } from "react"
import type { ReactNode } from "react"
import { ChevronRight, PanelLeft } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { AccountMobileRailContext } from "./account-operating-shell"

export function AccountSurface({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
  className,
}: {
  title: string
  subtitle: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  const mobileRail = useContext(AccountMobileRailContext)
  const t = useTranslations("AccountSurface")

  return (
    <section className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <header className="sticky top-0 z-10 bg-background/94 backdrop-blur-xl">
          <div className="px-surface-lg pt-4 pb-3 md:px-surface-xl">
            <div className="flex min-h-9 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  aria-label={t("rail.mobileTrigger")}
                  onClick={mobileRail.open}
                  className="lg:hidden -ml-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground"
                >
                  <PanelLeft className="size-4" aria-hidden />
                </button>

                {breadcrumbs && breadcrumbs.length > 0 ? (
                  <nav aria-label="Breadcrumb" className="min-w-0">
                    <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {breadcrumbs.map((item, index) => {
                        const last = index === breadcrumbs.length - 1

                        return (
                          <li
                            key={`${item.label}-${item.href ?? index}`}
                            className="inline-flex min-w-0 items-center gap-1.5"
                          >
                            {index > 0 ? (
                              <ChevronRight
                                className="size-3 shrink-0 opacity-45"
                                aria-hidden
                              />
                            ) : null}

                            {item.href && !last ? (
                              <Link
                                href={item.href}
                                className="truncate transition-colors hover:text-foreground"
                              >
                                {item.label}
                              </Link>
                            ) : (
                              <span
                                className={cn(
                                  "truncate",
                                  last && "text-foreground/85"
                                )}
                              >
                                {item.label}
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                  </nav>
                ) : null}
              </div>

              {actions ? (
                <div className="flex flex-wrap items-center gap-2 lg:max-w-[52%] lg:justify-end">
                  {actions}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="px-surface-lg pt-8 pb-12 md:px-surface-xl">
          <div className="max-w-5xl space-y-10">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground md:text-[2rem]">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-[0.95rem]">
                {subtitle}
              </p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

export function AccountContextBand({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <section className="pt-7 pb-10 first:pt-0 last:pb-0">
      <div className="max-w-4xl space-y-3.5">
        <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-muted-foreground/80 uppercase">
          {label}
        </p>
        {children}
      </div>
    </section>
  )
}
