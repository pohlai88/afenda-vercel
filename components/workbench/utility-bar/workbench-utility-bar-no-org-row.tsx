import { WorkbenchUtilityRailCollapse } from "./left-utility-bar/workbench-utility-rail-collapse"
import { WorkbenchCommandTrigger } from "./workbench-command-trigger"
import { WorkbenchUtilityThemeMenu } from "./right-utility-bar/workbench-utility-theme-menu"
import { WorkbenchUtilityLocaleMenu } from "./right-utility-bar/workbench-utility-locale-menu"
import { WorkbenchControlMenu } from "./right-utility-bar/workbench-control-menu"

type WorkbenchUtilityBarNoOrgRowProps = {
  userEmail: string
}

/**
 * No-org variant of the utility bar row.
 * Renders only universal widgets (theme, locale, identity control).
 * Used by console, operator, and non-org surfaces.
 */
export async function WorkbenchUtilityBarNoOrgRow({
  userEmail,
}: WorkbenchUtilityBarNoOrgRowProps) {
  return (
    <div className="relative flex h-(--af-l1-height) items-center justify-between gap-2">
      {/* Left: rail collapse (when shell rail) + brand */}
      <div className="flex min-w-0 flex-1 items-center justify-start">
        <div className="flex items-center gap-1.5">
          <WorkbenchUtilityRailCollapse />
          <span className="flex size-[33px] items-center justify-center rounded-full bg-primary/10">
            <span className="text-xs font-bold text-primary">A</span>
          </span>
        </div>
      </div>

      {/* Center: command launcher */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 flex w-full -translate-x-1/2 -translate-y-1/2 justify-center px-14 sm:px-24">
        <WorkbenchCommandTrigger className="pointer-events-auto" />
      </div>

      {/* Right: universal utilities + identity */}
      <div className="flex min-w-0 flex-1 items-center justify-end">
        <div className="flex items-center justify-end gap-1.5">
          <WorkbenchUtilityThemeMenu />
          <WorkbenchUtilityLocaleMenu />
          <WorkbenchControlMenu
            userEmail={userEmail}
            orgSlug={undefined}
            orgName={undefined}
            showOrgAdminLink={false}
          />
        </div>
      </div>
    </div>
  )
}
