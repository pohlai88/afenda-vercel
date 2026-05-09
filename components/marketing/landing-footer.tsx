import type { Route } from "next"
import type { ReactNode } from "react"

import { AfendaBrandLockup } from "#components/afenda-brand"
import {
  declarationFooterIdentity,
  type DeclarationLegalIdentity,
} from "#features/legal-declarations"
import { Link } from "#i18n/navigation"

import {
  landingFooterActionLinks,
  landingFooterContactRoutes,
  landingFooterDeclarationLinks,
  landingFooterExploreLinks,
  landingFooterTrustLinks,
  type LandingFooterLink,
} from "./landing-footer.content"

const declarationFooterLegalLines = [
  declarationFooterIdentity.legalEntityName,
  `[Company No. ${declarationFooterIdentity.companyRegistrationNumber}]`,
  declarationFooterIdentity.incorporationStatement,
] as const

function isInternalHref(href: string) {
  return href.startsWith("/") || href.startsWith("#")
}

function FooterLink({
  children,
  className,
  href,
}: {
  readonly children: ReactNode
  readonly className: string
  readonly href: string
}) {
  if (isInternalHref(href)) {
    return (
      <Link href={href as Route} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <a
      href={href}
      className={className}
      {...(href.startsWith("http")
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </a>
  )
}

function FooterColumnHeading({
  description,
  id,
  title,
}: {
  readonly description: string
  readonly id?: string
  readonly title: string
}) {
  return (
    <div className="grid gap-3">
      <p
        id={id}
        className="m-0 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase"
      >
        {title}
      </p>
      <p className="m-0 max-w-[28ch] text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function FooterListLink({ description, href, label }: LandingFooterLink) {
  return (
    <FooterLink
      href={href}
      className="group grid rounded-sm border-t border-border pt-3 text-sm text-muted-foreground no-underline transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <strong className="font-semibold text-foreground transition-colors">
        {label}
      </strong>
      {description ? (
        <span className="text-xs leading-6 text-muted-foreground">
          {description}
        </span>
      ) : null}
    </FooterLink>
  )
}

function FooterRouteLink({
  detail,
  href,
  label,
  value,
}: {
  readonly detail: string
  readonly href: string
  readonly label: string
  readonly value: string
}) {
  return (
    <FooterLink
      href={href}
      className="group grid rounded-sm border-t border-border pt-3 text-sm text-muted-foreground no-underline transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <strong className="font-semibold text-foreground transition-colors">
        {label}
      </strong>
      <span className="break-words text-muted-foreground">{value}</span>
      <span className="text-xs leading-6 text-muted-foreground">{detail}</span>
    </FooterLink>
  )
}

function FooterActionLink({ href, label }: LandingFooterLink) {
  return (
    <FooterLink
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {label}
    </FooterLink>
  )
}

function FooterMetaBlock({
  children,
  title,
}: {
  readonly children: ReactNode
  readonly title: string
}) {
  return (
    <div className="grid gap-2 border-t border-border pt-3">
      <strong className="text-sm font-semibold tracking-normal text-foreground">
        {title}
      </strong>
      {children}
    </div>
  )
}

export function LandingFooter({
  identity = declarationFooterIdentity,
}: {
  readonly identity?: DeclarationLegalIdentity
}) {
  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-[1240px] gap-x-10 gap-y-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_0.85fr_1fr_0.85fr] lg:py-16">
        <section
          aria-labelledby="landing-footer-identity"
          className="grid content-start gap-5 lg:pr-4"
        >
          <Link
            href="/"
            aria-label="Afenda footer home"
            className="inline-flex w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <AfendaBrandLockup
              className="max-w-[196px]"
              imgClassName="object-left"
            />
          </Link>

          <div className="grid gap-3">
            <p
              id="landing-footer-identity"
              className="m-0 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase"
            >
              Company
            </p>
            <div className="grid gap-2">
              <p className="m-0 text-sm font-semibold tracking-normal text-foreground">
                Public trust and declaration routing for Afenda.
              </p>
              <p className="m-0 max-w-[38ch] text-xs leading-6 text-muted-foreground">
                Afenda is delivered through NexusCanon, resolving declarations,
                trust review, and support routing into one public operating
                surface.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <FooterMetaBlock title="Legal identity">
              <p className="m-0 text-xs leading-6 text-muted-foreground">
                {declarationFooterLegalLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </FooterMetaBlock>
            <FooterMetaBlock title="Registered address">
              <p className="m-0 text-xs leading-6 text-muted-foreground">
                {identity.registeredAddress}
              </p>
            </FooterMetaBlock>
          </div>
        </section>

        <nav
          aria-label="Footer declarations"
          className="grid content-start gap-4"
        >
          <FooterColumnHeading
            title="Declarations"
            description="Privacy, terms, security, and support stay public and indexable."
          />
          <div className="grid gap-2">
            {landingFooterDeclarationLinks.map((link) => (
              <FooterListLink key={link.href} {...link} />
            ))}
          </div>
        </nav>

        <section
          aria-labelledby="landing-footer-trust"
          className="grid content-start gap-4"
        >
          <FooterColumnHeading
            id="landing-footer-trust"
            title="Trust routes"
            description="Security review and public routing stay explicit for procurement, privacy, and disclosure follow-up."
          />
          <nav aria-label="Trust routes" className="grid gap-2">
            {landingFooterTrustLinks.map((link) => (
              <FooterListLink key={link.href} {...link} />
            ))}
          </nav>
          <div className="grid gap-2 pt-1">
            {landingFooterContactRoutes.map((route) => (
              <FooterRouteLink key={route.href} {...route} />
            ))}
          </div>
        </section>

        <section
          aria-labelledby="landing-footer-actions"
          className="grid content-start gap-4"
        >
          <FooterColumnHeading
            id="landing-footer-actions"
            title="Next action"
            description="Route operators and reviewers to access, support, or the relevant public route."
          />
          <nav
            aria-label="Footer actions"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"
          >
            {landingFooterActionLinks.map((link) => (
              <FooterActionLink key={link.href} {...link} />
            ))}
          </nav>
          <nav aria-label="Footer explore links" className="grid gap-2 pt-1">
            {landingFooterExploreLinks.map((link) => (
              <FooterListLink key={link.href} {...link} />
            ))}
          </nav>
        </section>
      </div>
    </footer>
  )
}
