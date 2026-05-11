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
import {
  Building2,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  PanelLeft,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { NexusCommandProvider } from "#components/nexus/nexus-command-context"
import { SignOutButton } from "#components/sign-out-button"
import { Button } from "#components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "#components/ui/sheet"
import { Link, usePathname } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { AccountCommandLayer } from "./account-command-layer"
import type {
  AccountRailQuickAction,
  AccountRailSection,
  AccountRecentContext,
  AccountShellSummary,
  AccountSignal,
} from "./account-shell.types"

type AccountOperatingShellProps = {
  title: string
  railLabel: string
  railDescription: string
  sectionsLabel: string
  quickActionsLabel: string
  recentLabel: string
  signalsLabel: string
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
  signalsLabel,
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
  const [railCollapsed, setRailCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      return window.localStorage.getItem(RAIL_COLLAPSED_STORAGE_KEY) === "1"
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

  if (pathname.startsWith("/account/onething")) {
    return children
  }

  const rail = (
    <AccountContextRail
      railLabel={railLabel}
      railDescription={railDescription}
      sectionsLabel={sectionsLabel}
      quickActionsLabel={quickActionsLabel}
      recentLabel={recentLabel}
      signalsLabel={signalsLabel}
      summary={summary}
      sections={sections}
      quickActions={quickActions}
      recentContexts={recentContexts}
      signals={signals}
      collapsed={railCollapsed}
      pathname={pathname}
      hash={hash}
      collapseRailLabel={collapseRailLabel}
      expandRailLabel={expandRailLabel}
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
      <div className="min-h-svh bg-background">
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
              className="overflow-hidden bg-background lg:rounded-tl-[var(--nexus-workspace-radius)] lg:border-t lg:border-l lg:border-border/80"
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
            className="w-[min(22rem,calc(100vw-1rem))] border-r border-border/60 bg-background/96 p-0 backdrop-blur-2xl"
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

function AccountContextRail({
  railLabel,
  railDescription,
  sectionsLabel,
  quickActionsLabel,
  recentLabel,
  signalsLabel,
  summary,
  sections,
  quickActions,
  recentContexts,
  signals,
  collapsed,
  pathname,
  hash,
  collapseRailLabel,
  expandRailLabel,
  onToggleCollapse,
}: {
  railLabel: string
  railDescription: string
  sectionsLabel: string
  quickActionsLabel: string
  recentLabel: string
  signalsLabel: string
  summary: AccountShellSummary
  sections: AccountRailSection[]
  quickActions: AccountRailQuickAction[]
  recentContexts: AccountRecentContext[]
  signals: AccountSignal[]
  collapsed: boolean
  pathname: string
  hash: string
  collapseRailLabel: string
  expandRailLabel: string
  onToggleCollapse: () => void
}) {
  const initial = summary.displayName.trim().charAt(0).toUpperCase() || "A"
  const railToggleLabel = collapsed ? expandRailLabel : collapseRailLabel

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        collapsed ? "items-center" : "items-stretch"
      )}
      aria-label={railLabel}
    >
      <div
        className={cn(
          "hidden shrink-0 pb-3 lg:flex",
          collapsed ? "justify-center" : "justify-end"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={railToggleLabel}
          title={railToggleLabel}
          onClick={onToggleCollapse}
          className="size-9 rounded-xl text-muted-foreground hover:bg-muted/45 hover:text-foreground"
        >
          <PanelLeft
            className={cn(
              "size-4 transition-transform",
              collapsed && "scale-x-[-1]"
            )}
          />
        </Button>
      </div>

      <div
        className={cn(
          "shrink-0 pb-4",
          collapsed ? "flex flex-col items-center gap-3" : "space-y-3"
        )}
      >
        <div
          className={cn(
            "flex items-start gap-3",
            collapsed && "flex-col items-center gap-2 text-center"
          )}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {initial}
          </div>
          {!collapsed ? (
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {summary.displayName}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {summary.email}
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[0.73rem] text-muted-foreground">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium",
                    summary.emailVerified
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  )}
                >
                  {summary.emailVerified ? "Verified" : "Verification pending"}
                </span>
                {summary.activeOrgName ? (
                  <span className="truncate rounded-full bg-muted/60 px-2 py-0.5 font-medium">
                    {summary.activeOrgName}
                    {summary.activeOrgRole ? ` · ${summary.activeOrgRole}` : ""}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {railDescription}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-4">
        <section className="space-y-2.5">
          {!collapsed ? (
            <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              {sectionsLabel}
            </p>
          ) : null}
          <nav
            className={cn(
              "grid",
              collapsed ? "justify-items-center gap-2" : "gap-1"
            )}
          >
            {sections.map((section) => {
              const active = isSectionActive(section, pathname, hash)
              const Icon = iconForSection(section.id)

              return (
                <Link
                  key={section.id}
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={section.label}
                  title={section.label}
                  className={cn(
                    "group transition-colors",
                    collapsed
                      ? "flex size-10 items-center justify-center rounded-2xl"
                      : "flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left",
                    active
                      ? "bg-muted/72 text-foreground"
                      : "text-muted-foreground hover:bg-muted/45 hover:text-foreground"
                  )}
                >
                  {collapsed ? (
                    <Icon className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <>
                      <span className="inline-flex min-w-0 items-start gap-3">
                        <Icon
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">
                            {section.label}
                          </span>
                          <span className="block pt-0.5 text-xs leading-5 text-muted-foreground">
                            {section.description}
                          </span>
                        </span>
                      </span>
                      {active ? (
                        <ShieldCheck
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden
                        />
                      ) : null}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>
        </section>

        {!collapsed ? (
          <>
            <section className="space-y-2.5 pt-6">
              <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {recentLabel}
              </p>
              <div className="grid gap-2 text-sm">
                {recentContexts.map((item) =>
                  item.href ? (
                    <Link
                      key={`${item.label}-${item.value}`}
                      href={item.href}
                      className="rounded-xl px-3 py-2 transition-colors hover:bg-muted/45"
                    >
                      <p className="text-xs text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="pt-0.5 text-sm text-foreground">
                        {item.value}
                      </p>
                    </Link>
                  ) : (
                    <div
                      key={`${item.label}-${item.value}`}
                      className="rounded-xl px-3 py-2"
                    >
                      <p className="text-xs text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="pt-0.5 text-sm text-foreground">
                        {item.value}
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>

            <section className="space-y-2.5 pt-6">
              <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {signalsLabel}
              </p>
              <dl className="grid gap-2">
                {signals.map((signal) => (
                  <div key={signal.label} className="rounded-xl px-3 py-2">
                    <dt className="text-xs text-muted-foreground">
                      {signal.label}
                    </dt>
                    <dd
                      className={cn(
                        "pt-0.5 text-sm font-medium",
                        signal.tone === "positive" &&
                          "text-emerald-700 dark:text-emerald-300",
                        signal.tone === "attention" &&
                          "text-amber-700 dark:text-amber-300",
                        (!signal.tone || signal.tone === "default") &&
                          "text-foreground"
                      )}
                    >
                      {signal.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        ) : null}
      </div>

      <section
        className={cn(
          "shrink-0 border-t border-border/10 pt-4",
          collapsed ? "w-full" : "space-y-2.5"
        )}
      >
        {!collapsed ? (
          <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {quickActionsLabel}
          </p>
        ) : null}
        <div className={cn("grid gap-2", collapsed && "justify-items-center")}>
          {quickActions.map((action) => {
            const Icon = iconForQuickAction(action)

            return action.type === "link" ? (
              <Button
                key={action.label}
                asChild
                variant="ghost"
                size="sm"
                aria-label={action.label}
                title={action.label}
                className={cn(
                  collapsed
                    ? "size-10 justify-center rounded-2xl px-0 py-0 hover:bg-muted/45"
                    : "h-auto justify-start px-3 py-2.5 text-left hover:bg-muted/45"
                )}
              >
                <Link href={action.href}>
                  {collapsed ? (
                    <Icon className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <span className="flex min-w-0 items-start gap-3">
                      <Icon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="flex min-w-0 flex-col items-start">
                        <span>{action.label}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                    </span>
                  )}
                </Link>
              </Button>
            ) : (
              <SignOutButton
                key={action.label}
                variant="ghost"
                size="sm"
                aria-label={action.label}
                title={action.label}
                className={cn(
                  collapsed
                    ? "size-10 justify-center rounded-2xl px-0 py-0 hover:bg-muted/45"
                    : "h-auto justify-start px-3 py-2.5 text-left hover:bg-muted/45"
                )}
              >
                {collapsed ? (
                  <Icon className="size-4 shrink-0" aria-hidden />
                ) : (
                  <span className="flex min-w-0 items-start gap-3">
                    <Icon
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-col items-start">
                      <span>{action.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                  </span>
                )}
              </SignOutButton>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function iconForSection(sectionId: AccountRailSection["id"]) {
  switch (sectionId) {
    case "identity":
      return UserRound
    case "sessions":
      return MonitorSmartphone
    case "authority":
      return Shield
    case "workspace":
      return Building2
  }
}

function iconForQuickAction(action: AccountRailQuickAction) {
  if (action.type === "signout") return LogOut
  if (action.href.includes("#passkeys")) return KeyRound
  if (action.href.includes("#sessions")) return MonitorSmartphone
  return Shield
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
