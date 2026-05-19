import { existsSync } from "node:fs"
import { resolve } from "node:path"

import {
  declarationDocuments,
  declarationRouteHrefs,
  isHttpSourceRef,
  publicTrustOwnerRoutes,
  securityDisclosureLink,
  securityTxtExpiresAt,
  securityTxtHref,
  validateDeclarationRegistry,
  validateOfficialSourceRefs,
  type DeclarationValidationIssue,
} from "#features/legal-docs"
import { GET as securityTxtGET } from "../app/.well-known/security.txt/route"
import { DEFAULT_APP_LOCALE, toLocalePath } from "../lib/i18n/locales.shared"
import { getSiteUrl } from "../lib/site"

function printIssues(
  heading: string,
  issues: readonly DeclarationValidationIssue[]
): void {
  if (issues.length === 0) return
  console.error(`\n[legal-declarations] ${heading}`)
  for (const issue of issues) {
    console.error(`- [${issue.kind}] ${issue.scope}: ${issue.message}`)
  }
}

function validateSourceRefTargets(): DeclarationValidationIssue[] {
  const issues: DeclarationValidationIssue[] = []
  const knownRouteRefs = new Set<string>([
    ...declarationRouteHrefs,
    "/.well-known/security.txt",
  ])

  for (const [slug, document] of Object.entries(declarationDocuments)) {
    for (const ref of document.sourceRefs) {
      if (isHttpSourceRef(ref)) continue
      if (ref.startsWith("/")) {
        if (!knownRouteRefs.has(ref)) {
          issues.push({
            kind: "error",
            scope: slug,
            message: `route source ref is not recognized: ${ref}`,
          })
        }
        continue
      }

      if (!existsSync(resolve(process.cwd(), ref))) {
        issues.push({
          kind: "error",
          scope: slug,
          message: `local source ref does not exist: ${ref}`,
        })
      }
    }
  }

  return issues
}

async function validateSecurityTxt(): Promise<DeclarationValidationIssue[]> {
  const response = await securityTxtGET()
  const body = await response.text()
  const base = getSiteUrl().replace(/\/$/, "")
  const policyPath = toLocalePath(
    DEFAULT_APP_LOCALE,
    securityDisclosureLink.href
  )
  const issues: DeclarationValidationIssue[] = []

  const requiredSnippets = [
    `Contact: mailto:${publicTrustOwnerRoutes.security.value}`,
    `Expires: ${securityTxtExpiresAt}`,
    `Canonical: ${base}${securityTxtHref}`,
    `Policy: ${base}${policyPath}`,
  ]

  for (const snippet of requiredSnippets) {
    if (!body.includes(snippet)) {
      issues.push({
        kind: "error",
        scope: "security.txt",
        message: `missing snippet: ${snippet}`,
      })
    }
  }

  return issues
}

async function main(): Promise<void> {
  const localIssues = validateDeclarationRegistry()
  const sourceTargetIssues = validateSourceRefTargets()
  const securityTxtIssues = await validateSecurityTxt()
  const remoteIssues = await validateOfficialSourceRefs()
  const issues = [
    ...localIssues,
    ...sourceTargetIssues,
    ...securityTxtIssues,
    ...remoteIssues,
  ]

  printIssues("validation failures", issues)

  if (issues.some((issue) => issue.kind === "error")) {
    process.exitCode = 1
    return
  }

  console.log("[legal-declarations] validation passed")
}

void main()
