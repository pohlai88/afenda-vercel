/**
 * Static trust-surface data for `/legal-docs/trust`. Locale-internal routes use the `/legal-docs/*` prefix.
 */
import type { Metadata } from "next"

import {
  declarationDocuments,
  latestLegalDeclarationReviewedAt,
} from "./declaration-registry.shared"
import { LEGAL_ROUTE_PREFIX } from "./footer.shared"
import { formatDeclarationReviewedLabel } from "./review.shared"
import { DEFAULT_OG_IMAGE, SITE_NAME, getSiteUrl } from "#lib/site"

import type { OpenStatusPublicSnapshot } from "./openstatus-status.shared"
import type {
  TrustActivationRule,
  TrustBoundaryStatement,
  TrustCommitment,
  TrustEvidenceItem,
  TrustPostureSignal,
  TrustSurfaceDefinition,
  TrustSurfaceItem,
} from "../types"

export const trustSurfaceLastUpdatedLabel = formatDeclarationReviewedLabel(
  latestLegalDeclarationReviewedAt
)
export const securityTxtHref = "/.well-known/security.txt" as const
export const securityTxtExpiresAt = "2027-05-05T00:00:00.000Z"

export const publicTrustOwnerRoutes = {
  privacy: {
    label: "Privacy route",
    value: "support@nexuscanon.com",
    href: "mailto:support@nexuscanon.com",
    detail:
      "Use for privacy notices, rights requests, data handling questions, and transfer enquiries.",
  },
  security: {
    label: "Security route",
    value: "support@nexuscanon.com",
    href: "mailto:support@nexuscanon.com",
    detail:
      "Use for vulnerability disclosure, trust reviews, and security-sensitive operational issues.",
  },
  support: {
    label: "Support route",
    value: "support@nexuscanon.com",
    href: "mailto:support@nexuscanon.com",
    detail:
      "Use for public product questions, operational routing, and declaration follow-up.",
  },
} as const

const L = LEGAL_ROUTE_PREFIX
const COOKIE_ROUTE = declarationDocuments.cookies.routeHref
const DPA_ROUTE = declarationDocuments["data-processing-addendum"].routeHref
const SUBPROCESSORS_ROUTE = declarationDocuments.subprocessors.routeHref
export const STATUS_ROUTE = `${L}/status` as const

function declarationRouteLabel(
  slug: keyof typeof declarationDocuments
): string {
  return formatDeclarationReviewedLabel(declarationDocuments[slug].reviewedAt)
}

export const publicTrustIndexableRoutes = [
  COOKIE_ROUTE,
  DPA_ROUTE,
  SUBPROCESSORS_ROUTE,
  STATUS_ROUTE,
  `${L}/privacy`,
  `${L}/terms`,
  `${L}/security`,
  `${L}/security/disclosure`,
  `${L}/support`,
  `${L}/trust`,
] as const

const trustPostureSignals = [
  {
    id: "security-posture",
    label: "Security posture",
    state: "live",
    summary:
      "Security posture is public because Afenda already exposes a security route, a disclosure route, and a machine-readable intake entry.",
    ownerRoute: publicTrustOwnerRoutes.security.value,
    proofSource: "Security posture and disclosure routes are live.",
    lastUpdatedLabel: trustSurfaceLastUpdatedLabel,
    href: `${L}/security`,
  },
  {
    id: "operations-posture",
    label: "Operational status posture",
    state: "live",
    summary:
      "Afenda publishes a public status route now. OpenStatus remains the intended availability authority, and the status route discloses source-health gaps instead of hiding them.",
    ownerRoute: publicTrustOwnerRoutes.support.value,
    proofSource: `Backed by the live ${STATUS_ROUTE} route and its current source-health disclosure.`,
    lastUpdatedLabel: trustSurfaceLastUpdatedLabel,
    href: STATUS_ROUTE,
  },
  {
    id: "data-handling-posture",
    label: "Data handling posture",
    state: "live",
    summary:
      "Privacy, terms, support ownership, the cookie notice, the data processing addendum route, and the subprocessor inventory are public, indexable, and backed by a Malaysia-first PDPA notice plus explicit public routes rather than inferred marketing language.",
    ownerRoute: publicTrustOwnerRoutes.privacy.value,
    proofSource:
      "Privacy, terms, support, cookie notice, DPA request, and subprocessor inventory routes are live.",
    lastUpdatedLabel: trustSurfaceLastUpdatedLabel,
    href: `${L}/privacy`,
  },
] satisfies readonly TrustPostureSignal[]

