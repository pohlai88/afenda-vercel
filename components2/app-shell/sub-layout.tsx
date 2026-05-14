/**
 * AppSubLayout — secondary navigation rail that mounts INSIDE AppShell's
 * content pane. Drop it into any nested layout.tsx that needs its own
 * left-nav section (HRM, Org Admin, etc.).
 *
 * Usage:
 *   import { AppSubLayout } from "#app-shell"
 *
 *   export default async function HrmLayout({ children }) {
 *     const rail = buildHrmRailConfig(...)
 *     return <AppSubLayout rail={rail}>{children}</AppSubLayout>
 *   }
 *
 * No envelope wiring needed — the parent AppShell already owns that.
 * Pass rail={null} (or omit) and children render as a plain passthrough.
 */
export { AppSubLayoutClient as AppSubLayout } from "./sub-layout.client"
export type { AppSubLayoutProps } from "./sub-layout.client"
