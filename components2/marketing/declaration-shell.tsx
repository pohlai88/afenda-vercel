import type { Route } from "next"
import type { AnchorHTMLAttributes, ReactNode } from "react"
import { Link } from "#i18n/navigation"

import { AfendaBrandLockup } from "#components2/afenda-brand"
import {
  LEGAL_ROUTE_PREFIX,
  type DeclarationContactChannel,
  type DeclarationDocumentDefinition,
  type DeclarationLegalIdentity,
  type DeclarationRelatedLink,
  type DeclarationSection,
} from "#features/legal-declarations"
import { cn } from "#lib/utils"

type DeclarationShellProps = {
  readonly document: DeclarationDocumentDefinition
  readonly footerLinks: readonly DeclarationRelatedLink[]
  readonly legalIdentity: DeclarationLegalIdentity
}

function renderChannelValue(channel: DeclarationContactChannel) {
  if (!channel.href) {
    return (
      <span className="text-sm leading-relaxed text-muted-foreground">
        {channel.value}
      </span>
    )
  }

  return (
    <a
      href={channel.href}
      className="text-sm leading-relaxed text-muted-foreground underline-offset-4 hover:text-foreground"
    >
      {channel.value}
    </a>
  )
}

function renderSectionSummary(section: DeclarationSection): string {
  return section.body[0] ?? section.bullets?.[0] ?? section.title
}

function renderBreakableEmail(value: string) {
  if (!value.includes("@")) {
    return value
  }

  const [localPart, domainPart] = value.split("@")

  return (
    <>
      {localPart}
      {"@"}
      <wbr />
      {domainPart}
    </>
  )
}

function renderSourceRef(ref: string) {
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    return (
      <a
        href={ref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[0.82rem] leading-snug break-all text-muted-foreground underline-offset-4 hover:text-foreground"
      >
        {ref}
      </a>
    )
  }

  return (
    <code className="text-[0.78rem] leading-snug break-all text-muted-foreground">
      {ref}
    </code>
  )
}