const trustEvidenceItems = [
  {
    id: "evidence-privacy",
    title: "Data handling route is public",
    statement:
      "Afenda has a live privacy notice, commercial boundary, support route, cookie notice, data processing addendum route, and subprocessor inventory. The privacy notice names the Malaysia-established operator, the customer-controlled workflow boundary, and the current cookie posture instead of hiding that detail behind sales process.",
    href: `${L}/privacy`,
    proofSource: `Backed by ${L}/privacy, ${L}/terms, ${L}/support, ${COOKIE_ROUTE}, ${DPA_ROUTE}, and ${SUBPROCESSORS_ROUTE}.`,
    lastUpdatedLabel: declarationRouteLabel("privacy"),
  },
  {
    id: "evidence-disclosure",
    title: "Security reporting path exists",
    statement:
      "Security intake is publicly named, documented, and mirrored in a machine-readable security.txt route so reporters do not need to guess where to go.",
    href: `${L}/security/disclosure`,
    proofSource: `Backed by ${L}/security/disclosure and ${securityTxtHref}.`,
    lastUpdatedLabel: declarationRouteLabel("security/disclosure"),
  },
  {
    id: "evidence-status",
    title: "Status route is public",
    statement:
      "Afenda publishes a public status wrapper even when the OpenStatus source needs remediation. The route stays visible so source-health gaps are declared rather than hidden.",
    href: STATUS_ROUTE,
    proofSource: `Backed by ${STATUS_ROUTE}.`,
    lastUpdatedLabel: trustSurfaceLastUpdatedLabel,
  },
  {
    id: "evidence-boundaries",
    title: "Unsupported claims are withheld",
    statement:
      "Afenda publicly states which trust claims it does not make yet, including certifications, uptime guarantees, and unverified vendor disclosures.",
    href: `${L}/trust`,
    proofSource: `Backed by the boundaries section on ${L}/trust.`,
    lastUpdatedLabel: trustSurfaceLastUpdatedLabel,
  },
  {
    id: "evidence-ownership",
    title: "Owner routes are explicit",
    statement:
      "Privacy, security, and support ownership are routed through explicit public contact paths instead of ambiguous contact language.",
    href: `${L}/support`,
    proofSource: `Backed by ${L}/support and the owner-route fields on ${L}/trust.`,
    lastUpdatedLabel: declarationRouteLabel("support"),
  },
] satisfies readonly TrustEvidenceItem[]

