import { AuthRouteLoading } from "#components/auth/auth-route-loading"

export default function SignUpLoading() {
  return (
    <AuthRouteLoading
      shell="authFrame"
      minHeightClass="min-h-[320px]"
      copy={{ namespace: "Common", key: "loadingSignUp" }}
    />
  )
}
