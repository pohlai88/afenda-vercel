import { WorkbenchUtilityThemeMenu } from "./workbench-utility-theme-menu"
import { WorkbenchUtilityLocaleMenu } from "./workbench-utility-locale-menu"
import { WorkbenchControlMenu } from "./workbench-control-menu"

type WorkbenchUtilityBarNoOrgRowProps = {
  userId: string
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
    <div className="grid h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
      {/* Left: brand only */}
      <div className="flex items-center gap-1.5">
        <span className="flex size-[33px] items-center justify-center rounded-full bg-primary/10">
          <span className="text-xs font-bold text-primary">A</span>
        </span>
      </div>

      {/* Center: empty */}
      <div />

      {/* Right: universal utilities + identity */}
      <div className="flex items-center justify-end gap-1.5">
        <WorkbenchUtilityThemeMenu />
        <WorkbenchUtilityLocaleMenu />
        <WorkbenchControlMenu
          userEmail={userEmail}
          orgSlug={undefined}
          orgName={undefined}
          currentOrgId={undefined}
          userOrgs={[]}
        />
      </div>
    </div>
  )
}
