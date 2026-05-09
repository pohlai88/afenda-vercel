import type { Route } from "next"
import Image from "next/image"
import type { AnchorHTMLAttributes, ReactNode } from "react"
import { Link } from "#i18n/navigation"

import { LEGAL_ROUTE_PREFIX } from "#features/legal-declarations"
import type {
  TrustControlSurfaceProps,
  TrustSurfaceItem,
  TrustSurfaceState,
} from "#features/public-trust"
import { BRAND_COMBINED_LOCKUP_SVG } from "#lib/site"
import { cn } from "#lib/utils"

const trustPageHref = `${LEGAL_ROUTE_PREFIX}/trust`

function TrustHref({
  href,
  className,
  children,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
}: {
  href: string
  className?: string
  children: ReactNode
  "aria-current"?: AnchorHTMLAttributes<HTMLAnchorElement>["aria-current"]
  "aria-label"?: string
}) {
  if (href.startsWith("mailto:") || href.startsWith("http")) {
    return (
      <a
        href={href}
        className={className}
        aria-current={ariaCurrent}
        aria-label={ariaLabel}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    )
  }

  return (
    <Link
      href={href as Route}
      className={className}
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  )
}

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

function renderSurfaceRoute(surface: TrustSurfaceItem) {
  if (surface.isPublicLink) {
    return (
      <TrustHref
        href={surface.route}
        className="text-foreground underline-offset-4 hover:text-foreground"
      >
        {surface.route}
      </TrustHref>
    )
  }

  return (
    <span className="font-mono text-sm leading-snug break-words text-foreground">
      {surface.route}
    </span>
  )
}

