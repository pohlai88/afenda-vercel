import { AuthRouteLoading } from "#components2/auth/auth-route-loading"

export default function VerifyEmailLoading() {
  return (
    <AuthRouteLoading
      shell="authFrame"
      minHeightClass="min-h-[220px]"
      copy={{ namespace: "Common", key: "loading" }}
    />
  )
}
