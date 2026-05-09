/**
 * Canonical declaration footer identity and route data (ported from afenda-next marketing).
 * Locale-internal paths use the `/legal-docs/…` prefix.
 */
import type { DeclarationLegalIdentity, DeclarationRelatedLink } from "../types"

export const LEGAL_ROUTE_PREFIX = "/legal-docs" as const

export const declarationFooterIdentity = {
  legalEntityName: "VAP MANAGEMENT SERVICES SDN BHD",
  companyRegistrationNumber: "(201901041084) (1350414-A)",
  incorporationStatement: "Incorporated in Malaysia.",
  regionalStatement: "Serving businesses across Southeast Asia.",
  registeredAddress:
    "22-1, Jalan Bayu Tinggi 2A/KS6 Batu Unjur, 41200 Klang Selangor, Malaysia",
  websiteLabel: "Website",
  websiteValue: "www.nexuscanon.com",
  websiteHref: "https://www.nexuscanon.com",
  operationalSupportLabel: "Operational support",
  operationalSupportEmail: "support@nexuscanon.com",
  privacyInquiryLabel: "Service notices",
  privacyInquiryEmail: "no-reply@nexuscanon.com",
} satisfies DeclarationLegalIdentity

export const trustRouteLink = {
  href: `${LEGAL_ROUTE_PREFIX}/trust`,
  label: "Trust",
  description:
    "Canonical public assurance surface showing current posture, evidence, commitments, and boundaries.",
} satisfies DeclarationRelatedLink

export const cookieNoticeLink = {
  href: `${LEGAL_ROUTE_PREFIX}/cookies`,
  label: "Cookie Notice",
  description:
    "Current essential cookie, local storage, authentication, session, and control posture.",
} satisfies DeclarationRelatedLink

export const dataProcessingAddendumLink = {
  href: `${LEGAL_ROUTE_PREFIX}/data-processing-addendum`,
  label: "Data Processing Addendum",
  description:
    "Malaysia PDPA-aligned customer processing terms, request route, and legal section map.",
} satisfies DeclarationRelatedLink

export const subprocessorsLink = {
  href: `${LEGAL_ROUTE_PREFIX}/subprocessors`,
  label: "Subprocessors",
  description:
    "Validated vendor inventory, purpose, jurisdiction, and production-processing status.",
} satisfies DeclarationRelatedLink

export const securityDisclosureLink = {
  href: `${LEGAL_ROUTE_PREFIX}/security/disclosure`,
  label: "Security Disclosure",
  description:
    "Formal vulnerability disclosure route with scope, safe harbor language, and reporting expectations.",
} satisfies DeclarationRelatedLink

export const declarationFooterLinks = [
  {
    href: `${LEGAL_ROUTE_PREFIX}/privacy`,
    label: "Privacy Notice",
    description:
      "How Afenda handles personal data, disclosures, retention, transfers, and privacy rights.",
  },
  {
    href: `${LEGAL_ROUTE_PREFIX}/terms`,
    label: "Terms of Use",
    description:
      "The public service boundary, customer responsibilities, and commercial use posture.",
  },
  {
    href: `${LEGAL_ROUTE_PREFIX}/security`,
    label: "Security",
    description:
      "Security posture, infrastructure boundary, access controls, and trust reporting routes.",
  },
  {
    href: `${LEGAL_ROUTE_PREFIX}/support`,
    label: "Support",
    description:
      "Business support, escalation paths, declaration index, and operational contact model.",
  },
  dataProcessingAddendumLink,
  subprocessorsLink,
  cookieNoticeLink,
  trustRouteLink,
] as const satisfies readonly DeclarationRelatedLink[]
