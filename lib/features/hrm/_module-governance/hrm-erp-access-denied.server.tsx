import "server-only"

import { ErpAccessDenied } from "#features/erp-rbac/client"

import {
  HRM_ACCESS_DENIED_COPY,
  type HrmAccessDeniedCopyKey,
} from "./hrm-access-denied-copy.shared"

type HrmErpAccessDeniedProps = {
  /**
   * Workbench segment / capability key for the surface that denied access.
   * Resolved against {@link HRM_ACCESS_DENIED_COPY}.
   */
  surface: HrmAccessDeniedCopyKey
}

/**
 * Tiny RSC wrapper around `ErpAccessDenied` that resolves the title +
 * description from the shared HRM copy table so individual `page.tsx`
 * files do not re-inline the same English literals 25+ times.
 *
 * When you add a new HRM workbench surface, add the surface key to
 * {@link HRM_ACCESS_DENIED_COPY} first; otherwise TypeScript will
 * reject the `surface` prop. That ensures the copy table stays the
 * single source of truth and a future i18n migration only has to walk
 * one file.
 */
export function HrmErpAccessDenied({ surface }: HrmErpAccessDeniedProps) {
  const copy = HRM_ACCESS_DENIED_COPY[surface]
  return <ErpAccessDenied title={copy.title} description={copy.description} />
}
