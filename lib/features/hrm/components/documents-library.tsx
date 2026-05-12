import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import {
  formatHrmDocumentSize,
  hrmDocumentClassificationTone,
  hrmDocumentTypeTone,
  isHrmDocumentClassification,
  isHrmDocumentType,
  shortenPayloadHash,
} from "../data/hrm-document-display.shared"
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

type DocumentsLibraryProps = {
  documentType: string | null
  classification: string | null
  employeeId: string | null
  isAdmin: boolean
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
  documentType,
  classification,
  employeeId,
  isAdmin,
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
    logUnexpectedServerError(
      "documents-library: query failed",
      err,
      { organizationId: orgSession.organizationId }
    )
    return (
      <p
        className="text-sm text-destructive"
        role="status"
        aria-live="polite"
      >
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
            <TableHead className="text-right">{t("colSize")}</TableHead>
            <TableHead>{t("colUploadedAt")}</TableHead>
            <TableHead>{t("colHash")}</TableHead>
            {isAdmin ? (
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
              ? t(`documentTypes.${row.documentType}`)
              : row.documentType
            const classificationLabel = isHrmDocumentClassification(
              row.classification
            )
              ? t(`documentClassifications.${row.classification}`)
              : row.classification

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
                {isAdmin ? (
                  <TableCell className="text-right">
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      aria-label={t("downloadAria", { title: row.title })}
                    >
                      <a
                        href={row.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("download")}
                      </a>
                    </Button>
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
