import type { AppLocale } from "#lib/i18n/locales.shared"

import { AfendaBrandLockup } from "#components2/afenda-brand"
import { LegalDocsLocaleLink } from "./legal-docs-locale-link"
import { LEGAL_ROUTE_PREFIX, STATUS_ROUTE } from "#features/legal-docs"
import type {
  TrustControlSurfaceProps,
  TrustSurfaceItem,
  TrustSurfaceState,
} from "#features/legal-docs"
import { cn } from "#lib/utils"

const trustPageHref = `${LEGAL_ROUTE_PREFIX}/trust`

const trustSectionLinks = [
  {
    href: "#posture",
    label: "Current posture",
    description: "What is publicly declared right now.",
  },
  {
    href: "#evidence",
    label: "Evidence",
    description: "What is proven and when it was last updated.",
  },
  {
    href: "#surfaces",
    label: "Surfaces",
    description: "Public trust routes and current state.",
  },
  {
    href: "#commitments",
    label: "Commitments",
    description: "How Afenda routes trust-sensitive work.",
  },
  {
    href: "#boundaries",
    label: "Boundaries",
    description: "What Afenda explicitly does not claim.",
  },
  {
    href: "#activation-rules",
    label: "Activation rules",
    description: "What must exist before new trust routes ship.",
  },
] as const

function statePillClassName(state: TrustSurfaceState): string {
  switch (state) {
    case "live":
      return "border-emerald-500/35 bg-emerald-500/10 text-foreground dark:bg-emerald-500/15"
    case "planned":
      return "border-primary/25 bg-primary/10 text-foreground"
    case "withheld":
      return "border-border bg-muted text-foreground"
    default:
      return "border-border bg-muted"
  }
}

function renderOwnerRoute(ownerRoute: string) {
  return (
    <a
      href={`mailto:${ownerRoute}`}
      className="text-muted-foreground underline-offset-4 hover:text-foreground"
    >
      {ownerRoute}
    </a>
  )
}

function renderSurfaceRoute(locale: AppLocale, surface: TrustSurfaceItem) {
  if (surface.isPublicLink) {
    return (
      <LegalDocsLocaleLink
        locale={locale}
        href={surface.route}
        className="text-foreground underline-offset-4 hover:text-foreground"
      >
        {surface.route}
      </LegalDocsLocaleLink>
    )
  }

  return (
    <span className="font-mono text-sm leading-snug break-words text-foreground">
      {surface.route}
    </span>
  )
}

