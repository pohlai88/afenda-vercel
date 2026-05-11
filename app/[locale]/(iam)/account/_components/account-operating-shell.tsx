"use client"

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"

export const AccountMobileRailContext = createContext<{ open: () => void }>({
  open: () => {},
})

import { NexusCommandProvider } from "#components/nexus/nexus-command-context"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "#components/ui/sheet"
import { WorkbenchRail } from "#components/workbench-rail"
import type {
  WorkbenchRailAction,
  WorkbenchRailNavItem,
  WorkbenchRailSlots,
} from "#components/workbench-rail"
import { usePathname } from "#i18n/navigation"

import { AccountCommandLayer } from "./account-command-layer"
import type {
  AccountRailQuickAction,
  AccountRailSection,
  AccountRecentContext,
  AccountShellSummary,
  AccountSignal,
  AccountSurfaceSectionId,
} from "./account-shell.types"

type AccountOperatingShellProps = {
  title: string
  railLabel: string
  railDescription: string
  sectionsLabel: string
  quickActionsLabel: string
  recentLabel: string
  collapseRailLabel: string
  expandRailLabel: string
  summary: AccountShellSummary
  sections: AccountRailSection[]
  quickActions: AccountRailQuickAction[]
  recentContexts: AccountRecentContext[]
  signals: AccountSignal[]
  utilityBar?: ReactNode
  children: ReactNode
}

const RAIL_COLLAPSED_STORAGE_KEY = "afenda.accountSurface.railCollapsed"