const trustSurfaceItems: readonly TrustSurfaceItem[] = [
  {
    id: "surface-trust",
    label: "Trust control surface",
    route: `${L}/trust`,
    state: "live",
    summary:
      "Canonical public assurance surface showing what is live, what is proven, and what remains withheld.",
    ownerRoute: publicTrustOwnerRoutes.support.value,
    proofSource: "This route is itself the public assurance control surface.",
    lastUpdatedLabel: trustSurfaceLastUpdatedLabel,
    isPublicLink: true,
  },
  {
    id: "surface-privacy",
    label: "Privacy notice",
    route: `${L}/privacy`,
    state: "live",
    summary:
      "Public privacy route covering PDPA-aligned notice, data collection, use, disclosures, transfers, cookie posture, and contact paths.",
    ownerRoute: publicTrustOwnerRoutes.privacy.value,
    proofSource: "Privacy declaration is live and indexable.",
    lastUpdatedLabel: declarationRouteLabel("privacy"),
    isPublicLink: true,
  },
  {
    id: "surface-terms",
    label: "Terms of use",
    route: `${L}/terms`,
    state: "live",
    summary:
      "Public commercial boundary describing service scope, responsibilities, and route usage posture.",
    ownerRoute: publicTrustOwnerRoutes.support.value,
    proofSource: "Terms declaration is live and indexable.",
    lastUpdatedLabel: declarationRouteLabel("terms"),
    isPublicLink: true,
  },
  {
    id: "surface-security",
    label: "Security posture",
    route: `${L}/security`,
    state: "live",
    summary:
      "High-level security posture covering infrastructure boundaries, access control, and trust routing.",
    ownerRoute: publicTrustOwnerRoutes.security.value,
    proofSource: "Security declaration is live and indexable.",
    lastUpdatedLabel: declarationRouteLabel("security"),
    isPublicLink: true,
  },
  {
    id: "surface-disclosure",
    label: "Security disclosure",
    route: `${L}/security/disclosure`,
    state: "live",
    summary:
      "Formal vulnerability intake with scope, safe harbor, and report expectations.",
    ownerRoute: publicTrustOwnerRoutes.security.value,
    proofSource: "Disclosure route is live and linked from security posture.",
    lastUpdatedLabel: declarationRouteLabel("security/disclosure"),
    isPublicLink: true,
  },
  {
    id: "surface-security-txt",
    label: "security.txt",
    route: securityTxtHref,
    state: "live",
    summary:
      "Machine-readable disclosure entry so external reporters and tooling can reach the right route without guesswork.",
    ownerRoute: publicTrustOwnerRoutes.security.value,
    proofSource:
      "Generated from the same canonical route constants as the disclosure page.",
    lastUpdatedLabel: trustSurfaceLastUpdatedLabel,
    isPublicLink: true,
  },
  {
    id: "surface-support",
    label: "Support",
    route: `${L}/support`,
    state: "live",
    summary:
      "Public support and escalation route for operational follow-up and declaration ownership.",
    ownerRoute: publicTrustOwnerRoutes.support.value,
    proofSource: "Support route is live and indexable.",
    lastUpdatedLabel: declarationRouteLabel("support"),
    isPublicLink: true,
  },
  {
    id: "surface-status",
    label: "Status",
    route: STATUS_ROUTE,
    state: "live",
    summary:
      "Public availability route that reflects OpenStatus when available and discloses source-health gaps when the authority is unconfigured or unavailable.",
    ownerRoute: publicTrustOwnerRoutes.support.value,
    proofSource:
      "The route is public now and names OpenStatus as the availability authority without inventing uptime claims.",
    lastUpdatedLabel: trustSurfaceLastUpdatedLabel,
    isPublicLink: true,
  },
  {
    id: "surface-subprocessors",
    label: "Subprocessors",
    route: SUBPROCESSORS_ROUTE,
    state: "live",
    summary:
      "Public vendor inventory classifying production subprocessors, conditional processors, development tools, and software components.",
    ownerRoute: publicTrustOwnerRoutes.privacy.value,
    proofSource:
      "Subprocessor route is live with vendor purpose, jurisdiction/location posture, and official source links.",
    lastUpdatedLabel: declarationRouteLabel("subprocessors"),
    isPublicLink: true,
  },
  {
    id: "surface-dpa",
    label: "Data processing addendum",
    route: DPA_ROUTE,
    state: "live",
    summary:
      "Public Malaysia PDPA-aligned DPA baseline with statutory section mapping, owner route, and request handling path.",
    ownerRoute: publicTrustOwnerRoutes.privacy.value,
    proofSource:
      "DPA request route is live and cites Act 709 and Act A1727 sections.",
    lastUpdatedLabel: declarationRouteLabel("data-processing-addendum"),
    isPublicLink: true,
  },
  {
    id: "surface-cookies",
    label: "Cookie notice",
    route: COOKIE_ROUTE,
    state: "live",
    summary:
      "Public cookie notice covering the current essential/auth/session/local storage posture and the control rule for future non-essential categories.",
    ownerRoute: publicTrustOwnerRoutes.privacy.value,
    proofSource: `Cookie notice is live and cross-referenced from ${L}/privacy.`,
    lastUpdatedLabel: declarationRouteLabel("cookies"),
    isPublicLink: true,
  },
]

