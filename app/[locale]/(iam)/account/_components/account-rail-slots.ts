import {
  ActivityIcon,
  Building2Icon,
  KeyRoundIcon,
  MonitorSmartphoneIcon,
  ShieldIcon,
  UserRoundIcon,
} from "lucide-react"

import type {
  WorkbenchRailNavSection,
  WorkbenchRailSlots,
} from "#components/workbench"

import type {
  AccountRailSection,
  AccountRecentContext,
  AccountShellSummary,
  AccountSignal,
} from "./account-shell.types"

/**
 * Adapts account domain data → WorkbenchRailSlots v2.
 *
 * Pure server function — no browser APIs, no hooks.
 */
export function buildAccountRailSlotsV2({
  summary,
  sections,
  recentContexts,
  signals,
}: {
  summary: AccountShellSummary
  sections: AccountRailSection[]
  recentContexts: AccountRecentContext[]
  signals: AccountSignal[]
}): WorkbenchRailSlots {
  const initial = summary.displayName.trim().charAt(0).toUpperCase() || "A"

  const identityPills: WorkbenchRailSlots["identity"]["pills"] = [
    {
      label: summary.emailVerified ? "Verified" : "Verification pending",
      tone: summary.emailVerified ? "positive" : "attention",
    },
  ]
  if (summary.activeOrgName) {
    identityPills.push({
      label:
        summary.activeOrgName +
        (summary.activeOrgRole ? ` · ${summary.activeOrgRole}` : ""),
      tone: "default",
    })
  }

  const navSection: WorkbenchRailNavSection = {
    id: "account",
    items: sections.map((section) => ({
      id: section.id,
      label: section.label,
      description: section.description,
      href: section.href,
      icon: iconForSectionId(section.id),
    })),
  }

  const contextItems = [
    ...recentContexts
      .filter((item) => item.value)
      .map((item) => ({
        label: item.label,
        value: item.value,
        href: item.href ?? undefined,
        tone: "default" as const,
      })),
    ...signals.map((signal) => ({
      label: signal.label,
      value: signal.value,
      href: undefined,
      tone: signal.tone ?? ("default" as const),
    })),
  ]

  return {
    identity: {
      initial,
      primary: summary.displayName,
      secondary: summary.email,
      pills: identityPills,
    },
    nav: [navSection],
    context:
      contextItems.length > 0
        ? [{ id: "account-context", label: "Context", items: contextItems }]
        : undefined,
  }
}

function iconForSectionId(id: AccountRailSection["id"]) {
  switch (id) {
    case "identity":
      return UserRoundIcon
    case "orbit":
      return ActivityIcon
    case "sessions":
      return MonitorSmartphoneIcon
    case "authority":
      return ShieldIcon
    case "workspace":
      return Building2Icon
    default:
      return KeyRoundIcon
  }
}
