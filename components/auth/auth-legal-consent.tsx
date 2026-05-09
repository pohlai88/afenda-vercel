"use client"

import type { Route } from "next"
import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"

/**
 * Standard consent line for auth flows: continuing to sign in or sign up constitutes
 * agreement to the published Terms & Conditions.
 */
export function AuthLegalConsent() {
  const t = useTranslations("Auth")

  return (
    <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
      {t.rich("footerLegalConsent", {
        terms: (chunks) => (
          <Link
            href={"/legal/terms" as Route}
            className="font-medium underline underline-offset-4 hover:text-foreground"
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  )
}