const trustCommitments = [
  {
    id: "commitment-disclosure",
    title: "Disclosure reports go to a named route",
    summary:
      "Security-sensitive reports do not depend on a generic contact form. They route through an explicit public security path and the disclosure route.",
    expectation:
      "Reporters should send enough context to reproduce the issue, understand the boundary, and assign the correct owner.",
    ownerRoute: publicTrustOwnerRoutes.security.value,
    href: `${L}/security/disclosure`,
  },
  {
    id: "commitment-ownership",
    title: "Owner routes stay explicit",
    summary:
      "Privacy, security, and support remain separate public routes so requests can be routed without losing business context.",
    expectation:
      "Afenda should route a request to the right operational owner rather than collapsing every issue into one ambiguous queue.",
    ownerRoute: publicTrustOwnerRoutes.support.value,
    href: `${L}/support`,
  },
  {
    id: "commitment-negative-space",
    title: "Unsupported claims stay absent",
    summary:
      "Afenda would rather name a missing claim than imply one. Trust expands only where the operational backing already exists.",
    expectation:
      "No certification, SLA, or vendor claim should appear until the underlying source of truth exists.",
    ownerRoute: publicTrustOwnerRoutes.support.value,
    href: `${L}/trust`,
  },
  {
    id: "commitment-temporal",
    title: "Public trust is time-bound",
    summary:
      "Each live trust surface carries a freshness label so readers can tell when the public posture was last reviewed.",
    expectation:
      "Trust content should be updated deliberately, and stale or unverified surfaces should be withheld rather than guessed.",
    ownerRoute: publicTrustOwnerRoutes.privacy.value,
    href: `${L}/privacy`,
  },
] satisfies readonly TrustCommitment[]

const trustBoundaryStatements = [
  {
    id: "boundary-soc2",
    title: "No SOC 2 certification claimed",
    detail:
      "Afenda does not currently claim external certification until that evidence exists and can be defended.",
  },
  {
    id: "boundary-sla",
    title: "No uptime SLA claimed",
    detail:
      "Afenda does not publish uptime promises or availability percentages before live status evidence and maintenance publication are in place.",
  },
  {
    id: "boundary-subprocessors",
    title: "No unverified tool treated as a production subprocessor",
    detail:
      "The subprocessor route separates production processors from development tooling and software components. Customer data should not be sent through development tools unless a deliberate approval path exists.",
  },
  {
    id: "boundary-dpa",
    title: "No executed DPA implied by the public route",
    detail:
      "The public data processing addendum route is a request and baseline terms surface. Customer-specific execution, procurement terms, and implementation scope still require written confirmation.",
  },
  {
    id: "boundary-cookies",
    title: "No non-essential cookie categories claimed",
    detail:
      "The cookie notice names only the current essential/auth/session/local storage posture. Non-essential categories should appear only after purpose, source, retention posture, and user controls are real.",
  },
] satisfies readonly TrustBoundaryStatement[]

