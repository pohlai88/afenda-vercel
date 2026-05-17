import { AuthRouteLoading } from "#components2/auth/auth-route-loading"

export default function ForgotPasswordLoading() {
  return (
    <AuthRouteLoading
      shell="authFrame"
      copy={{ namespace: "Common", key: "loading" }}
    />
  )
}
