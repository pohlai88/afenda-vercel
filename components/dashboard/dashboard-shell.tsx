import type { ReactNode } from "react"
import { Suspense } from "react"
import { cookies } from "next/headers"
import { getTranslations } from "next-intl/server"

import { SidebarInset, SidebarProvider } from "#components/ui/sidebar"

import type { BreadcrumbSegment } from "./breadcrumbs"
import { AppSidebar, SIDEBAR_WIDTH_COOKIE } from "./app-sidebar"
import { AppTopBar } from "./app-topbar"
import { CommandPaletteProvider } from "./command-palette-context"
import { CommandPaletteSlot } from "./command-palette-slot"
import { CommandPaletteTrigger } from "./command-palette-trigger"
import { INSPECTOR_COOKIE_NAME, InspectorProvider } from "./inspector-context"
import {
  INSPECTOR_WIDTH_COOKIE,
  InspectorTrigger,
  RightInspector,
} from "./right-inspector"

/** Align with `AppSidebar` / `RightInspector` clamp ranges — keeps SSR seed valid. */
function parsePersistedWidthPx(
  raw: string | undefined,
  min: number,
  max: number
): number | null {
  if (raw === undefined || raw === "") return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  const rounded = Math.round(n)
  return Math.min(Math.max(rounded, min), max)
}

type DashboardShellProps = {
  userEmail: string
  orgSlug: string
  orgName: string
  showOrgAdminLink?: boolean
  children: ReactNode
  /**
   * Breadcrumb segments shown in the L2 sub-bar.
   * Provided by the RSC layout; individual pages may override via a server prop.
   */
  breadcrumbs?: BreadcrumbSegment[]
  /** Optional L2 module sub-navigation (ModuleSubnav) inserted below the sub-bar. */
  moduleSubnav?: ReactNode
  /** Optional slot rendered between the sidebar trigger and user utilities (L1 center). */
  centerSlot?: ReactNode
  /** Signed-in user ID — forwarded to the command palette slot for org fetching. */
  userId?: string
  /** Current active organization ID — used to highlight the current org in the palette. */
  currentOrgId?: string
}

export async function DashboardShell({
  userEmail,
  orgSlug,
  orgName,
  showOrgAdminLink = false,
  children,
  breadcrumbs,
  moduleSubnav,
  centerSlot,
  userId,
  currentOrgId = "",
}: DashboardShellProps) {
  const t = await getTranslations("Dashboard.shell")
  const cookieStore = await cookies()
  const inspectorDefaultOpen =
    cookieStore.get(INSPECTOR_COOKIE_NAME)?.value === "true"

  const sidebarWidthRaw = cookieStore.get(SIDEBAR_WIDTH_COOKIE)?.value
  const inspectorWidthRaw = cookieStore.get(INSPECTOR_WIDTH_COOKIE)?.value
  const sidebarInitialWidth = parsePersistedWidthPx(sidebarWidthRaw, 200, 360)
  const inspectorInitialWidth = parsePersistedWidthPx(
    inspectorWidthRaw,
    280,
    560
  )

  return (
    <InspectorProvider defaultOpen={inspectorDefaultOpen}>
      <CommandPaletteProvider>
        <SidebarProvider>
          <a
            href="#dashboard-main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-elevation-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("skipToMain")}
          </a>

          <AppSidebar
            orgSlug={orgSlug}
            orgName={orgName}
            showOrgAdminLink={showOrgAdminLink}
            initialWidth={sidebarInitialWidth}
          />

          <SidebarInset>
            <AppTopBar
              userEmail={userEmail}
              breadcrumbs={breadcrumbs}
              centerSlot={centerSlot}
              commandPaletteTrigger={<CommandPaletteTrigger />}
              subActions={
                <InspectorTrigger
                  label={t("inspector.toggleDetails")}
                  ariaLabelClosed={t("inspector.toggleAriaClosed")}
                  ariaLabelOpen={t("inspector.toggleAriaOpen")}
                />
              }
            />
            {moduleSubnav}
            <div className="flex flex-1 overflow-hidden">
              <main
                id="dashboard-main"
                tabIndex={-1}
                className="min-w-0 flex-1 overflow-y-auto p-6 outline-none"
              >
                {children}
              </main>
              <RightInspector initialWidth={inspectorInitialWidth} />
            </div>
          </SidebarInset>

          {/* Global command palette — streams independently behind Suspense */}
          {userId ? (
            <Suspense fallback={null}>
              <CommandPaletteSlot
                userId={userId}
                currentOrgId={currentOrgId}
                orgSlug={orgSlug}
                showOrgAdminLink={showOrgAdminLink}
              />
            </Suspense>
          ) : null}
        </SidebarProvider>
      </CommandPaletteProvider>
    </InspectorProvider>
  )
}