const trustActivationRules = [
  {
    id: "TRUST-SUBPROC-001",
    surfaceLabel: "Subprocessors",
    route: SUBPROCESSORS_ROUTE,
    requirements: [
      "Vendor inventory is verified.",
      "Service purpose is defined.",
      "Region or jurisdiction is defined.",
    ],
  },
  {
    id: "TRUST-DPA-001",
    surfaceLabel: "Data processing addendum",
    route: DPA_ROUTE,
    requirements: [
      "A request intake path exists.",
      "An owner route exists.",
      "A response handling path is defined.",
    ],
  },
  {
    id: "TRUST-COOKIE-001",
    surfaceLabel: "Cookie notice",
    route: COOKIE_ROUTE,
    requirements: [
      "The route names the currently verified cookie categories.",
      "Essential/auth/session/local storage is described without implying non-essential tracking.",
      "Any future non-essential category names its purpose, source, retention posture, and user control before it is treated as live.",
    ],
  },
  {
    id: "TRUST-CLAIM-001",
    surfaceLabel: "All trust surfaces",
    route: `${L}/trust`,
    requirements: [
      "No certification, SLA, compliance posture, or vendor fact is claimed without a real source of truth.",
      "Unsupported claims are withheld instead of implied.",
    ],
  },
] satisfies readonly TrustActivationRule[]

export const trustSurfaceDefinition: TrustSurfaceDefinition = {
  eyebrow: "Canonical public assurance surface",
  title: "Trust",
  summary:
    "Afenda exposes public trust as bound operational truth: named routes, named owner paths, explicit evidence, and explicit boundaries.",
  description:
    "This surface shows what is publicly live, what is proven, what claims remain intentionally absent, and which activation rules govern future trust pages.",
  doctrine:
    "Afenda does not present trust as claims. It exposes trust as verifiable, time-bound operational truth.",
  statusNote:
    "Only routes with real public backing are active. Claims without backing stay absent, and activation rules remain visible so future trust surfaces ship deliberately.",
  lastUpdatedLabel: trustSurfaceLastUpdatedLabel,
  currentPosture: trustPostureSignals,
  evidence: trustEvidenceItems,
  surfaces: trustSurfaceItems,
  commitments: trustCommitments,
  boundaries: trustBoundaryStatements,
  activationRules: trustActivationRules,
}

/**
 * Status is always public. When an OpenStatus authority is available, this resolver
 * enriches the trust surface with the authority URL and live-source wording.
 */
