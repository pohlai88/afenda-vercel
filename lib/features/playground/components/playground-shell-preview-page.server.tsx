import "server-only"

import { Suspense } from "react"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { AppShell, AppSubLayout, AppShellSurface } from "#app-shell"
import {
  AppShellBrandDisc,
  AppShellAppsDisc,
  CrudSapActionBar,
} from "#app-shell/client"
import {
  AppShellPreviewCommandPalette,
  AppShellPreviewCommandSearch,
} from "#components2/playground/app-shell-preview/command-search.client"
import { AppShellPreviewOperationalScope } from "#components2/playground/app-shell-preview/operational-scope.client"
import { AppShellPreviewPolicyDisc } from "#components2/playground/app-shell-preview/policy-disc.client"
import { AppShellPreviewUtilityBarRight } from "#components2/playground/app-shell-preview/utility-bar-right.client"

import { buildShellPreviewPrimaryRail } from "../data/shell-preview-fixtures/primary-rail.fixture"
import { SHELL_PREVIEW_SUB_RAIL } from "../data/shell-preview-fixtures/sub-rail.fixture"
import { redirectIfProductionPlaygroundRoute } from "../data/playground-route-gate.server"
import { SHELL_PREVIEW_HREF } from "../schemas/playground-paths.shared"
import { PlaygroundShellPreviewContent } from "./playground-shell-preview-content.server"

function ShellPreviewFallback() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground"
      aria-busy="true"
      aria-live="polite"
    >
      Loading shell preview…
    </div>
  )
}

export default function PlaygroundShellPreviewPage(
  props: PageProps<"/[locale]/playground/shell-preview">
) {
  return (
    <Suspense fallback={<ShellPreviewFallback />}>
      <PlaygroundShellPreviewPageInner {...props} />
    </Suspense>
  )
}

async function PlaygroundShellPreviewPageInner({
  params,
}: PageProps<"/[locale]/playground/shell-preview">) {
  redirectIfProductionPlaygroundRoute()

  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  return (
    <AppShell
      envelope={{ surface: "apps", locale }}
      rail={buildShellPreviewPrimaryRail()}
      utilityBar={{
        left: <UtilityBarLeft />,
        right: (
          <>
            <AppShellPreviewCommandSearch />
            <AppShellPreviewUtilityBarRight />
          </>
        ),
      }}
    >
      <AppSubLayout
        rail={SHELL_PREVIEW_SUB_RAIL}
        command={<AppShellPreviewCommandPalette />}
      >
        <AppShellSurface
          title="Shell Preview"
          subtitle="components2/app-shell: primary rail (AppShell) + secondary in-flow rail (AppSubLayout) + operational scope rail mock in the utility bar. Mock labels and badges are hardcoded; all links stay on this URL."
          breadcrumbs={[
            { label: "Playground" },
            { label: "Shell Preview" },
            { label: "HRM" },
            { label: "Employees" },
          ]}
          headerActions={<CrudSapActionBar />}
        >
          <PlaygroundShellPreviewContent />
        </AppShellSurface>
      </AppSubLayout>
    </AppShell>
  )
}

function UtilityBarLeft() {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5">
      <AppShellBrandDisc
        href={SHELL_PREVIEW_HREF}
        ariaLabel="Afenda home (preview)"
        tooltip="Organization home — reloads this preview page"
      />
      <AppShellAppsDisc
        ariaLabel="Apps (preview)"
        tooltip="App launcher — CSS preview only"
      />
      <AppShellPreviewPolicyDisc />
      <div aria-hidden className="h-4 w-px shrink-0 bg-border/40" />
      <AppShellPreviewOperationalScope />
    </div>
  )
}
