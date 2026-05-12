"use client"

import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"

import {
  HRM_POLICY_TABS,
  type HrmPolicyTab,
} from "../data/leave-policy-display.shared"

type PoliciesTabNavProps = {
  orgSlug: string
  activeTab: HrmPolicyTab
  includeArchived: boolean
}

/**
 * URL-driven tab navigator for the HR Policies workbench.
 *
 * Each tab is a real `Link`-as-anchor (not a button + router push) so
 * Cmd-click / middle-click open in a new tab and the route is
 * server-rendered on first navigation — same idiom we use across the
 * org-admin sidebar. We intentionally render this as one stateless
 * client component instead of binding `useSearchParams`: the active
 * tab is already passed in by the server composer, which has the
 * canonical validation logic. No client state, no `useEffect`.
 *
 * `includeArchived` is preserved across tab clicks so a power user can
 * stay in the "archived rows visible" view while flipping between
 * Leave types and the (Phase 4) Holidays tab.
 */
export function PoliciesTabNav({
  orgSlug,
  activeTab,
  includeArchived,
}: PoliciesTabNavProps) {
  const t = useTranslations("Dashboard.Hrm.policies")

  return (
    <nav
      role="tablist"
      aria-label={t("tabAria")}
      className="border-border flex flex-wrap items-center gap-1 border-b"
    >
      {HRM_POLICY_TABS.map((tab) => {
        const params = new URLSearchParams()
        params.set("tab", tab)
        if (includeArchived) params.set("includeArchived", "true")
        const href = `/o/${orgSlug}/dashboard/hrm/policies?${params.toString()}`
        const isActive = tab === activeTab

        return (
          <Link
            key={tab}
            href={href}
            role="tab"
            aria-selected={isActive}
            data-active={isActive ? "true" : undefined}
            className={
              isActive
                ? "border-primary text-foreground -mb-px border-b-2 px-3 py-2 text-sm font-medium"
                : "text-muted-foreground hover:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium"
            }
          >
            {t(`tabs.${tab}`)}
          </Link>
        )
      })}
    </nav>
  )
}