export function TrustControlSurface({
  locale,
  definition,
  legalIdentity,
  footerLinks,
}: TrustControlSurfaceProps) {
  const statusAuthorityUrl = definition.surfaces.find(
    (s) => s.id === "surface-status"
  )?.authorityUrl

  return (
    <main className="afenda-trust-surface min-h-svh bg-background pb-16 text-foreground">
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-4 sm:px-6">
        <header className="border-b border-border pt-4 pb-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <LegalDocsLocaleLink
              locale={locale}
              href="/"
              className="inline-flex max-w-[214px] shrink-0 text-inherit no-underline"
              aria-label="Afenda home"
            >
              <AfendaBrandLockup
                className="max-w-[min(214px,58vw)]"
                imgClassName="object-left"
                priority
              />
            </LegalDocsLocaleLink>

            <div className="flex flex-col items-start gap-2.5 sm:items-end">
              <p className="text-[0.7rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                Canonical public assurance surface
              </p>
              <LegalDocsLocaleLink
                locale={locale}
                href="/"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground"
              >
                Return to platform
              </LegalDocsLocaleLink>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.95fr)] lg:items-end">
            <div>
              <p className="text-[0.72rem] font-bold tracking-[0.16em] text-primary uppercase">
                {definition.eyebrow}
              </p>
              <h1 className="mt-3.5 text-[2.52rem] leading-[0.98] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[4.4rem]">
                {definition.title}
              </h1>
              <p className="mt-5 max-w-[760px] text-[0.96rem] leading-relaxed text-muted-foreground sm:text-[1.08rem] sm:leading-loose">
                {definition.summary}
              </p>
            </div>

            <dl className="grid gap-3.5 rounded-lg border border-border bg-card p-4 shadow-elevation-1 sm:grid-cols-2 sm:p-5">
              <div className="grid min-w-0 gap-2">
                <dt className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Entity
                </dt>
                <dd className="m-0 text-sm leading-snug font-semibold">
                  {legalIdentity.legalEntityName}
                </dd>
              </div>
              <div className="grid min-w-0 gap-2">
                <dt className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Public route
                </dt>
                <dd className="m-0 text-sm leading-snug font-semibold">
                  {trustPageHref}
                </dd>
              </div>
              <div className="grid min-w-0 gap-2 sm:col-span-2">
                <dt className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Doctrine
                </dt>
                <dd className="m-0 text-sm leading-snug font-semibold text-pretty">
                  {definition.doctrine}
                </dd>
              </div>
              <div className="grid min-w-0 gap-2 sm:col-span-2">
                <dt className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Last updated
                </dt>
                <dd className="m-0 text-sm leading-snug font-semibold">
                  {definition.lastUpdatedLabel}
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(236px,272px)_minmax(0,1fr)] lg:gap-9 lg:pt-9">
          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className="grid gap-5 lg:block lg:space-y-5">
              <section className="border-t border-border pt-3.5">
                <h2 className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Control surface
                </h2>
                <nav aria-label="Trust sections">
                  <ol className="mt-3.5 grid list-none gap-2.5 p-0">
                    {trustSectionLinks.map((link) => (
                      <li key={link.href} className="min-w-0">
                        <a
                          href={link.href}
                          className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                        >
                          <strong className="text-[0.94rem] leading-snug font-semibold text-inherit">
                            {link.label}
                          </strong>
                          <span className="text-[0.82rem] leading-snug text-muted-foreground">
                            {link.description}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </section>

              <section className="border-t border-border pt-3.5">
                <h2 className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Related routes
                </h2>
                <nav aria-label="Related public routes">
                  <ul className="mt-3.5 grid list-none gap-2.5 p-0">
                    {footerLinks
                      .filter((link) => link.href !== trustPageHref)
                      .map((link) => (
                        <li key={link.href} className="min-w-0">
                          <LegalDocsLocaleLink
                            locale={locale}
                            href={link.href}
                            className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                          >
                            <strong className="text-[0.94rem] leading-snug font-semibold text-inherit">
                              {link.label}
                            </strong>
                            <span className="text-[0.82rem] leading-snug text-muted-foreground">
                              {link.description}
                            </span>
                          </LegalDocsLocaleLink>
                        </li>
                      ))}
                  </ul>
                </nav>
              </section>

              {statusAuthorityUrl ? (
                <section className="border-t border-border pt-3.5">
                  <h2 className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                    Operational status
                  </h2>
                  <nav
                    aria-label="Operational status links"
                    className="mt-3.5 grid list-none gap-2.5 p-0"
                  >
                    <div className="min-w-0">
                      <LegalDocsLocaleLink
                        locale={locale}
                        href={statusAuthorityUrl}
                        className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                      >
                        <strong className="text-[0.94rem] leading-snug font-semibold text-inherit">
                          OpenStatus authority
                        </strong>
                        <span className="text-[0.82rem] leading-snug break-words text-muted-foreground">
                          Live monitors, incidents, and maintenance on
                          OpenStatus.
                        </span>
                      </LegalDocsLocaleLink>
                    </div>
                    <div className="min-w-0">
                      <LegalDocsLocaleLink
                        locale={locale}
                        href={STATUS_ROUTE}
                        className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                      >
                        <strong className="text-[0.94rem] leading-snug font-semibold text-inherit">
                          Afenda status wrapper
                        </strong>
                        <span className="text-[0.82rem] leading-snug text-muted-foreground">
                          Branded mirror that reflects the OpenStatus feed.
                        </span>
                      </LegalDocsLocaleLink>
                    </div>
                  </nav>
                </section>
              ) : null}

              <section className="border-t border-border pt-3.5">
                <h2 className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Contact routes
                </h2>
                <div className="mt-3 grid gap-3">
                  <div className="grid min-w-0 gap-1">
                    <span className="text-sm font-semibold text-foreground">
                      {legalIdentity.operationalSupportLabel}
                    </span>
                    <a
                      href={`mailto:${legalIdentity.operationalSupportEmail}`}
                      className="text-sm leading-relaxed text-muted-foreground underline-offset-4 hover:text-foreground"
                    >
                      {legalIdentity.operationalSupportEmail}
                    </a>
                    <span className="text-[0.82rem] leading-snug text-muted-foreground">
                      Public operational routing and trust follow-up.
                    </span>
                  </div>
                  <div className="grid min-w-0 gap-1">
                    <span className="text-sm font-semibold text-foreground">
                      {legalIdentity.privacyInquiryLabel}
                    </span>
                    <a
                      href={`mailto:${legalIdentity.privacyInquiryEmail}`}
                      className="text-sm leading-relaxed text-muted-foreground underline-offset-4 hover:text-foreground"
                    >
                      {legalIdentity.privacyInquiryEmail}
                    </a>
                    <span className="text-[0.82rem] leading-snug text-muted-foreground">
                      Service notices and declaration follow-up routing.
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </aside>

          <article className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-2.5 gap-x-4 border-b border-border pb-3.5">
              <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-muted/80 px-3 text-[0.76rem] font-bold tracking-wider uppercase">
                Trust control surface
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                {definition.statusNote}
              </span>
              <span className="text-xs text-muted-foreground">
                {definition.lastUpdatedLabel}
              </span>
            </div>

            <p className="mb-3 max-w-[760px] text-base leading-relaxed text-muted-foreground">
              {definition.description}
            </p>

            <section id="posture" className="border-t-0 pb-9">
              <p className="m-0 text-[0.72rem] font-bold tracking-[0.14em] text-primary uppercase">
                Current posture
              </p>
              <h2 className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight">
                Current posture
              </h2>
              <p className="mt-4 max-w-[760px] text-[0.98rem] leading-[1.76] text-muted-foreground">
                These posture signals are public because they already have a
                real route, a real owner path, and a real evidence source.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {definition.currentPosture.map((signal) => (
                  <article
                    key={signal.id}
                    className="grid min-w-0 gap-3.5 rounded-lg border border-border bg-card p-5 shadow-elevation-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <h3 className="m-0 text-[1.02rem] leading-snug font-semibold">
                        {signal.label}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex min-h-[30px] items-center justify-center rounded-full border px-3 text-[0.72rem] font-bold tracking-[0.08em] uppercase",
                          statePillClassName(signal.state)
                        )}
                      >
                        {signal.state}
                      </span>
                    </div>
                    <p className="m-0 text-[0.92rem] leading-relaxed text-muted-foreground">
                      {signal.summary}
                    </p>
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Owner route
                      </span>
                      <span className="text-[0.88rem] leading-snug text-foreground">
                        {renderOwnerRoute(signal.ownerRoute)}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Proof source
                      </span>
                      <span className="text-[0.88rem] leading-snug break-words text-foreground">
                        {signal.href ? (
                          <LegalDocsLocaleLink
                            locale={locale}
                            href={signal.href}
                            className="underline-offset-4 hover:text-foreground"
                          >
                            {signal.proofSource}
                          </LegalDocsLocaleLink>
                        ) : (
                          signal.proofSource
                        )}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Last updated
                      </span>
                      <span className="text-[0.88rem] leading-snug text-foreground">
                        {signal.lastUpdatedLabel}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="evidence" className="border-t border-border py-10">
              <p className="m-0 text-[0.72rem] font-bold tracking-[0.14em] text-primary uppercase">
                Evidence
              </p>
              <h2 className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight">
                What is proven right now.
              </h2>
              <p className="mt-4 max-w-[760px] text-[0.98rem] leading-[1.76] text-muted-foreground">
                Afenda replaces absent certification theater with public proof
                that can be inspected route by route.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {definition.evidence.map((item) => (
                  <article
                    key={item.id}
                    className="grid min-w-0 gap-3.5 rounded-lg border border-border bg-card p-5 shadow-elevation-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <h3 className="m-0 text-[1.02rem] leading-snug font-semibold">
                        {item.title}
                      </h3>
                      <LegalDocsLocaleLink
                        locale={locale}
                        href={item.href}
                        className="text-[0.88rem] leading-snug break-words text-foreground underline-offset-4 hover:text-foreground"
                      >
                        {item.href}
                      </LegalDocsLocaleLink>
                    </div>
                    <p className="m-0 text-[0.92rem] leading-relaxed text-muted-foreground">
                      {item.statement}
                    </p>
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Proof source
                      </span>
                      <span className="text-[0.88rem] leading-snug text-foreground">
                        {item.proofSource}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Last updated
                      </span>
                      <span className="text-[0.88rem] leading-snug text-foreground">
                        {item.lastUpdatedLabel}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="surfaces" className="border-t border-border py-10">
              <p className="m-0 text-[0.72rem] font-bold tracking-[0.14em] text-primary uppercase">
                Surfaces
              </p>
              <h2 className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight">
                Public trust surfaces and state.
              </h2>
              <p className="mt-4 max-w-[760px] text-[0.98rem] leading-[1.76] text-muted-foreground">
                Live surfaces have public links and current evidence. Activation
                rules remain visible so new trust claims do not ship before the
                underlying operational truth exists.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {definition.surfaces.map((surface) => (
                  <article
                    key={surface.id}
                    className="grid min-w-0 gap-3.5 rounded-lg border border-border bg-card p-5 shadow-elevation-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <h3 className="m-0 text-[1.02rem] leading-snug font-semibold">
                        {surface.label}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex min-h-[30px] items-center justify-center rounded-full border px-3 text-[0.72rem] font-bold tracking-[0.08em] uppercase",
                          statePillClassName(surface.state)
                        )}
                      >
                        {surface.state}
                      </span>
                    </div>
                    <p className="m-0 text-[0.92rem] leading-relaxed text-muted-foreground">
                      {surface.summary}
                    </p>
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Route
                      </span>
                      <span className="text-[0.88rem] leading-snug break-words text-foreground">
                        {renderSurfaceRoute(locale, surface)}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Owner route
                      </span>
                      <span className="text-[0.88rem] leading-snug text-foreground">
                        {renderOwnerRoute(surface.ownerRoute)}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Proof source
                      </span>
                      <span className="text-[0.88rem] leading-snug text-foreground">
                        {surface.proofSource}
                      </span>
                    </div>
                    {surface.authorityUrl ? (
                      <div className="grid gap-2">
                        <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                          Authority page
                        </span>
                        <LegalDocsLocaleLink
                          locale={locale}
                          href={surface.authorityUrl}
                          className="text-[0.88rem] leading-snug break-all text-foreground underline-offset-4 hover:text-foreground"
                        >
                          {surface.authorityUrl}
                        </LegalDocsLocaleLink>
                      </div>
                    ) : null}
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Last updated
                      </span>
                      <span className="text-[0.88rem] leading-snug text-foreground">
                        {surface.lastUpdatedLabel}
                      </span>
                    </div>
                    {surface.activationRuleId ? (
                      <div className="grid gap-2">
                        <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                          Activation rule
                        </span>
                        <span className="text-[0.88rem] leading-snug text-foreground">
                          {surface.activationRuleId}
                        </span>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <section id="commitments" className="border-t border-border py-10">
              <p className="m-0 text-[0.72rem] font-bold tracking-[0.14em] text-primary uppercase">
                Commitments
              </p>
              <h2 className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight">
                How Afenda handles trust-sensitive work.
              </h2>
              <p className="mt-4 max-w-[760px] text-[0.98rem] leading-[1.76] text-muted-foreground">
                These are route and response commitments, not marketing claims.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {definition.commitments.map((commitment) => (
                  <article
                    key={commitment.id}
                    className="grid min-w-0 gap-3.5 rounded-lg border border-border bg-card p-5 shadow-elevation-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <h3 className="m-0 text-[1.02rem] leading-snug font-semibold">
                        {commitment.title}
                      </h3>
                      {commitment.href ? (
                        <LegalDocsLocaleLink
                          locale={locale}
                          href={commitment.href}
                          className="text-[0.88rem] leading-snug break-words text-foreground underline-offset-4 hover:text-foreground"
                        >
                          {commitment.href}
                        </LegalDocsLocaleLink>
                      ) : null}
                    </div>
                    <p className="m-0 text-[0.92rem] leading-relaxed text-muted-foreground">
                      {commitment.summary}
                    </p>
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Expectation
                      </span>
                      <span className="text-[0.88rem] leading-snug text-foreground">
                        {commitment.expectation}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Owner route
                      </span>
                      <span className="text-[0.88rem] leading-snug text-foreground">
                        {renderOwnerRoute(commitment.ownerRoute)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="boundaries" className="border-t border-border py-10">
              <p className="m-0 text-[0.72rem] font-bold tracking-[0.14em] text-primary uppercase">
                Boundaries
              </p>
              <h2 className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight">
                What Afenda does not claim.
              </h2>
              <p className="mt-4 max-w-[760px] text-[0.98rem] leading-[1.76] text-muted-foreground">
                Negative-space trust matters. Afenda names the claims it is not
                prepared to make yet.
              </p>
              <div className="mt-6 grid gap-3">
                {definition.boundaries.map((boundary) => (
                  <article
                    key={boundary.id}
                    className="grid gap-1.5 border-t border-border py-4"
                  >
                    <h3 className="m-0 text-[0.98rem] leading-snug font-semibold">
                      {boundary.title}
                    </h3>
                    <p className="m-0 text-[0.92rem] leading-relaxed text-muted-foreground">
                      {boundary.detail}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section
              id="activation-rules"
              className="border-t border-border py-10"
            >
              <p className="m-0 text-[0.72rem] font-bold tracking-[0.14em] text-primary uppercase">
                Activation rules
              </p>
              <h2 className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight">
                Trust surface activation rules.
              </h2>
              <p className="mt-4 max-w-[760px] text-[0.98rem] leading-[1.76] text-muted-foreground">
                New trust routes do not ship because they sound useful. They
                ship only when the underlying operational truth exists.
              </p>
              <div className="mt-6 grid gap-3.5">
                {definition.activationRules.map((rule) => (
                  <article
                    key={rule.id}
                    className="grid gap-3.5 rounded-lg border border-border bg-card p-5 shadow-elevation-1"
                  >
                    <div className="grid gap-2">
                      <span className="font-mono text-[0.88rem] font-bold tracking-wide text-foreground">
                        {rule.id}
                      </span>
                      <p className="m-0 text-[0.92rem] leading-relaxed text-muted-foreground">
                        {rule.surfaceLabel} remains gated at {rule.route} until
                        the following conditions are met.
                      </p>
                    </div>
                    <ul className="m-0 grid list-disc gap-2 pl-5 text-[0.92rem] leading-relaxed text-muted-foreground">
                      {rule.requirements.map((requirement) => (
                        <li key={requirement}>{requirement}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <footer className="mt-12 grid gap-5 border-t border-border pt-6 sm:grid-cols-[minmax(0,1.16fr)_auto] sm:items-end">
              <div className="grid gap-2">
                <LegalDocsLocaleLink
                  locale={locale}
                  href="/"
                  className="inline-flex w-fit items-center text-inherit no-underline"
                  aria-label="Afenda footer home"
                >
                  <AfendaBrandLockup
                    className="max-w-[min(176px,62vw)]"
                    imgClassName="object-left"
                  />
                </LegalDocsLocaleLink>
                <div className="min-w-0">
                  <div className="grid gap-0">
                    <span className="text-[0.94rem] leading-snug font-semibold text-foreground">
                      {legalIdentity.legalEntityName}
                    </span>
                    <span className="text-[0.94rem] leading-snug font-semibold text-foreground">
                      [Company No. {legalIdentity.companyRegistrationNumber}]
                    </span>
                    <span className="text-[0.94rem] leading-snug font-semibold text-foreground">
                      {legalIdentity.incorporationStatement}
                    </span>
                  </div>
                </div>
                <p className="m-0 text-xs leading-relaxed text-muted-foreground">
                  {legalIdentity.registeredAddress}
                </p>
                <a
                  href={legalIdentity.websiteHref}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground"
                >
                  {legalIdentity.websiteLabel}: {legalIdentity.websiteValue}
                </a>
                <a
                  href={`mailto:${legalIdentity.operationalSupportEmail}`}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground"
                >
                  {legalIdentity.operationalSupportLabel}:{" "}
                  {legalIdentity.operationalSupportEmail}
                </a>
                <a
                  href={`mailto:${legalIdentity.privacyInquiryEmail}`}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground"
                >
                  {legalIdentity.privacyInquiryLabel}:{" "}
                  {legalIdentity.privacyInquiryEmail}
                </a>
              </div>

              <nav
                className="flex flex-wrap justify-start gap-x-4 gap-y-2.5 sm:justify-end"
                aria-label="Trust footer links"
              >
                {footerLinks.map((link) => (
                  <LegalDocsLocaleLink
                    locale={locale}
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "text-sm leading-relaxed text-muted-foreground underline-offset-4 hover:text-foreground",
                      link.href === trustPageHref && "text-foreground"
                    )}
                    aria-current={
                      link.href === trustPageHref ? "page" : undefined
                    }
                  >
                    {link.label}
                  </LegalDocsLocaleLink>
                ))}
              </nav>
            </footer>
          </article>
        </div>
      </div>
    </main>
  )
}
