import { getTranslations } from "next-intl/server"

import { WorkbenchSkipToMain } from "#components/workbench/workbench-skip-to-main"

/** Resolves skip-to-main copy without blocking the org layout static shell. */
export async function OrgWorkbenchShellSkipAsync() {
  const tShell = await getTranslations("Dashboard.shell")
  return <WorkbenchSkipToMain label={tShell("skipToMain")} />
}
