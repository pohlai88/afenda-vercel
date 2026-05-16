import { getTranslations } from "next-intl/server"
import { and, eq } from "drizzle-orm"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { db } from "#lib/db"
import { hrmEmployee, hrmSignatureRequest } from "#lib/db/schema"

import { SignatureRequestWorkbenchForm } from "./signature-request-workbench-form"

type SignatureRequestPanelProps = {
  orgSlug: string
  organizationId: string
  kind: "contract" | "boarding_task"
  subjectId: string
  documentId: string | null
  signerEmployeeId: string
}

export async function SignatureRequestPanel({
  orgSlug,
  organizationId,
  kind,
  subjectId,
  documentId,
  signerEmployeeId,
}: SignatureRequestPanelProps) {
  if (!documentId) {
    return null
  }

  const [t, employee, openRequest] = await Promise.all([
    getTranslations("Dashboard.Hrm.signatures"),
    db
      .select({
        email: hrmEmployee.email,
        legalName: hrmEmployee.legalName,
      })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, organizationId),
          eq(hrmEmployee.id, signerEmployeeId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: hrmSignatureRequest.id,
        derivedStatus: hrmSignatureRequest.derivedStatus,
      })
      .from(hrmSignatureRequest)
      .where(
        and(
          eq(hrmSignatureRequest.organizationId, organizationId),
          eq(hrmSignatureRequest.kind, kind),
          eq(hrmSignatureRequest.subjectId, subjectId)
        )
      )
      .limit(1),
  ])

  const existing = openRequest[0]
  const signerEmail = employee?.email ?? ""
  const signerName = employee?.legalName ?? ""
  if (!signerEmail) {
    return null
  }

  if (
    existing &&
    existing.derivedStatus !== "draft" &&
    existing.derivedStatus !== "sent" &&
    existing.derivedStatus !== "partially_signed"
  ) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("panelTitle")}</CardTitle>
        <CardDescription>{t("panelDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignatureRequestWorkbenchForm
          orgSlug={orgSlug}
          kind={kind}
          subjectId={subjectId}
          documentId={documentId}
          requestId={existing?.id}
          derivedStatus={existing?.derivedStatus}
          signerEmployeeId={signerEmployeeId}
          signerEmail={signerEmail}
          signerName={signerName}
        />
      </CardContent>
    </Card>
  )
}
