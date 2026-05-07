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
      <div className="mx-auto max-w-md py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Missing invitation
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open the link from your invitation email, or ask your administrator to
          send a new invite.
        </p>
      </div>
    )
  }

  return <AcceptInvitationClient invitationId={invitationId.trim()} />
}
