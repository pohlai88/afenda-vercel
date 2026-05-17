import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedSurface } from "#features/governed-surface"
import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import { buildGovernedToolsWorkbenchHeader } from "../../_module-governance/tools-governed-page-header.server"
import { toolsSignaturesPath } from "../../constants"
import {
  getSignatureRequestByPublicSlug,
  listSignatureEventsForRequest,
  listSignaturePartiesForRequest,
} from "../data/signature-request.queries.server"
import { SignatureEvidenceExportButton } from "./signature-evidence-export-button.client"
import { SignatureRequestCancelForm } from "./signature-request-cancel-form"

type SignatureRequestDetailPageProps = {
  orgSlug: string
  publicSlug: string
}

export async function SignatureRequestDetailPage({
  orgSlug,
  publicSlug,
}: SignatureRequestDetailPageProps) {
  const session = await requireOrgSession()
  const request = await getSignatureRequestByPublicSlug(
    session.organizationId,
    publicSlug
  )
  if (!request) {
    notFound()
  }

  const tPromise = getTranslations("Dashboard.Hrm.signatures")
  const [t, format, parties, events] = await Promise.all([
    tPromise,
    getFormatter(),
    listSignaturePartiesForRequest(session.organizationId, request.id),
    listSignatureEventsForRequest(session.organizationId, request.id),
  ])
  const header = await buildGovernedToolsWorkbenchHeader(
    orgSlug,
    "Dashboard.Hrm.signatures",
    {
      eyebrow: "eyebrow",
      title: "detailTitle",
      description: "detailDescription",
      descriptionLiteral: t("detailDescription", { kind: request.kind }),
    },
    {
      href: toolsSignaturesPath(orgSlug),
      labelKey: "backToSignatures",
    }
  )

  return (
    <GovernedSurface header={header} className="flex flex-col gap-6 p-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("statusTitle")}</CardTitle>
          <CardDescription>{request.publicSlug}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Badge variant="outline">{request.derivedStatus}</Badge>
          {request.derivedStatus === "signed" ? (
            <SignatureEvidenceExportButton
              orgSlug={orgSlug}
              requestId={request.id}
            />
          ) : null}
          {request.derivedStatus !== "voided" &&
          request.derivedStatus !== "signed" ? (
            <SignatureRequestCancelForm
              orgSlug={orgSlug}
              requestId={request.id}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("partiesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {parties.map((party) => (
            <div
              key={party.id}
              className="rounded-lg border border-border p-3 text-sm"
            >
              <p className="font-medium">{party.signerName}</p>
              <p className="text-muted-foreground">{party.signerEmail}</p>
              <p className="text-xs text-muted-foreground">
                {t("partyStatus", {
                  read: party.readStatus,
                  send: party.sendStatus,
                  sign: party.signingStatus,
                })}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("timelineTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0"
            >
              <span>{event.type}</span>
              <span className="text-xs text-muted-foreground">
                {format.dateTime(event.occurredAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </GovernedSurface>
  )
}
