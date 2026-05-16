"use client"

import { useActionState, useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Textarea } from "#components/ui/textarea"

import {
  createSignatureRequestAction,
  sendSignatureRequestAction,
} from "../actions/signature-request.actions"

type PartyDraft = {
  signerOrder: number
  signerEmployeeId: string
  signerEmail: string
  signerName: string
  role: "signer"
}

type SignatureRequestWorkbenchFormProps = {
  orgSlug: string
  kind: "contract" | "boarding_task"
  subjectId: string
  documentId: string
  requestId?: string
  derivedStatus?: string
  signerEmployeeId: string
  signerEmail: string
  signerName: string
}

function buildInitialParties(
  signerEmployeeId: string,
  signerEmail: string,
  signerName: string
): PartyDraft[] {
  return [
    {
      signerOrder: 1,
      signerEmployeeId,
      signerEmail,
      signerName,
      role: "signer",
    },
  ]
}

export function SignatureRequestWorkbenchForm({
  orgSlug,
  kind,
  subjectId,
  documentId,
  requestId,
  derivedStatus,
  signerEmployeeId,
  signerEmail,
  signerName,
}: SignatureRequestWorkbenchFormProps) {
  const t = useTranslations("Dashboard.Hrm.signatures")
  const [parties, setParties] = useState<PartyDraft[]>(() =>
    buildInitialParties(signerEmployeeId, signerEmail, signerName)
  )

  const partiesJson = useMemo(
    () =>
      JSON.stringify(
        parties.map((party, index) => ({
          signerOrder: index + 1,
          signerEmployeeId: party.signerEmployeeId || null,
          signerEmail: party.signerEmail,
          signerName: party.signerName,
          role: party.role,
        }))
      ),
    [parties]
  )

  const [createState, createAction, createPending] = useActionState(
    createSignatureRequestAction,
    undefined
  )
  const [sendState, sendAction, sendPending] = useActionState(
    sendSignatureRequestAction,
    undefined
  )

  const activeRequestId =
    createState && createState.ok && createState.requestId
      ? createState.requestId
      : requestId

  const status =
    createState && createState.ok ? "draft" : (derivedStatus ?? "none")

  function updateParty(index: number, patch: Partial<PartyDraft>) {
    setParties((current) =>
      current.map((party, i) => (i === index ? { ...party, ...patch } : party))
    )
  }

  function addParty() {
    setParties((current) => [
      ...current,
      {
        signerOrder: current.length + 1,
        signerEmployeeId: "",
        signerEmail: "",
        signerName: "",
        role: "signer",
      },
    ])
  }

  function removeParty(index: number) {
    if (index === 0) return
    setParties((current) => current.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-4">
      {!activeRequestId ? (
        <form action={createAction} className="flex flex-col gap-3">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="signingOrder" value="parallel" />
          <input type="hidden" name="partiesJson" value={partiesJson} />
          <Textarea
            name="declarationText"
            rows={4}
            required
            defaultValue={t("defaultDeclaration")}
          />

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">{t("partiesTitle")}</p>
            {parties.map((party, index) => (
              <div
                key={`party-${index}`}
                className="flex flex-col gap-2 rounded-md border border-border/70 p-3"
              >
                <p className="text-xs text-muted-foreground">
                  {t("partyOrder", { order: index + 1 })}
                </p>
                <Input
                  value={party.signerName}
                  onChange={(event) =>
                    updateParty(index, { signerName: event.target.value })
                  }
                  placeholder={t("signerNamePlaceholder")}
                  aria-label={t("signerNamePlaceholder")}
                />
                <Input
                  type="email"
                  value={party.signerEmail}
                  onChange={(event) =>
                    updateParty(index, { signerEmail: event.target.value })
                  }
                  placeholder={t("signerEmailLabel")}
                  aria-label={t("signerEmailLabel")}
                  required={index === 0}
                />
                {index > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeParty(index)}
                  >
                    {t("removeParty")}
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addParty}
            >
              {t("addParty")}
            </Button>
          </div>

          {createState && !createState.ok ? (
            <p className="text-sm text-destructive">
              {createState.errors.form}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={createPending}>
            {t("createAction")}
          </Button>
        </form>
      ) : null}

      {activeRequestId && status === "draft" ? (
        <form action={sendAction} className="flex flex-col gap-3">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="requestId" value={activeRequestId} />
          {sendState && !sendState.ok ? (
            <p className="text-sm text-destructive">{sendState.errors.form}</p>
          ) : null}
          <Button type="submit" size="sm" disabled={sendPending}>
            {t("sendAction")}
          </Button>
        </form>
      ) : null}

      {activeRequestId && status !== "draft" && status !== "none" ? (
        <p className="text-sm text-muted-foreground">
          {t("statusMessage", { status })}
        </p>
      ) : null}
    </div>
  )
}
