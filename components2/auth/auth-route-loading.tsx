import { getTranslations } from "next-intl/server"

import { SegmentRouteSpinner } from "#components2/route-loading/segment-route-spinner"

import { AuthFrameLoadingCard } from "./auth-frame-loading-card"
import { AuthPageFrame } from "./auth-page-frame"

type AuthFrameCommonLoadingKey =
  | "loading"
  | "loadingSignIn"
  | "loadingSignUp"
  | "loadingResetPassword"
  | "loadingInvitation"
  | "loadingConsole"

export type AuthRouteLoadingConfig =
  | {
      shell: "authFrame"
      minHeightClass?: string
      copy: { namespace: "CheckEmail"; key: "note" }
    }
  | {
      shell: "authFrame"
      minHeightClass?: string
      copy: {
        namespace: "Common"
        key: AuthFrameCommonLoadingKey
      }
    }
  | {
      shell: "segment"
      copy: { namespace: "Common"; key: "loadingInvitation" }
    }

/**
 * Shared loading UI for auth and IAM/bootstrap-adjacent routes.
 * Keeps translation lookup, frame selection, and spinner/card wiring consistent.
 */
export async function AuthRouteLoading(config: AuthRouteLoadingConfig) {
  if (config.shell === "segment") {
    const t = await getTranslations("Common")

    return (
      <SegmentRouteSpinner>
        <p className="text-sm text-muted-foreground">{t(config.copy.key)}</p>
      </SegmentRouteSpinner>
    )
  }

  if (config.copy.namespace === "CheckEmail") {
    const t = await getTranslations("CheckEmail")

    return (
      <AuthPageFrame>
        <AuthFrameLoadingCard minHeightClass={config.minHeightClass}>
          <p className="text-sm text-muted-foreground">{t(config.copy.key)}</p>
        </AuthFrameLoadingCard>
      </AuthPageFrame>
    )
  }

  const t = await getTranslations("Common")

  return (
    <AuthPageFrame>
      <AuthFrameLoadingCard minHeightClass={config.minHeightClass}>
        <p className="text-sm text-muted-foreground">{t(config.copy.key)}</p>
      </AuthFrameLoadingCard>
    </AuthPageFrame>
  )
}
