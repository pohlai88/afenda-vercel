"use client"

import {
  useCallback,
  useMemo,
  useTransition,
  type ReactElement,
  type ReactNode,
} from "react"
import Image from "next/image"
import type { Route } from "next"
import { useTranslations } from "next-intl"

import { useRouter } from "#i18n/navigation"
import { authClient } from "#lib/auth-client"
import { ERP_UTILITY_AVATAR_PNG } from "#lib/site"
import { cn } from "#lib/utils"

import { APP_SHELL_UTILITY_DISC_CLASS } from "./appshell-utility-bar.client"
import { AppShellUtilityBarIconDropdown } from "./appshell-utility-bar-icon-dropdown.client"
import { buildAppShellAccountDropdownGroups } from "./appshell-utility-bar-account-dropdown.groups"
import type { AppShellAccountDropdownHrefs } from "./appshell-utility-bar-account-dropdown.groups"

const DISC_PX = 33

export type AppShellAccountDropdownProps = {
  /** Locale-prefixed routes — plain object from RSC; avoid inline new object per render when possible. */
  hrefs: AppShellAccountDropdownHrefs
  /**
   * When set, shows a live “Back to workspace” row. When omitted, that row is hidden
   * (no disabled stub — avoids implying a broken navigation).
   */
  workspaceHomeHref?: Route
  userEmail?: string
  title?: string
  subtitle?: string
  footer?: ReactNode
  triggerAriaLabel?: string
  triggerTooltip?: string
  /**
   * Override sign-out behavior (e.g. shell preview no-op). When omitted, uses
   * `authClient.signOut` + locale home refresh, matching the app-shell account menu.
   */
  onSignOut?: () => void
}

export function AppShellAccountDropdown({
  hrefs,
  workspaceHomeHref,
  userEmail,
  title,
  subtitle,
  footer,
  triggerAriaLabel,
  triggerTooltip,
  onSignOut,
}: AppShellAccountDropdownProps) {
  const t = useTranslations("Dashboard.shell.accountMenu")
  const router = useRouter()
  const [signOutPending, startSignOut] = useTransition()

  const {
    account: hrefAccount,
    identity: hrefIdentity,
    security: hrefSecurity,
  } = hrefs

  const resolvedTitle = title ?? t("title")
  const resolvedTriggerAria = triggerAriaLabel ?? t("triggerAriaLabel")
  const resolvedTriggerTooltip = triggerTooltip ?? t("triggerTooltip")
  /** Stable default when `footer` is omitted — avoids new element identity every render. */
  const defaultFooterContent = useMemo(
    (): ReactElement => <p>{t("footer")}</p>,
    [t]
  )
  const resolvedFooter = footer ?? defaultFooterContent
  const runSignOut = useCallback(() => {
    if (onSignOut) {
      onSignOut()
      return
    }
    startSignOut(async () => {
      await authClient.signOut()
      router.push("/")
      router.refresh()
    })
  }, [onSignOut, router])

  const resolvedSubtitle =
    subtitle?.trim() ||
    (userEmail?.trim() ? userEmail.trim() : t("defaultSubtitle"))

  const securityLabel = t("securityLabel")
  const securityDescription = t("securityDescription")

  const groups = useMemo(
    () =>
      buildAppShellAccountDropdownGroups({
        hrefs: {
          account: hrefAccount,
          identity: hrefIdentity,
          security: hrefSecurity,
        },
        workspaceHomeHref,
        signOutPending,
        runSignOut,
        securityLabel,
        securityDescription,
      }),
    [
      hrefAccount,
      hrefIdentity,
      hrefSecurity,
      workspaceHomeHref,
      runSignOut,
      signOutPending,
      securityLabel,
      securityDescription,
    ]
  )

  const trigger = useMemo(
    () => (
      <button
        type="button"
        aria-label={resolvedTriggerAria}
        title={resolvedTriggerTooltip}
        className={cn(
          APP_SHELL_UTILITY_DISC_CLASS,
          "flex items-center justify-center disabled:pointer-events-none disabled:opacity-50"
        )}
        disabled={signOutPending}
      >
        <Image
          src={ERP_UTILITY_AVATAR_PNG}
          alt=""
          width={DISC_PX}
          height={DISC_PX}
          sizes={`${DISC_PX}px`}
          draggable={false}
          className="pointer-events-none size-full object-cover select-none"
          aria-hidden
        />
      </button>
    ),
    [resolvedTriggerAria, resolvedTriggerTooltip, signOutPending]
  )

  return (
    <AppShellUtilityBarIconDropdown
      ariaLabel={resolvedTriggerAria}
      tooltip={resolvedTriggerTooltip}
      trigger={trigger}
      title={resolvedTitle}
      subtitle={resolvedSubtitle}
      footer={resolvedFooter}
      groups={groups}
    />
  )
}