export function trustSurfaceDefinitionResolved(
  statusSnapshot?: OpenStatusPublicSnapshot | null
): TrustSurfaceDefinition {
  const authority = statusSnapshot?.publicStatusUrl?.trim()
  const configured = Boolean(statusSnapshot?.configured)
  const available = Boolean(statusSnapshot?.available)

  const operationsPosture =
    authority && available
      ? {
          state: "live" as const,
          summary: `Operational availability and incidents are published through OpenStatus (${authority}). Afenda does not maintain a parallel uptime narrative; the branded ${STATUS_ROUTE} route summarizes the same authority.`,
          proofSource: `Public OpenStatus monitors and status page; Afenda consumes the feed for ${STATUS_ROUTE}.`,
          href: authority,
        }
      : configured
        ? {
            state: "live" as const,
            summary: `Operational availability is declared publicly on ${STATUS_ROUTE}. OpenStatus is configured as the authority, and the route currently discloses that the feed is unavailable so operators can remediate it.`,
            proofSource: `The public ${STATUS_ROUTE} route is live and exposes the current OpenStatus source-health gap instead of hiding it.`,
            href: STATUS_ROUTE,
          }
        : {
            state: "live" as const,
            summary: `Operational availability is declared publicly on ${STATUS_ROUTE}. The route currently shows that the OpenStatus authority is not configured yet, which remains an operational gap to close before availability reporting is mature.`,
            proofSource: `The public ${STATUS_ROUTE} route is live and names the missing OpenStatus configuration explicitly.`,
            href: STATUS_ROUTE,
          }

  const statusSurface =
    authority && available
      ? {
          state: "live" as const,
          isPublicLink: true,
          summary: `Branded ${STATUS_ROUTE} reflects the OpenStatus JSON feed. The authority page carries full component history and incidents.`,
          proofSource: `OpenStatus authority + Afenda wrapper (${STATUS_ROUTE}).`,
          authorityUrl: authority,
        }
      : configured
        ? {
            state: "live" as const,
            isPublicLink: true,
            summary: `Public ${STATUS_ROUTE} remains live while the OpenStatus feed is temporarily unavailable. The route discloses the gap and keeps the authority model explicit.`,
            proofSource: `The live ${STATUS_ROUTE} route reports that the configured OpenStatus source is currently unavailable.`,
            authorityUrl: authority,
          }
        : {
            state: "live" as const,
            isPublicLink: true,
            summary: `Public ${STATUS_ROUTE} is live and currently reports that OpenStatus has not been configured yet.`,
            proofSource: `The live ${STATUS_ROUTE} route names the missing OpenStatus authority configuration.`,
            authorityUrl: undefined,
          }

  return {
    ...trustSurfaceDefinition,
    statusNote:
      authority && available
        ? `OpenStatus is the public availability authority; Afenda ${STATUS_ROUTE} reflects its JSON feed. Claims without backing stay absent.`
        : configured
          ? `Afenda ${STATUS_ROUTE} remains public while the configured OpenStatus source is unhealthy. Source-health gaps are disclosed here until remediation lands.`
          : `Afenda ${STATUS_ROUTE} remains public even before OpenStatus is configured. The missing authority setup is disclosed here until the availability source is wired.`,
    currentPosture: trustSurfaceDefinition.currentPosture.map((p) =>
      p.id === "operations-posture"
        ? {
            ...p,
            ...operationsPosture,
          }
        : p
    ),
    evidence:
      authority && available
        ? [
            ...trustSurfaceDefinition.evidence,
            {
              id: "evidence-openstatus-authority",
              title: "Availability authority is named",
              statement: `Incidents, components, and maintenance are communicated through OpenStatus. Afenda's ${STATUS_ROUTE} route is an evidence-oriented wrapper, not a replacement authority.`,
              href: STATUS_ROUTE,
              proofSource: `Afenda ${STATUS_ROUTE} plus OpenStatus (${authority}).`,
              lastUpdatedLabel: trustSurfaceLastUpdatedLabel,
            },
          ]
        : trustSurfaceDefinition.evidence,
    surfaces: trustSurfaceDefinition.surfaces.map((s) =>
      s.id === "surface-status"
        ? {
            ...s,
            ...statusSurface,
          }
        : s
    ),
    boundaries: trustSurfaceDefinition.boundaries.map((b) =>
      b.id === "boundary-sla"
        ? {
            ...b,
            detail:
              "Afenda does not publish contractual uptime SLAs or availability percentages. Signals and incidents use the public OpenStatus authority without implying an SLA.",
          }
        : b
    ),
  }
}

/** Static trust shell for Suspense fallback — no `new Date()` (Cache Components prerender). */
export function trustSurfaceDefinitionBaseline(): TrustSurfaceDefinition {
  return trustSurfaceDefinitionResolved(null)
}

export function buildStatusPageMetadata(locale: string): Metadata {
  const canonicalPath = `/${locale}${STATUS_ROUTE}`
  const base = getSiteUrl().replace(/\/$/, "")
  const canonicalUrl = `${base}${canonicalPath}`
  const description =
    "Afenda public availability evidence surface, reflecting OpenStatus when available and disclosing source-health gaps when the authority is unavailable or not yet configured."

  return {
    title: `Status | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `Status | ${SITE_NAME}`,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: [{ url: `${base}${DEFAULT_OG_IMAGE}` }],
    },
  }
}

export function buildTrustPageMetadata(locale: string): Metadata {
  const canonicalPath = `/${locale}${L}/trust`
  const base = getSiteUrl().replace(/\/$/, "")
  const canonicalUrl = `${base}${canonicalPath}`
  const description =
    "Canonical public assurance surface for Afenda, covering current posture, evidence, commitments, boundaries, and trust-route activation doctrine."

  return {
    title: "Trust",
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: "Trust",
      description,
      type: "website",
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: [{ url: `${base}${DEFAULT_OG_IMAGE}` }],
    },
  }
}
