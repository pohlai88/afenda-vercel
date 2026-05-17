import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { signaturePartyMatchesPortalSession } from "../data/signature-portal-access.shared"
import {
  getSignatureDeclarationText,
  getSignaturePartyByToken,
  getSignatureSourceDocumentPreview,
  recordSignatureConsentPresented,
  recordSignaturePartyView,
} from "#features/tools/server"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"
import { SignatureCeremonyClient } from "./signature-ceremony-client"

type EmployeePortalSignatureCeremonyPageProps = {
  portalSlug: string
  partyToken: string
}

export async function EmployeePortalSignatureCeremonyPage({
  portalSlug,
  partyToken,
}: EmployeePortalSignatureCeremonyPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)

  const row = await getSignaturePartyByToken(partyToken)
  if (
    !row ||
    row.request.organizationId !== context.portal.organizationId ||
    !signaturePartyMatchesPortalSession(row.party, context)
  ) {
    notFound()
  }

  const [declarationText, sourceDocument, t, navLabels] = await Promise.all([
    getSignatureDeclarationText(context.portal.organizationId, row.request.id),
    getSignatureSourceDocumentPreview({
      organizationId: context.portal.organizationId,
      documentId: row.request.documentId,
    }),
    getTranslations("Dashboard.Hrm.portalSignatures"),
    getEmployeePortalSectionNavLabels(),
  ])

  const pinnedDeclaration = declarationText ?? t("defaultDeclaration")

  await recordSignaturePartyView({
    organizationId: context.portal.organizationId,
    partyId: row.party.id,
    actor: {
      actorType: "signer",
      actorUserId: context.portal.userId,
      actorEmail: row.party.signerEmail,
      actorName: row.party.signerName,
    },
  })

  await recordSignatureConsentPresented({
    organizationId: context.portal.organizationId,
    partyId: row.party.id,
    actor: {
      actorType: "signer",
      actorUserId: context.portal.userId,
      actorEmail: row.party.signerEmail,
      actorName: row.party.signerName,
    },
  })

  const documentPreviewUrl =
    sourceDocument?.mimeType === "application/pdf"
      ? sourceDocument.blobUrl
      : null

  return (
    <div className="flex flex-col gap-6 p-6">
      <EmployeePortalSectionNav
        portalSlug={portalSlug}
        current="signatures"
        labels={navLabels}
      />

      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("ceremonyTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("ceremonyDescription")}
        </p>
      </header>

      <SignatureCeremonyClient
        portalSlug={portalSlug}
        partyToken={partyToken}
        declarationText={pinnedDeclaration}
        documentPreviewUrl={documentPreviewUrl}
        documentTitle={sourceDocument?.title ?? null}
      />
    </div>
  )
}
