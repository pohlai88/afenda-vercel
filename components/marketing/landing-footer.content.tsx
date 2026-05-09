import {
  cookieNoticeLink,
  dataProcessingAddendumLink,
  declarationFooterIdentity,
  declarationFooterLinks,
  securityDisclosureLink,
  subprocessorsLink,
  trustRouteLink,
} from "#features/legal-declarations"

export type LandingFooterLink = {
  readonly label: string
  readonly href: string
  readonly description?: string
}

export type LandingFooterRoute = {
  readonly label: string
  readonly value: string
  readonly href: string
  readonly detail: string
}

export const landingFooterDeclarationLinks = declarationFooterLinks.filter(
  (link) => link.href !== trustRouteLink.href
) satisfies readonly LandingFooterLink[]

export const landingFooterTrustLinks = [
  trustRouteLink,
  securityDisclosureLink,
  dataProcessingAddendumLink,
  subprocessorsLink,
  cookieNoticeLink,
] satisfies readonly LandingFooterLink[]

export const landingFooterExploreLinks = [
  {
    label: "Platform",
    href: "#platform",
    description: "How Afenda resolves operating truth across business records.",
  },
  {
    label: "Architecture",
    href: "#architecture",
    description:
      "Policy, evidence, and execution boundaries behind the system.",
  },
] satisfies readonly LandingFooterLink[]

export const landingFooterActionLinks = [
  {
    label: "Application entry",
    href: "/sign-in",
    description: "Operator access route for approved users.",
  },
  {
    label: "Operational support",
    href: `mailto:${declarationFooterIdentity.operationalSupportEmail}`,
    description: "Operational mailbox for routing public support requests.",
  },
] satisfies readonly LandingFooterLink[]

export const landingFooterContactRoutes = [
  {
    label: declarationFooterIdentity.websiteLabel,
    value: declarationFooterIdentity.websiteValue,
    href: declarationFooterIdentity.websiteHref,
    detail: "Canonical public website route.",
  },
  {
    label: declarationFooterIdentity.operationalSupportLabel,
    value: declarationFooterIdentity.operationalSupportEmail,
    href: `mailto:${declarationFooterIdentity.operationalSupportEmail}`,
    detail: "Business support and public operational routing.",
  },
  {
    label: declarationFooterIdentity.privacyInquiryLabel,
    value: declarationFooterIdentity.privacyInquiryEmail,
    href: `mailto:${declarationFooterIdentity.privacyInquiryEmail}`,
    detail: "Service notices and declaration follow-up routing.",
  },
] satisfies readonly LandingFooterRoute[]
