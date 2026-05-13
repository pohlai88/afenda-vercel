"use client"

import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"

import {
  ORG_STRUCTURE_TABS,
  type OrgStructureTab,
} from "../data/org-structure-display.shared"

type OrganizationTabNavProps = {
  orgSlug: string
  activeTab: OrgStructureTab
  includeArchived: boolean
}

export function OrganizationTabNav({
  orgSlug,
  activeTab,
  includeArchived,
}: OrganizationTabNavProps) {
  const t = useTranslations("Dashboard.Hrm.organization")

  return (
    <nav
      role="tablist"
      aria-label={t("tabAria")}
      className="flex flex-wrap items-center gap-1 border-b border-border"
    >
      {ORG_STRUCTURE_TABS.map((tab) => {
        const params = new URLSearchParams()
        params.set("tab", tab)
        if (includeArchived) params.set("includeArchived", "true")
        const href = `/o/${orgSlug}/dashboard/hrm/organization?${params.toString()}`
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
