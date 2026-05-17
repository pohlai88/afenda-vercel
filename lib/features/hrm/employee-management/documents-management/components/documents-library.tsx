import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import {
  formatHrmDocumentSize,
  hrmDocumentClassificationTone,
  hrmDocumentTypeTone,
  hrmDocumentVerificationTone,
  isHrmDocumentClassification,
  hrmDocumentTypeLabelKey,
  isHrmDocumentType,
  isHrmDocumentVerificationStatus,
  shortenPayloadHash,
} from "../data/hrm-document-display.shared"
import {
  HrmDocumentRejectForm,
  HrmDocumentVerifyForm,
} from "./hrm-document-review-forms"
import { HrmDocumentDownloadForm } from "./hrm-document-download-form"
import {
  type OrgHrmDocumentRow,
  listHrmDocumentsForOrg,
} from "../data/hrm-document.queries.server"

const TYPE_TONE_BADGE: Record<
  string,
  "default" | "outline" | "secondary" | "destructive" | "success" | "info"
> = {
  positive: "success",
  info: "info",
  muted: "outline",
  neutral: "outline",
}

const CLASSIFICATION_TONE_BADGE: Record<
  string,
  "default" | "outline" | "secondary" | "destructive" | "success" | "info"
> = {
  muted: "outline",
  neutral: "secondary",
  info: "info",
  destructive: "destructive",
}

const VERIFICATION_TONE_BADGE: Record<
  string,
  "default" | "outline" | "secondary" | "destructive" | "success" | "info"
> = {
  positive: "success",
  info: "info",
  muted: "outline",
  neutral: "secondary",
  destructive: "destructive",
}

type DocumentsLibraryProps = {
  orgSlug: string
  documentType: string | null
  classification: string | null
  employeeId: string | null
  canDownload: boolean
  canReview: boolean
}

/**
 * Library view of HR documents for the active organization. Streamed
 * behind a Suspense boundary on the documents vault page so a slow
 * filter scan does not block the header / filter chips.
 *
 * Failures degrade locally to a calm inline notice; we never throw
 * out of this section so the rest of the documents surface keeps
 * rendering. Mirrors the attendance-recent-events failure-isolation
 * contract.
 */
export async function DocumentsLibrary({
  orgSlug,
  documentType,
  classification,
  employeeId,
  canDownload,
  canReview,
}: DocumentsLibraryProps) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.documents")

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
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("libraryLoadFailed")}
      </p>
    )
  }

  const hasFilter =
    documentType !== null || classification !== null || employeeId !== null

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-1 py-6 text-center">
        <p className="text-sm font-medium">
          {hasFilter ? t("filteredEmptyTitle") : t("noDocumentsTitle")}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasFilter ? t("filteredEmptyBody") : t("noDocumentsBody")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {hasFilter
          ? t("filteredCount", { count: rows.length })
          : t("totalCount", { count: rows.length })}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colTitle")}</TableHead>
            <TableHead>{t("colType")}</TableHead>
            <TableHead>{t("colEmployee")}</TableHead>
            <TableHead>{t("colClassification")}</TableHead>
            <TableHead>{t("colVerification")}</TableHead>
            <TableHead className="text-right">{t("colSize")}</TableHead>
            <TableHead>{t("colUploadedAt")}</TableHead>
            <TableHead>{t("colHash")}</TableHead>
            {canDownload || canReview ? (
              <TableHead className="text-right">{t("colActions")}</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const typeTone = hrmDocumentTypeTone(row.documentType)
            const typeVariant = TYPE_TONE_BADGE[typeTone] ?? "outline"
            const classificationTone = hrmDocumentClassificationTone(
              row.classification
            )
            const classificationVariant =
              CLASSIFICATION_TONE_BADGE[classificationTone] ?? "secondary"
            const typeLabel = isHrmDocumentType(row.documentType)
              ? t(hrmDocumentTypeLabelKey(row.documentType))
              : row.documentType
            const classificationLabel = isHrmDocumentClassification(
              row.classification
            )
              ? t(`documentClassifications.${row.classification}`)
              : row.classification
            const verificationTone = hrmDocumentVerificationTone(
              row.verificationStatus
            )
            const verificationVariant =
              VERIFICATION_TONE_BADGE[verificationTone] ?? "outline"
            const verificationLabel = isHrmDocumentVerificationStatus(
              row.verificationStatus
            )
              ? t(`verificationStatuses.${row.verificationStatus}`)
              : row.verificationStatus
            const showReview =
              canReview && row.verificationStatus === "pending"

            return (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{row.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.mimeType}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={typeVariant}>{typeLabel}</Badge>
                </TableCell>
                <TableCell>
                  {row.employeeId ? (
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {row.employeeFullName ?? row.employeeId}
                      </span>
                      {row.employeeNumber ? (
                        <span className="text-xs text-muted-foreground">
                          {row.employeeNumber}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <Badge variant="outline">{t("noEmployeeBadge")}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={classificationVariant}>
                    {classificationLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={verificationVariant}>
                    {verificationLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {formatHrmDocumentSize(row.sizeBytes)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {row.uploadedAt.toLocaleString()}
                </TableCell>
                <TableCell
                  className="font-mono text-xs text-muted-foreground"
                  title={row.payloadHash}
                >
                  {shortenPayloadHash(row.payloadHash)}
                </TableCell>
                {canDownload || canReview ? (
                  <TableCell className="text-right">
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
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
