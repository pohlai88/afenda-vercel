import type { Route } from "next"

import { AuthPageFrame } from "#components/auth/auth-page-frame"
import { AuthResult } from "#components/auth/auth-result"

import { AcceptInvitationClient } from "./accept-invitation-client"

type Search = Promise<{ invitationId?: string | string[] }>

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Search
}) {
  const sp = await searchParams
  const raw = sp.invitationId
  const invitationId = Array.isArray(raw) ? raw[0] : raw
  if (!invitationId?.trim()) {
    return (
      <AuthPageFrame>
        <AuthResult
          variant="warning"
          title="Missing invitation"
          description="Open the link from your invitation email, or ask your administrator to send a new invite."
          primaryAction={{
            label: "Back to sign in",
            href: "/sign-in" as Route,
          }}
        />
      </AuthPageFrame>
    )
  }

  return <AcceptInvitationClient invitationId={invitationId.trim()} />
}
