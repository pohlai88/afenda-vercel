import { DEFAULT_APP_LOCALE } from "../../../lib/i18n/locales.shared"

import {
  buildLegalDeclarationMetadata,
  declarationDocuments,
  declarationRouteHrefs,
  formatDeclarationReviewedLabel,
  collectDeclarationCopy,
  declarationPlaceholderPatterns,
  declarationStalePhrases,
  isHttpSourceRef,
} from "./index"
import type { DeclarationDocumentDefinition } from "./types"

export type DeclarationValidationIssue = {
  readonly kind: "error" | "warning"
  readonly scope: string
  readonly message: string
}

const REQUIRED_COOKIE_FACTS = [
  "__Secure-neon-auth.session_token",
  "NEXT_LOCALE",
  "sidebar_state",
  "sidebar_width",
  "inspector_state",
  "inspector_width",
  "afenda:lynx-summon-fab-pos",
] as const

const REQUIRED_SUBPROCESSOR_FACTS = [
  "Vercel, Inc.",
  "Neon, LLC / Databricks",
  "OpenAI, LLC",
  "Upstash, Inc.",
  "Plus Five Five, Inc. / Resend",
  "Functional Software, Inc. d/b/a Sentry",
  "Hugging Face",
  "Supabase",
  "Railway",
  "Retool",
  "Cursor",
  "Codex",
  "Cline",
  "pgVector and PostgreSQL",
] as const

export function validateDeclarationRegistry(): DeclarationValidationIssue[] {
  const issues: DeclarationValidationIssue[] = []
  const validRouteHrefs = new Set<string>(declarationRouteHrefs)

  for (const [slug, document] of Object.entries(
    declarationDocuments as Record<string, DeclarationDocumentDefinition>
  )) {
    const routeHref = document.routeHref ?? `/legal/${document.slug}`
    const allCopy = [
      document.title,
      document.description,
      document.summary,
      collectDeclarationCopy(document.sections),
    ].join(" ")

    if (!validRouteHrefs.has(routeHref)) {
      issues.push({
        kind: "error",
        scope: slug,
        message: `route href ${routeHref} is missing from declarationRouteHrefs`,
      })
    }

    if (
      document.lastUpdatedLabel !==
      formatDeclarationReviewedLabel(document.reviewedAt)
    ) {
      issues.push({
        kind: "error",
        scope: slug,
        message: "lastUpdatedLabel does not match reviewedAt",
      })
    }

    if (document.sourceRefs.length === 0) {
      issues.push({
        kind: "error",
        scope: slug,
        message: "sourceRefs must not be empty",
      })
    }

    for (const pattern of declarationPlaceholderPatterns) {
      if (pattern.test(allCopy)) {
        issues.push({
          kind: "error",
          scope: slug,
          message: `placeholder pattern detected: ${pattern}`,
        })
      }
    }

    for (const phrase of declarationStalePhrases) {
      if (allCopy.includes(phrase)) {
        issues.push({
          kind: "error",
          scope: slug,
          message: `stale phrase detected: ${phrase}`,
        })
      }
    }

    const meta = buildLegalDeclarationMetadata(DEFAULT_APP_LOCALE, document)
    if (meta.alternates?.canonical == null) {
      issues.push({
        kind: "error",
        scope: slug,
        message: "metadata canonical URL is missing",
      })
    }
  }

  const cookieCopy = collectDeclarationCopy(
    declarationDocuments.cookies.sections
  )
  for (const fact of REQUIRED_COOKIE_FACTS) {
    if (!cookieCopy.includes(fact)) {
      issues.push({
        kind: "error",
        scope: "cookies",
        message: `missing cookie/storage fact: ${fact}`,
      })
    }
  }

  const supportIndexCopy =
    declarationDocuments.support.sections
      .find((section) => section.id === "declaration-index")
      ?.body.join(" ") ?? ""
  for (const route of [
    "/subprocessors",
    "/data-processing-addendum",
    "/cookies",
  ]) {
    if (!supportIndexCopy.includes(route)) {
      issues.push({
        kind: "error",
        scope: "support",
        message: `support declaration index must mention ${route}`,
      })
    }
  }

  const subprocessorCopy = collectDeclarationCopy(
    declarationDocuments.subprocessors.sections
  )
  for (const fact of REQUIRED_SUBPROCESSOR_FACTS) {
    if (!subprocessorCopy.includes(fact)) {
      issues.push({
        kind: "error",
        scope: "subprocessors",
        message: `missing subprocessor fact: ${fact}`,
      })
    }
  }
  return issues
}

export async function validateOfficialSourceRefs(
  fetchImpl: typeof fetch = fetch
): Promise<DeclarationValidationIssue[]> {
  const issues: DeclarationValidationIssue[] = []
  const sourceRefs = new Set(
    Object.values(declarationDocuments).flatMap((document) =>
      document.sourceRefs.filter(isHttpSourceRef)
    )
  )

  const isAcceptableStatus = (status: number) =>
    (status >= 200 && status < 400) ||
    status === 401 ||
    status === 403 ||
    status === 405

  for (const ref of sourceRefs) {
    try {
      const response = await fetchImpl(ref, {
        method: "HEAD",
        redirect: "follow",
      })
      if (!isAcceptableStatus(response.status)) {
        issues.push({
          kind: "error",
          scope: ref,
          message: `official source returned HTTP ${response.status}`,
        })
      }
    } catch {
      try {
        const response = await fetchImpl(ref, {
          method: "GET",
          redirect: "follow",
        })
        if (!isAcceptableStatus(response.status)) {
          issues.push({
            kind: "error",
            scope: ref,
            message: `official source returned HTTP ${response.status}`,
          })
        }
      } catch (error) {
        issues.push({
          kind: "error",
          scope: ref,
          message:
            error instanceof Error
              ? error.message
              : "official source could not be reached",
        })
      }
    }
  }

  return issues
}
