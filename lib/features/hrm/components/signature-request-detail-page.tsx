import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import { Badge } from "#components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { requireOrgSession } from "#lib/tenant"

import {
  getSignatureRequestByPublicSlug,
  listSignatureEventsForRequest,
  listSignaturePartiesForRequest,
} from "../data/signature-request.queries.server"
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

  const [t, format, parties, events] = await Promise.all([
    getTranslations("Dashboard.Hrm.signatures"),
    getFormatter(),
    listSignaturePartiesForRequest(session.organizationId, request.id),
    listSignatureEventsForRequest(session.organizationId, request.id),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("detailTitle")}
        description={t("detailDescription", { kind: request.kind })}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("statusTitle")}</CardTitle>
          <CardDescription>{request.publicSlug}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Badge variant="outline">{request.derivedStatus}</Badge>
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
    </div>
  )
}
