import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { AfendaBrandLockup } from "#components2/marketing"
import {
  CookieConsentPreview,
  LandingFooter,
} from "#components2/marketing"
import { ModeToggle } from "#components2/providers/mode-toggle.client"
import { Button } from "#components2/ui/button"
import { SITE_DESCRIPTION, SITE_NAME } from "#lib/site"

import { Link } from "#i18n/navigation"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params
  const base = `/${locale}`
  return {
    alternates: { canonical: base },
    openGraph: {
      url: base,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    },
  }
}

export default async function Page() {
  const t = await getTranslations("Home")

  return (
    <div className="relative flex min-h-svh flex-col bg-background text-foreground">
      <header className="absolute end-6 top-6">
        <ModeToggle />
      </header>
      <main
        id="platform"
        className="flex min-h-svh flex-col justify-center px-6 py-16 pb-32"
      >
        <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
          <div className="flex justify-start">
            <AfendaBrandLockup
              className="max-w-[200px]"
              imgClassName="object-left"
            />
          </div>
          <div>
            <h1 className="font-medium">{t("heading")}</h1>
            <p>{t("body1")}</p>
            <p>{t("body2")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/sign-in">{t("ctaSignIn")}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/o">{t("ctaDashboard")}</Link>
              </Button>
              <Button variant="secondary">{t("demoButton")}</Button>
            </div>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {t("themeHintBefore")} <kbd className="rounded border px-1">d</kbd>{" "}
            {t("themeHintAfter")}
          </div>
        </div>
      </main>
      <LandingFooter />
      <CookieConsentPreview
        eyebrow={t("cookieConsent.eyebrow")}
        title={t("cookieConsent.title")}
        description={t("cookieConsent.description")}
        acceptLabel={t("cookieConsent.accept")}
        rejectLabel={t("cookieConsent.reject")}
        manageLabel={t("cookieConsent.manage")}
      />
    </div>
  )
}