function LegalLink({
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

export function DeclarationShell({
  document,
  footerLinks,
  legalIdentity,
}: DeclarationShellProps) {
  const primaryContact = document.contactChannels[0]
  const currentFooterHref =
    document.routeHref ?? `${LEGAL_ROUTE_PREFIX}/${document.slug}`

  return (
    <main className="min-h-svh bg-background pb-16 text-foreground">
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-4 sm:px-6">
        <header className="border-b border-border pt-4 pb-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <LegalLink
              href="/"
              className="inline-flex max-w-[214px] shrink-0 text-inherit no-underline"
              aria-label="Afenda home"
            >
              <AfendaBrandLockup
                className="max-w-[min(214px,58vw)]"
                imgClassName="object-left"
                priority
              />
            </LegalLink>

            <div className="flex flex-col items-start gap-2.5 sm:items-end">
              <p className="text-[0.7rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                Public declaration
              </p>
              <LegalLink
                href="/"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground"
              >
                Return to platform
              </LegalLink>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.95fr)] lg:items-end">
            <div>
              <p className="text-[0.72rem] font-bold tracking-[0.16em] text-primary uppercase">
                {document.eyebrow}
              </p>
              <h1 className="mt-3.5 text-[2.52rem] leading-[0.98] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[4.4rem]">
                {document.title}
              </h1>
              <p className="mt-5 max-w-[760px] text-[0.96rem] leading-relaxed text-muted-foreground sm:text-[1.08rem] sm:leading-loose">
                {document.summary}
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
                  Company number
                </dt>
                <dd className="m-0 text-sm leading-snug font-semibold tabular-nums">
                  {legalIdentity.companyRegistrationNumber}
                </dd>
              </div>
              <div className="grid min-w-0 gap-2 sm:col-span-2">
                <dt className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Registered address
                </dt>
                <dd className="m-0 text-sm leading-snug font-semibold text-pretty">
                  {legalIdentity.registeredAddress}
                </dd>
              </div>
              <div className="grid min-w-0 gap-2 sm:col-span-2">
                <dt className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Primary route
                </dt>
                <dd className="m-0 text-sm leading-snug font-semibold">
                  {primaryContact?.href ? (
                    <a
                      href={primaryContact.href}
                      className="break-all text-inherit no-underline hover:underline sm:break-normal"
                    >
                      {renderBreakableEmail(primaryContact.value)}
                    </a>
                  ) : (
                    (primaryContact?.value ?? legalIdentity.privacyInquiryEmail)
                  )}
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
                  In this declaration
                </h2>
                <nav aria-label={`${document.title} sections`}>
                  <ol className="mt-3.5 grid list-none gap-2.5 p-0">
                    {document.sections.map((section) => (
                      <li key={section.id} className="min-w-0">
                        <a
                          href={`#${section.id}`}
                          className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                        >
                          <strong className="text-[0.94rem] leading-snug font-semibold text-inherit">
                            {section.title}
                          </strong>
                          <span className="text-[0.82rem] leading-snug text-muted-foreground">
                            {renderSectionSummary(section)}
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
                    {document.relatedLinks.map((link) => (
                      <li key={link.href} className="min-w-0">
                        <LegalLink
                          href={link.href}
                          className="grid gap-1 text-muted-foreground no-underline hover:text-foreground"
                        >
                          <strong className="text-[0.94rem] leading-snug font-semibold text-inherit">
                            {link.label}
                          </strong>
                          <span className="text-[0.82rem] leading-snug text-muted-foreground">
                            {link.description}
                          </span>
                        </LegalLink>
                      </li>
                    ))}
                  </ul>
                </nav>
              </section>

              <section className="border-t border-border pt-3.5">
                <h2 className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Contact routes
                </h2>
                <div className="mt-3 grid gap-3">
                  {document.contactChannels.map((channel) => (
                    <div key={channel.label} className="grid min-w-0 gap-1">
                      <span className="text-sm font-semibold text-foreground">
                        {channel.label}
                      </span>
                      {renderChannelValue(channel)}
                      <span className="text-[0.82rem] leading-snug text-muted-foreground">
                        {channel.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-t border-border pt-3.5">
                <h2 className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Review sources
                </h2>
                <div className="mt-3 grid gap-2.5">
                  {document.sourceRefs.map((ref) => (
                    <div key={ref} className="min-w-0">
                      {renderSourceRef(ref)}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>

          <article className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-2.5 gap-x-4 border-b border-border pb-3.5">
              <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-muted/80 px-3 text-[0.76rem] font-bold tracking-wider uppercase">
                Static declaration
              </span>
              {document.statusNote ? (
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {document.statusNote}
                </span>
              ) : null}
              {document.lastUpdatedLabel ? (
                <span className="text-xs text-muted-foreground">
                  {document.lastUpdatedLabel}
                </span>
              ) : null}
            </div>

            <p className="mb-3 max-w-[760px] text-base leading-relaxed text-muted-foreground">
              {document.description}
            </p>

            {document.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="border-t border-border py-6 first:border-t-0 first:pt-0 sm:py-8"
              >
                <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-[0.82rem] font-bold text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h2 className="m-0 text-[1.58rem] leading-tight font-semibold tracking-tight">
                      {section.title}
                    </h2>
                    <div className="mt-4 grid gap-4">
                      {section.body.map((paragraph) => (
                        <p
                          key={paragraph}
                          className="m-0 text-[0.98rem] leading-relaxed text-muted-foreground"
                        >
                          {paragraph}
                        </p>
                      ))}
                      {section.bullets ? (
                        <ul className="grid gap-2.5 pl-5 text-[0.98rem] leading-relaxed text-muted-foreground marker:text-muted-foreground">
                          {section.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </article>
        </div>

        <footer className="mt-12 grid gap-5 border-t border-border pt-6 sm:grid-cols-[minmax(0,1.16fr)_auto] sm:items-end">
          <div className="grid gap-2">
            <LegalLink
              href="/"
              className="inline-flex w-fit max-w-[176px] text-inherit no-underline"
              aria-label="Afenda footer home"
            >
              <AfendaBrandLockup
                className="max-w-[min(176px,62vw)]"
                imgClassName="object-left"
              />
            </LegalLink>
            <div className="grid gap-0 text-[0.94rem] leading-snug font-semibold">
              <span>{legalIdentity.legalEntityName}</span>
              <span>
                [Company No. {legalIdentity.companyRegistrationNumber}]
              </span>
              <span>{legalIdentity.incorporationStatement}</span>
            </div>
            <p className="m-0 text-xs leading-relaxed text-muted-foreground">
              {legalIdentity.registeredAddress}
            </p>
            <a
              href={legalIdentity.websiteHref}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground"
            >
              {legalIdentity.websiteLabel}: {legalIdentity.websiteValue}
            </a>
            <a
              href={`mailto:${legalIdentity.operationalSupportEmail}`}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground"
            >
              {legalIdentity.operationalSupportLabel}:{" "}
              {legalIdentity.operationalSupportEmail}
            </a>
            <a
              href={`mailto:${legalIdentity.privacyInquiryEmail}`}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground"
            >
              {legalIdentity.privacyInquiryLabel}:{" "}
              {legalIdentity.privacyInquiryEmail}
            </a>
          </div>

          <nav
            className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end"
            aria-label="Declaration footer links"
          >
            {footerLinks.map((link) => (
              <LegalLink
                key={link.href}
                href={link.href}
                aria-current={
                  link.href === currentFooterHref ? "page" : undefined
                }
                className={cn(
                  "text-xs text-muted-foreground underline-offset-4 hover:text-foreground",
                  link.href === currentFooterHref &&
                    "font-medium text-foreground"
                )}
              >
                {link.label}
              </LegalLink>
            ))}
          </nav>
        </footer>
      </div>
    </main>
  )
}
