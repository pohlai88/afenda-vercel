import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Skeleton } from "#components/ui/skeleton"
import { canActInOrganization } from "#lib/auth/permission.server"
import { requireOrgSession } from "#lib/tenant"

import {
  isHrmDocumentClassification,
  isHrmDocumentType,
} from "../data/hrm-document-display.shared"
import { listEmployeeChoicesForDocumentFilter } from "../data/hrm-document.queries.server"

import { DocumentsLibrary } from "./documents-library"
import { DocumentsLibraryFilters } from "./documents-library-filters"

/**
 * Documents vault — library view of every HR document attached to an
 * organization. Composition responsibility:
 *
 *  - **Authority** is established by the parent layout (`requireOrgSession`
 *    via the workbench shell) and re-validated here for the admin-only
 *    member-restriction copy.
 *  - **Tier A** (admin gate + employee filter choices + translations)
 *    sits in a single blocking `Promise.all` so the page renders the
 *    header + filter chips immediately.
 *  - **Tier B** (the document library table) streams behind a Suspense
 *    boundary so a slow filter scan never blocks first paint.
 *
 * The library is URL-driven (`?documentType=…&classification=…&employeeId=…`)
 * so deep links and refresh produce the same view. Members see a calm
 * read-only "limited view" panel — no upload affordance is rendered
 * because attachments still happen from the employee detail page where
 * the governed Vercel Blob path enforces tenant isolation.
 */
type DocumentsPageProps = {
  orgSlug: string
  documentTypeParam?: string
  classificationParam?: string
  employeeIdParam?: string
}

export async function DocumentsPage({
  orgSlug,
  documentTypeParam,
  classificationParam,
  employeeIdParam,
}: DocumentsPageProps) {
  const orgSession = await requireOrgSession()

  const [t, isAdmin, employees] = await Promise.all([
    getTranslations("Dashboard.Hrm.documents"),
    canActInOrganization(
      orgSession.userId,
      orgSession.user.role,
      orgSession.organizationId,
      "admin"
    ),
    listEmployeeChoicesForDocumentFilter(orgSession.organizationId),
  ])

  // Re-validate URL-supplied filters against the canonical enums + the
  // active employee set so the library query never sees an
  // attacker-controlled discriminator. `requireOrgSession` proves the
  // actor sees this org; the per-row tenant filter at the query layer
  // remains the only source of truth for IDOR — these checks are just
  // defensive UX that turn invalid params into "no filter".
  const documentTypeFilter =
    documentTypeParam && isHrmDocumentType(documentTypeParam)
      ? documentTypeParam
      : null
  const classificationFilter =
    classificationParam && isHrmDocumentClassification(classificationParam)
      ? classificationParam
      : null
  const employeeIdFilter =
    employeeIdParam && employees.some((e) => e.id === employeeIdParam)
      ? employeeIdParam
      : null

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      {!isAdmin ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("memberRestrictedTitle")}</CardTitle>
            <CardDescription>{t("memberRestrictedBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("filterTitle")}</CardTitle>
          <CardDescription>{t("filterDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsLibraryFilters
            orgSlug={orgSlug}
            employees={employees}
            selectedEmployeeId={employeeIdFilter}
            selectedDocumentType={documentTypeFilter}
            selectedClassification={classificationFilter}
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("libraryTitle")}</CardTitle>
          <CardDescription>{t("libraryDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            // Re-key the boundary on the active filter triple so React
            // throws away the previous suspension and shows the
            // skeleton again when the operator changes filters. Without
            // this, a slow filter swap appears frozen — Suspense would
            // hold the stale rows on screen until the new query
            // resolves.
            key={`${documentTypeFilter ?? ""}|${classificationFilter ?? ""}|${employeeIdFilter ?? ""}`}
            fallback={<DocumentsLibrarySkeleton />}
          >
            <DocumentsLibrary
              documentType={documentTypeFilter}
              classification={classificationFilter}
              employeeId={employeeIdFilter}
              isAdmin={isAdmin}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function DocumentsLibrarySkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}
