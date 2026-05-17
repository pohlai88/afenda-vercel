"use client"

import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"
import { organizationHrmPath } from "#features/hrm/client"

import {
  HRM_BENEFITS_TABS,
  type HrmBenefitsTab,
} from "../data/benefit-display.shared"

type BenefitsTabNavProps = {
  orgSlug: string
  activeTab: HrmBenefitsTab
}

/**
 * URL-driven tab navigator for the Benefits workbench. Each tab is a
 * real `Link` so Cmd-click and refresh preserve server truth — same
 * idiom as {@link PoliciesTabNav}.
 */
export function BenefitsTabNav({ orgSlug, activeTab }: BenefitsTabNavProps) {
  const t = useTranslations("Dashboard.Hrm.benefits")

  return (
    <nav
      role="tablist"
      aria-label={t("tabAria")}
      className="flex flex-wrap items-center gap-1 border-b border-border"
    >
      {HRM_BENEFITS_TABS.map((tab) => {
        const params = new URLSearchParams()
        params.set("tab", tab)
        const base = organizationHrmPath(orgSlug, "benefits")
        const href = params.toString() ? `${base}?${params.toString()}` : base
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
                ? "-mb-px border-b-2 border-primary px-3 py-2 text-sm font-medium text-foreground"
                : "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {t(`tabs.${tab}`)}
          </Link>
        )
      })}
    </nav>
  )
}
