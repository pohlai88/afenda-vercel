import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import {
  hrmDocumentTypeLabelKey,
  isHrmDocumentClassification,
  isHrmDocumentType,
  isHrmDocumentVerificationStatus,
} from "../data/hrm-document-display.shared"
import { buildDocumentsListSurfaceConfiguration } from "../data/documents-list-surface.server"
import {
  type OrgHrmDocumentRow,
  listHrmDocumentsForOrg,
} from "../data/hrm-document.queries.server"

import {
  HrmDocumentRejectForm,
  HrmDocumentVerifyForm,
} from "./hrm-document-review-forms"
import { HrmDocumentDownloadForm } from "./hrm-document-download-form"

type DocumentsLibraryProps = {
  orgSlug: string
  documentType: string | null
  classification: string | null
  employeeId: string | null
  canDownload: boolean
  canReview: boolean
}

function documentsListCopy(
  t: Awaited<ReturnType<typeof getTranslations<"Dashboard.Hrm.documents">>>,
  format: Awaited<ReturnType<typeof getFormatter>>,
  hasFilter: boolean
) {
  return {
    empty: hasFilter ? t("filteredEmptyTitle") : t("noDocumentsTitle"),
    colTitle: t("colTitle"),
    colType: t("colType"),
    colEmployee: t("colEmployee"),
    colClassification: t("colClassification"),
    colVerification: t("colVerification"),
    colSize: t("colSize"),
    colUploadedAt: t("colUploadedAt"),
    colHash: t("colHash"),
    noEmployeeBadge: t("noEmployeeBadge"),
    typeLabelFor: (documentTypeValue: string) =>
      isHrmDocumentType(documentTypeValue)
        ? t(hrmDocumentTypeLabelKey(documentTypeValue))
        : documentTypeValue,
    classificationLabelFor: (classificationValue: string) =>
      isHrmDocumentClassification(classificationValue)
        ? t(`documentClassifications.${classificationValue}`)
        : classificationValue,
    verificationLabelFor: (status: string) =>
      isHrmDocumentVerificationStatus(status)
        ? t(`verificationStatuses.${status}`)
        : status,
    formatUploadedAt: (date: Date) =>
      format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
  }
}

export async function DocumentsLibrary({
  orgSlug,
  documentType,
  classification,
  employeeId,
  canDownload,
  canReview,
}: DocumentsLibraryProps) {
  const orgSession = await requireOrgSession()
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.documents"),
    getFormatter(),
  ])

  const hasFilter =
    documentType !== null || classification !== null || employeeId !== null
  const copy = documentsListCopy(t, format, hasFilter)
  const trailingContext = {
    showActionsColumn: canDownload || canReview,
    canDownload,
    canReview,
  }

  let rows: OrgHrmDocumentRow[]
  try {
    rows = await listHrmDocumentsForOrg(orgSession.organizationId, {
      documentType: documentType ?? undefined,
      classification: classification ?? undefined,
      employeeId: employeeId ?? undefined,
    })
  } catch (err) {
    logUnexpectedServerError("documents-library: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={buildDocumentsListSurfaceConfiguration(
          [],
          copy,
          trailingContext
        )}
        surfaceKey="hrm:documents:library:error"
        loadError={{
          variant: "error",
          title: t("libraryLoadFailed"),
        }}
      />
    )
  }

  const listConfiguration = buildDocumentsListSurfaceConfiguration(
    rows,
    copy,
    trailingContext
  )

  const documentById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:documents:library"
      contentBeforeList={
        rows.length > 0 ? (
          <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
            {hasFilter
              ? t("filteredCount", { count: rows.length })
              : t("totalCount", { count: rows.length })}
          </p>
        ) : null
      }
      trailingColumn={
        trailingContext.showActionsColumn
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const trailingAction = surfaceRow.trailingAction
                const row = documentById.get(surfaceRow.id)
                if (
                  !row ||
                  !isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return null
                }
                const showReview =
                  canReview && row.verificationStatus === "pending"
                return (
                  <GovernedTrailingActionSlot trailingAction={trailingAction}>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {showReview ? (
                        <>
                          <HrmDocumentVerifyForm
                            orgSlug={orgSlug}
                            documentId={row.id}
                          />
                          <HrmDocumentRejectForm
                            orgSlug={orgSlug}
                            documentId={row.id}
                          />
                        </>
                      ) : null}
                      {canDownload ? (
                        <HrmDocumentDownloadForm
                          orgSlug={orgSlug}
                          documentId={row.id}
                          label={t("download")}
                        />
                      ) : null}
                    </div>
                  </GovernedTrailingActionSlot>
                )
              },
            }
          : undefined
      }
    />
  )
}
