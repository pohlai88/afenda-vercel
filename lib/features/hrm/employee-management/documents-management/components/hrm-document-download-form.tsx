"use client"

import { useFormStatus } from "react-dom"

import { Button } from "#components2/ui/button"

import { downloadDocumentAction } from "../actions/hrm-document.actions"

function DownloadButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" variant="ghost" disabled={pending}>
      {label}
    </Button>
  )
}

type HrmDocumentDownloadFormProps = {
  orgSlug: string
  documentId: string
  label: string
}

/**
 * Wraps the document blob URL download in a Server Action form so that every
 * download is captured in `iam_audit_event` before the redirect fires.
 * HRM-DOC-018/023.
 */
export function HrmDocumentDownloadForm({
  orgSlug,
  documentId,
  label,
}: HrmDocumentDownloadFormProps) {
  return (
    <form action={downloadDocumentAction}>
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="documentId" value={documentId} />
      <DownloadButton label={label} />
    </form>
  )
}
