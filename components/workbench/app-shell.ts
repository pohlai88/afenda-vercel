import "server-only"

/**
 * AppShell / AppSubLayout — stable names for route layouts under `app/` (e.g. `layout.tsx`).
 * Zero extra React tree: aliases of `WorkbenchShell` / `WorkbenchSubLayout`.
 *
 * `server-only`: these exports must never enter a Client Component graph (Next.js
 * server/client boundary — see Server and Client Components guide).
 */

export { WorkbenchShell, WorkbenchShell as AppShell } from "./workbench-shell"
export {
  WorkbenchSubLayout,
  WorkbenchSubLayout as AppSubLayout,
} from "./workbench-sub-layout"

export type {
  WorkbenchShellProps as AppShellProps,
  WorkbenchShellRailConfig as AppShellRailConfig,
} from "./workbench-shell"
export type { WorkbenchSubLayoutProps as AppSubLayoutProps } from "./workbench-sub-layout"
