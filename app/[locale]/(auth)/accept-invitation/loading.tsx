import { AuthRouteLoading } from "#components/auth/auth-route-loading"

export default function AcceptInvitationLoading() {
  return (
    <AuthRouteLoading
      shell="segment"
      copy={{ namespace: "Common", key: "loadingInvitation" }}
    />
  )
}