export function AccountOperatingShell({
  title,
  railLabel,
  railDescription,
  sectionsLabel,
  quickActionsLabel,
  recentLabel,
  collapseRailLabel,
  expandRailLabel,
  summary,
  sections,
  quickActions,
  recentContexts,
  signals,
  utilityBar,
  children,
}: AccountOperatingShellProps) {
  const pathname = usePathname()
  const [hash, setHash] = useState("")
  const [mobileRailOpen, setMobileRailOpen] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState<boolean>(() => {
    try {
      return (
        typeof window !== "undefined" &&
        window.localStorage.getItem(RAIL_COLLAPSED_STORAGE_KEY) === "1"
      )
    } catch {
      return false
    }
  })

  useEffect(() => {
    const syncHash = () => {
      setHash(window.location.hash)
    }

    syncHash()
    window.addEventListener("hashchange", syncHash)
    return () => {
      window.removeEventListener("hashchange", syncHash)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(
        RAIL_COLLAPSED_STORAGE_KEY,
        railCollapsed ? "1" : "0"
      )
    } catch {
      /* ignore */
    }
  }, [railCollapsed])

  const commandSections = useMemo(
    () =>
      sections.map((section) => ({ label: section.label, href: section.href })),
    [sections]
  )

  const commandQuickActions = useMemo(
    () =>
      quickActions
        .filter(
          (
            action
          ): action is Extract<AccountRailQuickAction, { type: "link" }> =>
            action.type === "link"
        )
        .map((action) => ({ label: action.label, href: action.href })),
    [quickActions]
  )

  const railSlots = useMemo(
    () =>
      buildAccountRailSlots({
        summary,
        sections,
        quickActions,
        recentContexts,
        signals,
        pathname,
        hash,
      }),
    [summary, sections, quickActions, recentContexts, signals, pathname, hash]
  )

  if (pathname.startsWith("/account/onething")) {
    return children
  }

  const railLabels = {
    ariaLabel: railLabel,
    description: railDescription,
    navLabel: sectionsLabel,
    actionsLabel: quickActionsLabel,
    contextLabel: recentLabel,
    collapseLabel: collapseRailLabel,
    expandLabel: expandRailLabel,
  }

  const rail = (
    <WorkbenchRail
      slots={railSlots}
      labels={railLabels}
      collapsed={railCollapsed}
      onToggleCollapse={() => setRailCollapsed((current) => !current)}
    />
  )

  const railWidth = railCollapsed
    ? "var(--nexus-rail-collapsed-width)"
    : "var(--nexus-rail-width)"
  const topBarOffset = utilityBar ? "var(--nexus-topbar-height)" : "0px"

  return (
    <AccountMobileRailContext.Provider value={{ open: () => setMobileRailOpen(true) }}>
    <NexusCommandProvider>
      <div className="af-account-workbench-chrome min-h-svh">
        {utilityBar ? (
          <div className="fixed inset-x-0 top-0 z-40">{utilityBar}</div>
        ) : null}

        <div style={{ paddingTop: topBarOffset }}>
          <aside
            className="fixed left-0 z-20 hidden overflow-hidden lg:block"
            style={{
              top: topBarOffset,
              width: railWidth,
              height: `calc(100dvh - ${topBarOffset})`,
            }}
          >
            <div className="h-full overflow-hidden px-2.5 pt-3 pb-3">{rail}</div>
          </aside>

          <div
            className="relative lg:ml-[var(--account-rail-current-width)] lg:transition-[margin-left] lg:duration-200 lg:ease-out"
            style={
              {
                "--account-rail-current-width": railWidth,
              } as CSSProperties
            }
          >
            <div
              className="overflow-hidden bg-card lg:rounded-tl-[var(--nexus-workspace-radius)] lg:border-t lg:border-l lg:border-border/80"
              style={{ height: `calc(100dvh - ${topBarOffset})` }}
            >
              <div className="relative h-full min-w-0 overflow-hidden">
                <main
                  id="dashboard-main"
                  tabIndex={-1}
                  className="h-full min-w-0 overflow-hidden outline-none"
                >
                  {children}
                </main>
              </div>
            </div>
          </div>
        </div>

        <Sheet open={mobileRailOpen} onOpenChange={setMobileRailOpen}>
          <SheetContent
            side="left"
            className="af-account-workbench-chrome w-[min(22rem,calc(100vw-1rem))] border-r border-border/60 p-0"
          >
            <SheetHeader className="px-5 py-5 text-left">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{railDescription}</SheetDescription>
            </SheetHeader>
            <div className="h-full overflow-hidden px-4 pb-6">{rail}</div>
          </SheetContent>
        </Sheet>

        {utilityBar ? (
          <AccountCommandLayer
            title={title}
            description={railDescription}
            sectionsLabel={sectionsLabel}
            quickActionsLabel={quickActionsLabel}
            sections={commandSections}
            quickActions={commandQuickActions}
          />
        ) : null}
      </div>
    </NexusCommandProvider>
    </AccountMobileRailContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Slot builder — pure function, maps account domain props → WorkbenchRailSlots
// ---------------------------------------------------------------------------

function buildAccountRailSlots({
  summary,
  sections,
  quickActions,
  recentContexts,
  signals,
  pathname,
  hash,
}: {
  summary: AccountShellSummary
  sections: AccountRailSection[]
  quickActions: AccountRailQuickAction[]
  recentContexts: AccountRecentContext[]
  signals: AccountSignal[]
  pathname: string
  hash: string
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

  const nav: WorkbenchRailNavItem[] = sections.map((section) => ({
    id: section.id,
    label: section.label,
    description: section.description,
    href: section.href,
    iconKey: iconKeyForSectionId(section.id),
    active: isSectionActive(section, pathname, hash),
    activeIconKey: "shieldCheck",
  }))

  const actions: WorkbenchRailAction[] = quickActions.map((action) =>
    action.type === "link"
      ? {
          kind: "link",
          id: action.label,
          label: action.label,
          description: action.description,
          href: action.href,
          iconKey: iconKeyForQuickActionHref(action.href),
        }
      : {
          kind: "signout",
          id: action.label,
          label: action.label,
          description: action.description,
          iconKey: "logOut",
        }
  )

  const context = [
    ...recentContexts.map((item) => ({
      label: item.label,
      value: item.value,
      href: item.href,
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
      displayName: summary.displayName,
      email: summary.email,
      pills: identityPills,
    },
    nav,
    actions,
    context: context.length > 0 ? context : undefined,
  }
}

function iconKeyForSectionId(
  id: AccountSurfaceSectionId
): WorkbenchRailAction["iconKey"] {
  switch (id) {
    case "identity":
      return "userRound"
    case "sessions":
      return "monitorSmartphone"
    case "authority":
      return "shield"
    case "workspace":
      return "building2"
  }
}

function iconKeyForQuickActionHref(href: string): WorkbenchRailAction["iconKey"] {
  if (href.includes("#passkeys")) return "keyRound"
  if (href.includes("#sessions")) return "monitorSmartphone"
  return "shield"
}

function isSectionActive(
  section: AccountRailSection,
  pathname: string,
  hash: string
) {
  if (!section.matchPath) return false

  const pathMatch =
    pathname === section.matchPath ||
    pathname.startsWith(`${section.matchPath}/`)

  if (!pathMatch) return false

  if (section.id === "sessions") {
    return hash === "#sessions"
  }

  if (section.id === "authority") {
    return hash !== "#sessions"
  }

  return true
}

