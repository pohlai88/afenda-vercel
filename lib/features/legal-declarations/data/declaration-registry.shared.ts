/**
 * Static declaration registry for public `/legal/*` routes (ported from afenda-next marketing).
 */
import type { Metadata } from "next"

import { DEFAULT_OG_IMAGE, SITE_NAME, getSiteUrl } from "#lib/site"

import type {
  DeclarationContactChannel,
  DeclarationDocumentDefinition,
  DeclarationRelatedLink,
  LegalDeclarationSlug,
} from "../types"

import {
  declarationFooterLinks,
  declarationFooterIdentity,
  securityDisclosureLink,
  trustRouteLink,
} from "./footer.shared"

/** Canonical contact routes (same mailbox intake as legacy NexusCanon marketing). */
const ownerRoutes = {
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

export const declarationDocumentSlugs = [
  "privacy",
  "terms",
  "security",
  "security/disclosure",
  "support",
] as const

export type DeclarationDocumentSlug = (typeof declarationDocumentSlugs)[number]
export type DeclarationSlug = DeclarationDocumentSlug

export const declarationRouteSlugs = declarationDocumentSlugs

export type DeclarationRouteSlug = (typeof declarationRouteSlugs)[number]

export const declarationRouteHrefs = [
  "/legal/privacy",
  "/legal/terms",
  "/legal/security",
  "/legal/security/disclosure",
  "/legal/support",
] as const

export { declarationFooterIdentity, declarationFooterLinks }

const declarationLastUpdatedLabel = "Updated May 6, 2026"
const declarationStatusNote =
  "Public declaration content reflects the current website and NexusCanon operating routes. Customer contracts or implementation-specific terms may add narrower obligations where a live deployment requires them."

const privacyChannels = [
  ownerRoutes.privacy,
  {
    label: "Operational support",
    value: ownerRoutes.support.value,
    href: ownerRoutes.support.href,
    detail:
      "Use when a privacy question is attached to an active customer implementation or support case.",
  },
] satisfies readonly DeclarationContactChannel[]

const securityChannels = [
  ownerRoutes.security,
  {
    label: "Operational support",
    value: ownerRoutes.support.value,
    href: ownerRoutes.support.href,
    detail:
      "Use when a security question is tied to a live service issue or enterprise rollout.",
  },
] satisfies readonly DeclarationContactChannel[]

const supportChannels = [
  ownerRoutes.support,
  {
    label: "Privacy route",
    value: ownerRoutes.privacy.value,
    href: ownerRoutes.privacy.href,
    detail:
      "Use when a support issue includes personal data, notices, or regional privacy rights.",
  },
  {
    label: "Security route",
    value: ownerRoutes.security.value,
    href: ownerRoutes.security.href,
    detail:
      "Use for vulnerability reports, security incidents, or technical trust review requests.",
  },
] satisfies readonly DeclarationContactChannel[]

function buildRelatedLinks(
  currentHref: string,
  extraLinks: readonly DeclarationRelatedLink[] = []
): readonly DeclarationRelatedLink[] {
  const seen = new Set<string>()

  return [...declarationFooterLinks, ...extraLinks].filter((link) => {
    if (link.href === currentHref || seen.has(link.href)) {
      return false
    }

    seen.add(link.href)
    return true
  })
}

export const declarationDocuments = {
  privacy: {
    slug: "privacy",
    title: "Privacy Notice",
    description:
      "Afenda describes what personal data may be collected on its public and product surfaces, why that data is processed, how long it is retained, and which contact routes apply to a Malaysia-established operator serving Southeast Asia.",
    eyebrow: "Malaysia-established privacy baseline",
    summary:
      "Afenda turns operational work into traceable records. This notice explains how personal data connected to those records, declarations, and public routes is handled under a Malaysia-first PDPA baseline with SEA-facing trust routing.",
    sections: [
      {
        id: "identity",
        title: "Company identity and scope",
        body: [
          "Afenda is delivered through NexusCanon and operated by VAP MANAGEMENT SERVICES SDN BHD [Company No. (201901041084) (1350414-A)], incorporated in Malaysia and registered at 22-1, JALAN BAYU TINGGI 2A/KS6 BATU UNJUR, 41200 KLANG SELANGOR, MALAYSIA.",
          "This notice applies to the public website, public declaration routes, business enquiry channels, and product interactions that refer to this notice. It is intended to provide the notice-and-choice baseline expected of a Malaysia-established operator while remaining legible to customers and evaluators across Southeast Asia.",
          "Where a customer uses Afenda inside its own workflows, the customer remains responsible for determining what business or personal data enters that workflow, which notices it gives to its own users, and which instructions govern the implementation.",
        ],
      },
      {
        id: "collection",
        title: "Data we may collect",
        body: [
          "Afenda may collect business contact details, company details, support correspondence, implementation notes, device and browser data, and service telemetry required to operate, secure, and support the service.",
          "Collection should stay proportionate to a legitimate public, commercial, security, support, or implementation purpose. Afenda does not treat personal data gathered through these routes as decorative marketing exhaust.",
        ],
        bullets: [
          "Business identity data such as names, role titles, company names, work emails, and work phone numbers.",
          "Operational data such as request details, support context, implementation notes, audit timestamps, system-origin metadata, and records attached to a support or trust exchange.",
          "Technical data such as IP address, browser type, device characteristics, log events, authentication records, and session integrity signals needed to keep the public and product surfaces available and safe.",
        ],
      },
      {
        id: "purposes",
        title: "Why Afenda processes data",
        body: [
          "Afenda processes data to respond to enquiries, deliver product access, secure the service, diagnose faults, maintain traceability, and support customers operating governed ERP workflows.",
          "Where Afenda operates the public site or its own service boundary, Afenda determines the operational purpose for that processing. Where a customer supplies workflow data in a live implementation, the customer remains responsible for the business context and Afenda handles that data within the agreed service boundary.",
        ],
        bullets: [
          "Responding to sales, support, privacy, or trust enquiries.",
          "Provisioning, operating, and securing product access.",
          "Maintaining auditability, service integrity, and incident review.",
          "Meeting contractual, regulatory, and legal obligations.",
        ],
      },
      {
        id: "disclosure",
        title: "Disclosures and service providers",
        body: [
          "Afenda may disclose data to carefully selected infrastructure, hosting, authentication, communications, and support providers where that is required to operate the service or respond to a legitimate request.",
          "Afenda expects those providers to act under appropriate confidentiality, security, and processing controls. Customers may request additional contractual or vendor-routing detail through the support and trust routes listed on this page.",
        ],
      },
      {
        id: "retention",
        title: "Retention and cross-border transfers",
        body: [
          "Afenda keeps data only for as long as it is needed for the operational purpose, legal obligation, security review, support history, or traceability requirement that justified collection.",
          "Because Afenda serves Southeast Asia and uses modern infrastructure providers, some data may be stored or accessed outside Malaysia. Where that occurs, Afenda expects equivalent contractual, security, and access-governance controls to travel with the data.",
        ],
      },
      {
        id: "rights",
        title: "Rights and contact routes",
        body: [
          "Individuals and organisations may contact Afenda to ask about applicable access, correction, withdrawal, objection, deletion, or direct-marketing opt-out routes, subject to the relevant legal and contractual limits and to the customer relationship involved.",
          "Afenda uses role-based contact routes so requests can be triaged into the right operational queue without losing context. Privacy, security, and operational support requests currently route through support@nexuscanon.com, while service notices use no-reply@nexuscanon.com.",
        ],
      },
      {
        id: "cookies",
        title: "Cookies and session technologies",
        body: [
          "Current public surfaces use essential cookies and session technologies required for authentication, security, and route continuity. These controls help preserve signed-in state, session integrity, and abuse prevention on Afenda-operated pages.",
          "Afenda does not currently publish a separate /cookies route because non-essential cookies or tracking categories have not been confirmed on the live surface. If non-essential tracking is introduced later, Afenda will publish a dedicated cookie notice that names the categories, purposes, and user controls before treating that route as a live trust surface.",
        ],
      },
    ],
    relatedLinks: buildRelatedLinks("/legal/privacy"),
    contactChannels: privacyChannels,
    statusNote: declarationStatusNote,
    lastUpdatedLabel: declarationLastUpdatedLabel,
  },
  terms: {
    slug: "terms",
    title: "Terms of Use",
    description:
      "These terms describe the public service boundary for Afenda, including acceptable use, customer responsibilities, intellectual property posture, confidentiality expectations, and governing law contact routes.",
    eyebrow: "Public commercial boundary",
    summary:
      "Afenda is built for serious operations. These terms explain the public rules for using the site, the declarations, and any evaluation or implementation path linked from them.",
    sections: [
      {
        id: "acceptance",
        title: "Acceptance and route scope",
        body: [
          "By using the public website, declaration pages, or public contact routes, you agree to use those surfaces lawfully and in line with these terms.",
          "These terms govern the public route boundary only. Customer contracts, order forms, implementation statements, and negotiated data-processing terms may apply separately when Afenda enters an active commercial relationship.",
        ],
      },
      {
        id: "service-scope",
        title: "Service scope and availability",
        body: [
          "Afenda may describe product capabilities, workflow models, or implementation approaches on public pages. Those descriptions are informational until a written commercial commitment is made.",
          "Afenda may update, suspend, or refine public content, evaluation posture, and declaration wording to keep the public surface accurate, safe, and aligned with the underlying product. Public declarations should not be read as a promise that every future trust route, cookie surface, or data-processing artifact is already live.",
        ],
      },
      {
        id: "customer-responsibilities",
        title: "Customer responsibilities",
        body: [
          "Customers and evaluators remain responsible for the legality, quality, and accuracy of any data, workflow description, attachment, or record they provide to Afenda during an enquiry, implementation discussion, or support exchange.",
          "Afenda should not be used to submit malicious payloads, unauthorised third-party data, or information that the sender has no right to disclose.",
        ],
        bullets: [
          "Keep credentials, shared documents, and implementation materials appropriately controlled.",
          "Provide accurate legal, operational, and configuration details during onboarding or support.",
          "Use public contact routes only for legitimate business, privacy, or security communication.",
        ],
      },
      {
        id: "ip-confidentiality",
        title: "Intellectual property and confidentiality",
        body: [
          "Afenda, its public declarations, product descriptions, software, and supporting materials remain the intellectual property of Afenda or its licensors unless a separate written agreement states otherwise.",
          "Where confidential information is exchanged during evaluation or implementation, the parties should rely on the governing contract or non-disclosure agreement rather than assuming the public route itself creates a bespoke confidentiality regime.",
        ],
      },
      {
        id: "disclaimers",
        title: "Disclaimers and liability boundary",
        body: [
          "Public site content is provided for informational use. Afenda aims for accuracy but does not represent that public declarations, screenshots, or implementation descriptions are exhaustive for every customer or jurisdiction.",
          "Nothing on the public site should be treated as legal, accounting, or regulatory advice. Operational and legal reliance should rest on the product contract and the customer's own professional review.",
        ],
      },
      {
        id: "governing-law",
        title: "Governing law and contact",
        body: [
          "Unless a separate written contract says otherwise, these public terms are intended to be interpreted in line with the laws applicable to a Malaysia-established business operating the site.",
          "Commercial, contractual, or route-boundary questions should be sent through support@nexuscanon.com first so Afenda can direct them to the correct internal owner.",
        ],
      },
    ],
    relatedLinks: buildRelatedLinks("/legal/terms"),
    contactChannels: [supportChannels[0]!, privacyChannels[0]!],
    statusNote: declarationStatusNote,
    lastUpdatedLabel: declarationLastUpdatedLabel,
  },
  security: {
    slug: "security",
    title: "Security",
    description:
      "Afenda outlines its security posture for public and customer-facing workflows, including infrastructure boundaries, access controls, incident intake, and trust review routes for enterprise buyers.",
    eyebrow: "Trust and operational safety",
    summary:
      "Afenda treats security as an operational discipline, not decorative marketing language. This page explains the public trust posture and how security questions are routed.",
    sections: [
      {
        id: "posture",
        title: "Security posture overview",
        body: [
          "Afenda is designed around bounded server-first routes, controlled client islands, typed interfaces, and audit-friendly workflow records. Security should preserve operational truth, not sit beside it as a separate story.",
          "Public representations of security are intentionally conservative. Afenda prefers clear route ownership, explicit contact paths, and traceable decisions over vague assurance language.",
        ],
      },
      {
        id: "boundary",
        title: "Infrastructure and service boundary",
        body: [
          "Afenda may rely on modern cloud hosting, managed infrastructure, authentication, and communications providers to operate the service. Those providers are part of the operating boundary and are expected to meet appropriate security and confidentiality standards.",
          "The exact production stack, geographic footprint, and processing path may vary by implementation. Enterprise buyers who need more detail should use the trust route on this page. Afenda does not publish unsupported certification, uptime, or vendor claims as filler for missing evidence.",
        ],
      },
      {
        id: "access",
        title: "Access control and operational traceability",
        body: [
          "Afenda prefers role-scoped access, explicit route ownership, and traceable operational changes. Access should be granted for a job to be completed safely, then reviewed as product and customer responsibilities evolve.",
          "Operational logs, audit context, and security-relevant records should remain attributable so incident review and customer trust work can reconstruct what happened without guesswork.",
        ],
        bullets: [
          "Narrow client boundaries and server-owned privileged logic.",
          "Traceable ownership for workflow mutations, approvals, and support actions.",
          "Controlled support and escalation routes for privacy and security-sensitive issues.",
        ],
      },
      {
        id: "reporting",
        title: "Incident and vulnerability reporting",
        body: [
          "Security questions, suspected vulnerabilities, or trust review requests should be sent through support@nexuscanon.com with a clear security or trust-review subject line. Include enough context for Afenda to reproduce the issue, understand severity, and assign the correct owner.",
          "Afenda publishes a separate disclosure route at /legal/security/disclosure so scope, safe harbor, and expected report format are explicit instead of implied.",
        ],
      },
      {
        id: "trust-contact",
        title: "Trust review and follow-up",
        body: [
          "Afenda can route security questionnaires, enterprise trust reviews, and implementation-bound security requests through the same declaration family instead of forcing buyers into a generic marketing contact path.",
          "Trust follow-up should stay specific: which route, which workflow, which environment, and which evidence is needed for review.",
        ],
      },
    ],
    relatedLinks: buildRelatedLinks("/legal/security", [
      securityDisclosureLink,
    ]),
    contactChannels: securityChannels,
    statusNote: declarationStatusNote,
    lastUpdatedLabel: declarationLastUpdatedLabel,
  },
  "security/disclosure": {
    slug: "security/disclosure",
    title: "Security Disclosure",
    description:
      "Afenda provides a formal vulnerability disclosure route covering in-scope systems, out-of-scope testing boundaries, report format expectations, response posture, safe harbor language, and public security contact details.",
    eyebrow: "Formal vulnerability intake",
    summary:
      "This route exists so reporters have one bounded path for security-sensitive findings. It sets the scope, the reporting standard, and the public operating posture for follow-up.",
    sections: [
      {
        id: "scope",
        title: "In-scope systems",
        body: [
          "Reports may cover the public website, public declaration routes, public trust routes, and product surfaces operated directly by Afenda where the reporter can demonstrate a reproducible security issue.",
          "The report should identify the route, environment, timestamp, affected account or workflow context, and the exact steps needed to reproduce the issue.",
        ],
        bullets: [
          "Public App Router pages and route handlers operated by Afenda.",
          "Authentication, session, and access-control issues that affect Afenda-owned surfaces.",
          "Directly observable data-exposure, privilege, or workflow-integrity issues in Afenda-operated environments.",
        ],
      },
      {
        id: "out-of-scope",
        title: "Out-of-scope testing",
        body: [
          "Afenda does not authorise destructive testing, denial-of-service activity, social engineering, physical intrusion, or broad automated scanning that degrades service or risks customer data.",
          "Third-party infrastructure or customer-owned environments are out of scope unless Afenda explicitly asks for review in writing.",
        ],
        bullets: [
          "Spam, phishing, credential stuffing, or brute-force activity.",
          "Performance flooding, rate-abuse, or attempts to disrupt availability.",
          "Testing against customer systems, vendors, or personal endpoints not owned by Afenda.",
        ],
      },
      {
        id: "report-format",
        title: "Expected report format",
        body: [
          "A useful report tells Afenda what happened, where it happened, how it can be reproduced, and why the reporter believes the issue matters.",
          "If supporting evidence exists, include logs, screenshots, sample requests, response traces, or proof-of-concept detail that allows the issue to be validated without guesswork.",
        ],
        bullets: [
          "Affected route, workflow, and environment.",
          "Reproduction steps and expected versus actual behaviour.",
          "Potential impact, severity reasoning, and any customer-data considerations.",
          "Reporter contact details and any coordination constraints.",
        ],
      },
      {
        id: "response",
        title: "Response posture",
        body: [
          "This route does not publish a public SLA. Afenda will review legitimate reports through the security queue and continue the conversation in the channel best suited to the operational risk.",
          "Where a report affects customer data, active operations, or service integrity, Afenda expects the report to contain enough context for immediate triage and owner assignment.",
        ],
      },
      {
        id: "safe-harbor",
        title: "Safe harbor",
        body: [
          "Afenda asks reporters to act in good faith, avoid privacy violations, avoid service disruption, and stop testing once an issue is demonstrated. Reports that respect these boundaries are treated as responsible disclosure attempts.",
          "This statement is not blanket authorisation for unrestricted testing. It describes the public posture Afenda takes toward legitimate, bounded reporting through this route.",
        ],
      },
      {
        id: "contact",
        title: "Reporting contact",
        body: [
          "Send reports to support@nexuscanon.com and identify the request as a security disclosure so it can be routed into the correct queue from first contact.",
          "If the issue also involves personal data, say so explicitly so the privacy and security routes can coordinate without losing traceability.",
        ],
      },
    ],
    relatedLinks: buildRelatedLinks("/legal/security/disclosure"),
    contactChannels: securityChannels,
    statusNote: declarationStatusNote,
    lastUpdatedLabel: declarationLastUpdatedLabel,
  },
  support: {
    slug: "support",
    title: "Support",
    description:
      "Afenda provides a public support and contact route for business, privacy, and security follow-up without introducing a form workflow. This page explains the channels, escalation paths, and declaration index.",
    eyebrow: "Operational contact surface",
    summary:
      "The support route is informational in this version. It tells customers and evaluators where to send the issue so context, trust, and traceability are preserved from the start.",
    sections: [
      {
        id: "channels",
        title: "Business support channels",
        body: [
          "Use support@nexuscanon.com for public product questions, implementation routing, declaration follow-up, and operational issues that do not belong in the privacy or security queues.",
          "Afenda keeps the public support surface simple on purpose. There is no client-side form flow here because the primary need is a clear route, not a decorative contact experience.",
        ],
      },
      {
        id: "escalation",
        title: "Privacy and security escalation",
        body: [
          "Use support@nexuscanon.com and state whether the issue is privacy, security, or operational support. Afenda keeps those as distinct public routes even where the initial intake mailbox is the same.",
          "Afenda expects senders to choose the closest route available. If the first route is wrong, the message should still carry enough context to be reassigned without losing the thread.",
        ],
      },
      {
        id: "response-model",
        title: "Response model",
        body: [
          "This page does not promise a specific service-level agreement. Public responses depend on the nature of the request, the operational risk, and whether an existing customer relationship or incident is involved.",
          "Afenda should acknowledge legitimate business, privacy, and security enquiries through the appropriate queue and continue the conversation in the channel best suited to the issue.",
        ],
      },
      {
        id: "declaration-index",
        title: "Declaration index",
        body: [
          "The public declaration set is intentionally small and explicit. Privacy, terms, security, trust, and support are kept as separate static routes so enterprise buyers and regional stakeholders can find the right statement quickly.",
          "If a future route such as cookies, subprocessors, or a data processing addendum becomes necessary, Afenda should add it deliberately rather than overloading this page.",
        ],
      },
      {
        id: "no-form",
        title: "No interactive form in v1",
        body: [
          "This support surface is server-first and static. It does not create a public API, schema, or client-side submission workflow.",
          "If Afenda later introduces a contact form or ticketing workflow, that change should be treated as a separate product slice with security, privacy, and abuse controls designed into the route.",
        ],
      },
    ],
    relatedLinks: buildRelatedLinks("/legal/support", [trustRouteLink]),
    contactChannels: supportChannels,
    statusNote: declarationStatusNote,
    lastUpdatedLabel: declarationLastUpdatedLabel,
  },
} satisfies Record<LegalDeclarationSlug, DeclarationDocumentDefinition>

export function buildLegalDeclarationMetadata(
  locale: string,
  document: DeclarationDocumentDefinition
): Metadata {
  const canonicalPath = `/${locale}/legal/${document.slug}`
  const base = getSiteUrl().replace(/\/$/, "")
  const canonicalUrl = `${base}${canonicalPath}`

  return {
    title: document.title,
    description: document.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: document.title,
      description: document.description,
      type: "article",
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: [{ url: `${base}${DEFAULT_OG_IMAGE}` }],
    },
  }
}