export function TrustControlSurface({
  definition,
  legalIdentity,
  footerLinks,
}: TrustControlSurfaceProps) {
  return (
    <main className="afenda-trust-surface min-h-svh bg-background pb-16 text-foreground">
      <div className="mx-auto w-[min(100%-48px,1260px)] pt-6 sm:w-[min(100%-24px,1260px)] sm:pt-4">
        <header className="border-b border-border pt-4 pb-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <TrustHref
              href="/"
              className="inline-flex max-w-[214px] shrink-0 items-center text-inherit no-underline"
              aria-label="Afenda public landing"
            >
              <Image
                src={BRAND_COMBINED_LOCKUP_SVG}
                alt="Afenda"
                width={1800}
                height={488}
                sizes="(max-width: 680px) min(58vw, 192px), 214px"
                className="block h-auto w-[min(214px,58vw)]"
                priority
              />
            </TrustHref>

            <div className="grid justify-items-end gap-2.5 sm:justify-items-end">
              <p className="m-0 text-[0.7rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                Canonical public assurance surface
              </p>
              <TrustHref
                href="/"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground"
              >
                Return to platform
              </TrustHref>
            </div>
          </div>

          <div className="align-end mt-8 grid gap-7 lg:grid-cols-[minmax(0,1.36fr)_minmax(320px,0.88fr)] lg:gap-x-8 xl:gap-x-9">
            <div>
              <p className="m-0 text-[0.72rem] font-bold tracking-[0.16em] text-primary uppercase">
                {definition.eyebrow}
              </p>
              <h1 className="mt-3.5 text-[2.58rem] leading-[0.98] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[4.5rem]">
                {definition.title}
              </h1>
              <p className="mt-5 max-w-[780px] text-[0.96rem] leading-relaxed text-muted-foreground sm:text-[1.08rem] sm:leading-loose">
                {definition.summary}
              </p>
              <p className="mt-5 max-w-[760px] text-[0.98rem] leading-relaxed text-muted-foreground">
                {definition.description}
              </p>
            </div>

            <section
              className="grid gap-3.5 rounded-lg border border-border bg-gradient-to-br from-card to-muted/40 p-5 shadow-elevation-1 sm:p-6"
              aria-label="Trust doctrine"
            >
              <p className="m-0 text-[0.68rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                Doctrine
              </p>
              <p className="m-0 text-[1.08rem] leading-relaxed font-semibold text-foreground">
                {definition.doctrine}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
                <span className="text-[0.92rem] leading-snug text-muted-foreground">
                  {definition.statusNote}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {definition.lastUpdatedLabel}
                </span>
              </div>
            </section>
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-8 pt-9 xl:grid-cols-[minmax(228px,260px)_minmax(0,1fr)] xl:gap-x-8">
          <aside className="min-w-0">
            <nav
              className="sticky top-24 grid gap-5 xl:top-[104px]"
              aria-label="Trust sections"
            >
              <section className="grid gap-3.5 border-t border-border pt-3.5">
                <h2 className="m-0 text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Control surface
                </h2>
                <ul className="m-0 grid list-none gap-2.5 p-0">
                  <li>
                    <a
                      href="#posture"
                      className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                    >
                      <strong className="text-[0.92rem] leading-snug font-semibold text-inherit">
                        Current posture
                      </strong>
                      <span className="text-[0.82rem] leading-relaxed text-muted-foreground">
                        What is publicly declared right now.
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#evidence"
                      className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                    >
                      <strong className="text-[0.92rem] leading-snug font-semibold text-inherit">
                        Evidence
                      </strong>
                      <span className="text-[0.82rem] leading-relaxed text-muted-foreground">
                        What is proven and when it was last updated.
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#surfaces"
                      className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                    >
                      <strong className="text-[0.92rem] leading-snug font-semibold text-inherit">
                        Surfaces
                      </strong>
                      <span className="text-[0.82rem] leading-relaxed text-muted-foreground">
                        Live, planned, and withheld trust routes.
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#commitments"
                      className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                    >
                      <strong className="text-[0.92rem] leading-snug font-semibold text-inherit">
                        Commitments
                      </strong>
                      <span className="text-[0.82rem] leading-relaxed text-muted-foreground">
                        How Afenda routes trust-sensitive work.
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#boundaries"
                      className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                    >
                      <strong className="text-[0.92rem] leading-snug font-semibold text-inherit">
                        Boundaries
                      </strong>
                      <span className="text-[0.82rem] leading-relaxed text-muted-foreground">
                        What Afenda explicitly does not claim.
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#activation-rules"
                      className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                    >
                      <strong className="text-[0.92rem] leading-snug font-semibold text-inherit">
                        Activation rules
                      </strong>
                      <span className="text-[0.82rem] leading-relaxed text-muted-foreground">
                        What must exist before new trust routes ship.
                      </span>
                    </a>
                  </li>
                </ul>
              </section>
            </nav>
          </aside>

          <div className="min-w-0">
            <section id="posture" className="pb-9">
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
                          <TrustHref
                            href={signal.href}
                            className="underline-offset-4 hover:text-foreground"
                          >
                            {signal.proofSource}
                          </TrustHref>
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
                      <TrustHref
                        href={item.href}
                        className="text-[0.88rem] leading-snug break-words text-foreground underline-offset-4 hover:text-foreground"
                      >
                        {item.href}
                      </TrustHref>
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
                Live surfaces have public links. Planned and withheld surfaces
                are named here, but they remain inactive until their activation
                rule is satisfied.
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
                        {renderSurfaceRoute(surface)}
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
                        <TrustHref
                          href={commitment.href}
                          className="text-[0.88rem] leading-snug break-words text-foreground underline-offset-4 hover:text-foreground"
                        >
                          {commitment.href}
                        </TrustHref>
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

            <footer className="mt-5 grid gap-5 border-t border-border pt-6 sm:grid-cols-[minmax(0,1.16fr)_auto] sm:items-end sm:gap-x-8">
              <div className="grid gap-2">
                <TrustHref
                  href="/"
                  className="inline-flex w-fit items-center text-inherit no-underline"
                  aria-label="Afenda footer home"
                >
                  <Image
                    src={BRAND_COMBINED_LOCKUP_SVG}
                    alt="Afenda"
                    width={1800}
                    height={488}
                    sizes="(max-width: 640px) min(62vw, 180px), 176px"
                    className="block h-auto w-[min(176px,62vw)]"
                  />
                </TrustHref>
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
                  <TrustHref
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
                  </TrustHref>
                ))}
              </nav>
            </footer>
          </div>
        </div>
      </div>
    </main>
  )
}
