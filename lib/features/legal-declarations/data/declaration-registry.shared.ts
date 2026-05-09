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
  cookieNoticeLink,
  dataProcessingAddendumLink,
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
  "/cookies",
  "/data-processing-addendum",
  "/subprocessors",
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
  cookies: {
    slug: "cookies",
    routeHref: "/cookies",
    title: "Cookie Notice",
    description:
      "Afenda describes the essential cookies, local storage, and session technologies used on current public and product surfaces, including authentication, security, route continuity, interface preferences, and future notice requirements before any non-essential tracking category is introduced.",
    eyebrow: "Essential cookie posture",
    summary:
      "Afenda currently uses cookies, local storage, and similar session technologies for essential authentication, security, route continuity, interface preferences, and abuse-prevention purposes. This notice names that limited posture without inventing non-essential tracking categories that are not confirmed on the live surface.",
    sections: [
      {
        id: "scope",
        title: "Current cookie scope",
        body: [
          "This notice applies to cookies and similar browser storage used on Afenda-operated public routes, declaration routes, authentication routes, and product surfaces that refer to this notice.",
          "Current live use is limited to essential, authentication, session, security, route-continuity, and abuse-prevention purposes. Afenda does not currently claim analytics, advertising, retargeting, or behavioural profiling cookie categories on the live public surface.",
        ],
      },
      {
        id: "essential-cookies",
        title: "Essential and session cookies",
        body: [
          "Essential cookies and session technologies help keep signed-in users authenticated, preserve route continuity, support security checks, and reduce abuse. These controls are required for the service boundary to work safely.",
          "Because these technologies are necessary for authentication, security, and service delivery, disabling them in the browser may prevent sign-in, account access, or secure route handling from working correctly.",
        ],
        bullets: [
          "Authentication and session continuity for signed-in users.",
          "Security controls that support integrity, abuse prevention, and account protection.",
          "Operational route continuity so locale-aware and product routes behave consistently.",
        ],
      },
      {
        id: "current-storage",
        title: "Current first-party storage",
        body: [
          "The current first-party storage set is limited to authentication/session handling, locale continuity, and product interface preferences. Preference cookies are short-lived and scoped to the Afenda site.",
          "Known product preference storage includes dashboard sidebar and inspector state, dashboard panel widths, and the Lynx floating control position. These values preserve the user interface the user selected and are not used for advertising, retargeting, or cross-site profiling.",
        ],
        bullets: [
          "__Secure-neon-auth.session_token for authentication and session continuity.",
          "NEXT_LOCALE for locale-aware route continuity.",
          "sidebar_state, sidebar_width, inspector_state, and inspector_width for dashboard layout preferences.",
          "afenda:lynx-summon-fab-pos in localStorage for the Lynx floating control position.",
        ],
      },
      {
        id: "non-essential-categories",
        title: "Non-essential categories",
        body: [
          "Afenda does not currently publish non-essential analytics, advertising, retargeting, or behavioural profiling cookie categories for the live surface.",
          "If Afenda later introduces non-essential cookies or tracking, this notice must be updated before that category is treated as live. The update should name the category, purpose, provider or operating source where relevant, retention posture, and the available user control.",
        ],
      },
      {
        id: "controls",
        title: "User controls",
        body: [
          "Users can control cookies through their browser settings. Blocking or deleting essential cookies may affect authentication, session persistence, security checks, and other necessary site functions.",
          "Afenda does not currently show a non-essential cookie preference center because no non-essential category is confirmed on the live surface. If such a category is introduced, an appropriate control surface should be added with the same release.",
        ],
      },
      {
        id: "changes",
        title: "Changes and owner route",
        body: [
          "Cookie posture should remain tied to operational truth. New cookie categories, tracking purposes, providers, or controls should not be implied by marketing copy before they exist and can be explained.",
          "Questions about this notice should be routed through support@nexuscanon.com with enough context for Afenda to identify whether the request is privacy, security, or operational support.",
        ],
      },
    ],
    relatedLinks: buildRelatedLinks("/cookies"),
    contactChannels: privacyChannels,
    statusNote: declarationStatusNote,
    lastUpdatedLabel: declarationLastUpdatedLabel,
  },
  "data-processing-addendum": {
    slug: "data-processing-addendum",
    routeHref: "/data-processing-addendum",
    title: "Data Processing Addendum",
    description:
      "Afenda publishes a Malaysia PDPA-aligned data processing addendum route for customers who need written processing terms, statutory section mapping, and a clear request path before production processing begins.",
    eyebrow: "Malaysia PDPA processing terms",
    summary:
      "This route states Afenda's public DPA baseline: customer instructions, bounded processing, confidentiality, security, retention, assistance, transfer controls, and request handling anchored to Malaysia's Personal Data Protection Act 2010 and the 2024 Amendment Act.",
    sections: [
      {
        id: "status-and-use",
        title: "Status and use of this addendum",
        body: [
          "This public DPA route is a request and baseline terms surface. It is intended to support customer diligence and contract preparation; it does not by itself replace a signed order form, master services agreement, negotiated DPA, statement of work, or other written customer contract.",
          "A customer that needs this addendum attached to a live implementation should contact support@nexuscanon.com with the customer entity name, service scope, implementation route, intended categories of data, processing locations, and any required procurement or legal reference.",
        ],
        bullets: [
          "Primary intake: support@nexuscanon.com, marked as a data processing addendum request.",
          "Owner route: privacy route, with security coordination where the request concerns controls, incidents, or access governance.",
          "Response model: Afenda reviews the request, confirms scope, and routes any negotiated terms before production processing depends on them.",
        ],
      },
      {
        id: "roles-and-instructions",
        title: "Roles, scope, and customer instructions",
        body: [
          "For customer-controlled workflow data, the customer is expected to determine the business purpose, lawful basis, notices, and instructions for processing. Afenda processes that data only to provide, secure, support, and improve the contracted service boundary, unless a separate written instruction or legal obligation applies.",
          "The PDPA legal map begins with Act 709 section 2, which applies the Act to processing and control of personal data in commercial transactions, and Act 709 section 4, which defines personal data, processing, data processor, data user, third party, and commercial transaction. The 2024 Amendment Act updates the statutory terminology toward data controller and data processor language.",
        ],
        bullets: [
          "Customer: determines the workflow context, notices, permissions, and content placed into Afenda.",
          "Afenda: processes customer data within documented instructions, support needs, security needs, and the agreed service boundary.",
          "No public page should be read as authorising Afenda to use customer workflow data for unrelated advertising, resale, or independent profiling.",
        ],
      },
      {
        id: "pdpa-principles",
        title: "PDPA principles mapped to the service",
        body: [
          "Act 709 section 5 requires processing to comply with the seven Personal Data Protection Principles set out in sections 6, 7, 8, 9, 10, 11, and 12. Afenda maps those principles into contract and operating terms instead of treating them as generic privacy slogans.",
          "The public baseline is: process only on a proper instruction or recognised purpose; provide notice-and-choice support where Afenda controls the route; limit disclosure; apply security controls; retain data only while needed; keep operational data reasonably accurate in context; and support access or correction requests through the appropriate customer or Afenda route.",
        ],
        bullets: [
          "Section 6, General Principle: processing should be tied to consent, contract necessity, legal obligation, vital interests, administration of justice, or statutory function where applicable.",
          "Section 7, Notice and Choice Principle: relevant notices should identify purpose, source, rights, disclosure classes, and whether requested data is obligatory or voluntary where Afenda controls the notice.",
          "Section 8, Disclosure Principle: disclosure should stay within the stated purpose, agreed service providers, legal requirements, or customer instructions.",
          "Section 9, Security Principle: Afenda applies technical, organisational, and access controls appropriate to the service boundary.",
          "Sections 10, 11, and 12: retention, integrity, and access are handled through customer instructions, support routes, audit records, and lawful request handling.",
        ],
      },
      {
        id: "security-and-breach",
        title: "Security, breach, and accountability",
        body: [
          "Afenda treats processor security as a contractual and operational obligation. The 2024 Amendment Act section 4 inserts section 5(1a), requiring a data processor processing on behalf of a data controller to comply with the Security Principle in Act 709 section 9.",
          "The 2024 Amendment Act section 6 introduces accountability provisions including section 12a on data protection officers and section 12b on data breach notification. Afenda uses those provisions as the public drafting baseline for privacy/security escalation, incident triage, and customer notification routing, subject to commencement, implementing directions, and the signed customer agreement.",
        ],
        bullets: [
          "Security measures should cover access control, authentication, logging, least-privilege support, deployment discipline, and incident review.",
          "Afenda will route suspected personal data incidents through privacy and security owners with enough context to assess customer, regulator, and data-subject notification duties.",
          "Where a customer is the data controller for workflow data, Afenda should assist the customer with information reasonably needed for the customer's own assessment and notices.",
        ],
      },
      {
        id: "subprocessors-and-transfers",
        title: "Subprocessors and cross-border transfers",
        body: [
          "Afenda may use infrastructure, hosting, authentication, communications, security, and support providers where needed to deliver the service. Afenda should require those providers to process data under confidentiality, security, and purpose-limited obligations appropriate to their role.",
          "Act 709 section 129 governs transfers of personal data outside Malaysia. The 2024 Amendment Act section 12 amends section 129, including the cross-border transfer test and available transfer grounds. Afenda should document transfer posture, provider purpose, and safeguards where a customer implementation depends on cross-border processing.",
        ],
        bullets: [
          "Subprocessor detail is published at /subprocessors and should be reviewed before production scope depends on a vendor, region, or AI-processing path.",
          "Cross-border processing should travel with appropriate contractual, security, access, and due-diligence controls.",
          "Customer-specific residency, transfer, or vendor-review requirements should be handled before production scope depends on them.",
        ],
      },
      {
        id: "retention-return-deletion",
        title: "Retention, return, and deletion",
        body: [
          "Customer data should be retained only for the operational purpose, legal requirement, security review, support history, auditability need, or customer instruction that justifies keeping it. This implements the retention discipline reflected in Act 709 section 10.",
          "At the end of the relevant service or on valid written instruction, Afenda should return, export, delete, or de-identify customer data as agreed, subject to legal holds, backup limits, security logs, dispute records, and records Afenda must keep for compliance or enforcement defence.",
        ],
      },
      {
        id: "rights-and-assistance",
        title: "Rights requests and customer assistance",
        body: [
          "Where Afenda controls a public route, Afenda receives and handles privacy requests through the privacy route. Where a customer controls the underlying workflow data, Afenda expects the customer to lead data-subject notices and requests, with Afenda providing reasonable assistance within the service boundary.",
          "The legal section map includes Act 709 sections 30 to 38 for access, correction, and withdrawal routes, Act 709 section 43 for direct-marketing objections, and the 2024 Amendment Act section 9 introducing section 43a on data portability, subject to technical feasibility and prescribed timing.",
        ],
      },
      {
        id: "legal-sources",
        title: "Legal source map",
        body: [
          "Primary source: Malaysia Personal Data Protection Commissioner, Personal Data Protection Act 2010 [Act 709], official Act page and Act 709 bilingual PDF.",
          "Amendment source: Malaysia Personal Data Protection Commissioner, Personal Data Protection (Amendment) Act 2024 [Act A1727], official amendment page and Act A1727 PDF.",
          "This page is drafted as public legal operations content, not legal advice. Customers should review the final signed DPA with their own counsel, especially where sector rules, cross-border transfer posture, sensitive personal data, or regulated customer records are involved.",
        ],
        bullets: [
          "Act 709 sections 2 and 4: application, commercial transaction scope, definitions of personal data, processing, processor, user/controller concepts, and third party.",
          "Act 709 sections 5 to 12: Personal Data Protection Principles, including General, Notice and Choice, Disclosure, Security, Retention, Data Integrity, and Access.",
          "Act 709 sections 30 to 40 and 43: access, correction, withdrawal, direct marketing objection, and sensitive personal data handling.",
          "Act 709 section 129 and Act A1727 section 12: cross-border transfer framework and 2024 amendment.",
          "Act A1727 sections 4 to 6 and 9: processor security obligation, section 9 security amendment, DPO/accountability and breach-notification provisions, and data portability.",
          "Official sources: https://www.pdp.gov.my/ppdpv1/en/akta/pdp-act-2010-en/ and https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-amendment-act-2024/.",
        ],
      },
    ],
    relatedLinks: buildRelatedLinks("/data-processing-addendum", [
      trustRouteLink,
      cookieNoticeLink,
    ]),
    contactChannels: privacyChannels,
    statusNote:
      "Public DPA baseline. Customer-specific execution, procurement terms, and implementation scope require written confirmation.",
    lastUpdatedLabel: "Updated May 9, 2026",
  },
  subprocessors: {
    slug: "subprocessors",
    routeHref: "/subprocessors",
    title: "Subprocessors",
    description:
      "Afenda publishes a validated vendor inventory showing production and conditional subprocessors, development tools that are not production subprocessors, software components that are not legal processors, and official source links for vendor review.",
    eyebrow: "Vendor inventory and processing map",
    summary:
      "This page separates production customer-data processors from development tooling and open-source software components. It exists so customers can see which vendors may process personal data, why they are used, and which jurisdiction or processing location should be reviewed before production scope depends on them.",
    sections: [
      {
        id: "validation-method",
        title: "Validation method",
        body: [
          "This inventory was validated against the current repository, environment template, deployed-service configuration, and official vendor legal or trust documents available on May 9, 2026. The duplicate Vercel entry in the working list is treated as one vendor entry.",
          "A vendor is listed as a production or conditional subprocessor only where Afenda appears to use that service for hosting, database/authentication, storage, email, observability, rate limiting, or AI processing that may receive customer or end-user personal data.",
        ],
        bullets: [
          "Jurisdiction means the vendor jurisdiction, stated processing location, or practical hosting/processing region that Afenda should review. It is not a customer-specific data residency promise.",
          "Conditional means the code or environment supports the vendor, but the service only processes personal data when the corresponding feature, key, integration, or deployment path is enabled.",
          "Development tools are kept out of the production subprocessor list unless customer data, production secrets, support exports, or customer records are deliberately sent to them.",
        ],
      },
      {
        id: "production-subprocessors",
        title: "Production and conditional subprocessors",
        body: [
          "The following vendors are validated as current or conditional subprocessors for the Afenda application stack. Customer-specific contracts may narrow, remove, or add vendors for a particular deployment.",
          "Vercel, Inc. Purpose: application hosting, serverless and edge runtime, CDN, deployment logs, cron execution, Vercel Blob uploads, Vercel OTEL, Vercel Sandbox, and Vercel AI Gateway where enabled. Jurisdiction/location: United States vendor with global cloud and edge processing. Official source: https://vercel.com/legal/dpa.",
          "Neon, LLC / Databricks. Purpose: managed PostgreSQL, pooled database connectivity, Neon Auth, auth webhooks, user/session/organization records, and pgvector-backed knowledge data. Jurisdiction/location: Neon Platform Services with a Neon subprocessor list that provides identity, location, and role; the current app configuration points to an AWS ap-southeast-1 Neon region and should be confirmed per production branch. Official sources: https://neon.com/platform-terms and https://neon.com/subprocessors.",
          "OpenAI, LLC. Purpose: embeddings, language generation, Lynx/knowledge retrieval, and model output where OPENAI_API_KEY or Vercel AI Gateway model routing sends prompts, chunks, or operational context to OpenAI models. Jurisdiction/location: OpenAI API processing and subprocessors as published by OpenAI, with model/infrastructure locations varying by service. Official sources: https://openai.com/policies/sub-processor-list/ and https://cdn.openai.com/pdf/openai-data-processing-addendum.pdf.",
          "Upstash, Inc. Purpose: optional Redis-backed rate limiting for organization invitation controls when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are configured. Jurisdiction/location: Upstash may process customer personal data globally as necessary to provide the services and uses transfer safeguards where required. Official source: https://upstash.com/trust/dpa.pdf.",
          "Plus Five Five, Inc. / Resend. Purpose: optional transactional email delivery for authentication and service notices when RESEND_API_KEY is configured. Jurisdiction/location: United States vendor; ex-EEA transfers are addressed in the Resend DPA. Official source: https://resend.com/legal/dpa.",
          "Functional Software, Inc. d/b/a Sentry. Purpose: optional error monitoring, exception capture, tracing, source-map assisted diagnostics, and incident review when Sentry DSNs are configured. Jurisdiction/location: United States vendor; customers should review Sentry DPA/subprocessor materials before enabling capture of customer personal data. Official source: https://sentry.zendesk.com/hc/en-us/articles/23856572755611-How-do-I-sign-your-Data-Processing-Addendum.",
        ],
      },
      {
        id: "provided-list-validation",
        title: "Validation of the requested vendor list",
        body: [
          "Vercel: validated as a current production subprocessor. The duplicate Vercel entry is consolidated into one entry.",
          "Hugging Face: not validated as a current production subprocessor in this repository. It becomes a subprocessor only if Afenda sends customer prompts, models, datasets, files, or inference payloads to Hugging Face. Hugging Face states that Inference Endpoints do not store customer payloads or tokens, stores logs for 30 days, and offers a GDPR DPA through Enterprise Hub. Official sources: https://huggingface.co/privacy and https://huggingface.co/docs/inference-endpoints/guides/security.",
          "Supabase: not validated as a current Afenda production service. The lockfile contains a transitive Supabase package, but current app configuration uses Neon for database/auth. Supabase would become a subprocessor if Afenda adopts Supabase-hosted PostgreSQL, Auth, Storage, Edge Functions, or Realtime. Official source: https://supabase.com/downloads/docs/Supabase%2BDPA%2B260317.pdf.",
          "Railway: not validated as a current Afenda production host. Railway would become a subprocessor if Afenda deploys app services, workers, databases, or customer-supporting infrastructure there. Railway states primary processing operations take place in the United States and offers transfer safeguards in its DPA. Official source: https://railway.com/legal/dpa.",
          "Retool: not validated as a current Afenda production/admin processor. Retool would become a subprocessor if Afenda uses Retool Cloud to inspect, edit, support, or operate customer records. Retool's DPA points customers to a current subprocessor list with identities and country of location. Official source: https://retool.com/dpa.pdf.",
          "Cursor: development tooling, not a production Afenda subprocessor by default. It becomes a processor for customer data only if customer data, production code containing secrets, support exports, or production records are sent through Cursor. Cursor offers a DPA and posts subprocessor changes at trust.cursor.com/subprocessors. Official source: https://cursor.com/terms/dpa.",
          "Codex: development tooling and OpenAI service surface, not a production Afenda subprocessor by default. If customer data or production records are sent to OpenAI/Codex for support or implementation work, classify that processing under the OpenAI entry and customer approval path.",
          "Cline: development tooling, not a production Afenda subprocessor by default. Cline states that when users use their own API keys, user content goes directly to the third-party model provider; if Cline-provided keys are used, Cline collects/transmits user content to model providers. Official source: https://cline.bot/privacy.",
          "pgVector and PostgreSQL: software components, not legal subprocessors. The processor is the hosting/provider entity that runs the database, currently Neon for this application. Official sources: https://www.postgresql.org/about/ and https://github.com/pgvector/pgvector.",
        ],
      },
      {
        id: "ai-processing-boundary",
        title: "AI processing boundary",
        body: [
          "Afenda's AI path should be treated separately from ordinary hosting because prompts, embeddings, retrieval chunks, generated outputs, and operator context can carry personal data or confidential business data.",
          "The current code supports direct OpenAI use for embeddings and model calls, and Vercel AI Gateway for model routing where AI_GATEWAY_API_KEY is configured. Hugging Face, Cursor, Codex, and Cline should not be treated as production customer-data subprocessors unless customer data is intentionally submitted through those services.",
        ],
        bullets: [
          "Do not send customer secrets, production credentials, personal data exports, or regulated records into development AI tools without a recorded approval path.",
          "For customer-facing AI features, record the model provider, gateway, prompt category, retention posture, and whether outputs are stored back into Afenda.",
          "If a new model provider is introduced, update this page, the DPA route, and the trust route before presenting the provider as live.",
        ],
      },
      {
        id: "change-control",
        title: "Change control and customer notice",
        body: [
          "Afenda should review this list before enabling a new vendor, region, AI provider, storage path, monitoring tool, or customer-support platform that may receive customer personal data.",
          "Material subprocessor changes should identify the vendor, purpose, processing location or jurisdiction, affected data categories, official legal source, and whether the change applies to all customers or only selected implementations.",
        ],
      },
    ],
    relatedLinks: buildRelatedLinks("/subprocessors", [
      dataProcessingAddendumLink,
      trustRouteLink,
    ]),
    contactChannels: privacyChannels,
    statusNote:
      "Validated vendor inventory. Customer-specific implementation may narrow or add vendors by written agreement.",
    lastUpdatedLabel: "Updated May 9, 2026",
  },
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
          "Afenda is delivered through NexusCanon and operated by VAP MANAGEMENT SERVICES SDN BHD [Company No. (201901041084) (1350414-A)], incorporated in Malaysia and registered at 22-1, Jalan Bayu Tinggi 2A/KS6 Batu Unjur, 41200 Klang Selangor, Malaysia.",
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
          "Afenda publishes a separate /cookies route for the current essential-only posture. If non-essential tracking is introduced later, Afenda will update that notice to name the categories, purposes, and user controls before treating those categories as live.",
        ],
      },
    ],
    relatedLinks: buildRelatedLinks("/legal/privacy", [cookieNoticeLink]),
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
          "If a future route such as subprocessors or a data processing addendum becomes necessary, Afenda should add it deliberately rather than overloading this page. The cookie notice already exists as its own bounded route.",
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
  const documentPath = document.routeHref ?? `/legal/${document.slug}`
  const canonicalPath = `/${locale}${documentPath}`
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
