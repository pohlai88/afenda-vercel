import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import type { HrmDocumentSummary } from "../../../types"
import { isHrmDocumentType } from "../../documents-management/data/hrm-document-display.shared"
import { buildEmployeeDocumentVaultListSurfaceConfiguration } from "../data/employee-document-vault-list-surface.server"

type EmployeeDocumentVaultListSectionProps = {
  documents: readonly HrmDocumentSummary[]
  canDownload: boolean
  openLabel: string
}

export async function EmployeeDocumentVaultListSection({
  documents,
  canDownload,
  openLabel,
}: EmployeeDocumentVaultListSectionProps) {
  const [t, tDocuments, tDocumentTypes, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.workforce"),
    getTranslations("Dashboard.Hrm.documents"),
    getTranslations("Dashboard.Hrm.workforce.documentTypes"),
    getFormatter(),
  ])

  const listConfiguration = buildEmployeeDocumentVaultListSurfaceConfiguration(
    documents,
    {
      empty: t("documentVaultEmpty"),
      colTitle: tDocuments("colTitle"),
      colType: tDocuments("colType"),
      colUploaded: tDocuments("colUploadedAt"),
      typeLabelFor: (documentType) =>
        isHrmDocumentType(documentType)
          ? tDocumentTypes(documentType)
          : documentType,
      formatUploadedAt: (value) =>
        format.dateTime(value, { dateStyle: "medium", timeStyle: "short" }),
    },
    { canDownload }
  )

  const documentById = new Map(documents.map((doc) => [doc.id, doc]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:employee:document-vault"
      trailingColumn={{
        header: " ",
        render: (surfaceRow) => {
          const trailingAction = surfaceRow.trailingAction
          const doc = documentById.get(surfaceRow.id)
          if (!doc || !isListSurfaceTrailingActionRenderable(trailingAction)) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <a
                href={doc.blobUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-sm text-primary underline-offset-4 hover:underline"
              >
                {openLabel}
              </a>
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
