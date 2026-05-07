import { getTranslations } from "next-intl/server"

import { SegmentRouteSpinner } from "#components/segment-route-spinner"

import { AuthFrameLoadingCard } from "./auth-frame-loading-card"
import { AuthPageFrame } from "./auth-page-frame"

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
        key: "loading" | "loadingSignIn" | "loadingOnboarding"
      }
    }
  | {
      shell: "segment"
      copy: { namespace: "Common"; key: "loadingInvitation" }
    }

/**
 * Shared `loading.tsx` UI for auth and onboarding routes: one place for
 * `getTranslations` + frame/spinner wiring (keeps segment loaders consistent).
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
          <p className="text-sm text-muted-foreground">{t("note")}</p>
        </AuthFrameLoadingCard>
      </AuthPageFrame>
    )
  }

  const t = await getTranslations("Common")
  let label: string
  switch (config.copy.key) {
    case "loading":
      label = t("loading")
      break
    case "loadingSignIn":
      label = t("loadingSignIn")
      break
    default:
      label = t("loadingOnboarding")
  }

  return (
    <AuthPageFrame>
      <AuthFrameLoadingCard minHeightClass={config.minHeightClass}>
        <p className="text-sm text-muted-foreground">{label}</p>
      </AuthFrameLoadingCard>
    </AuthPageFrame>
  )
}
