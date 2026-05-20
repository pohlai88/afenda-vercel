import type { AatPeriodKey } from "./schemas/aat.schema"

export { HRM_AAT_AUDIT, type HrmAatAuditAction } from "./aat.contract"

export {
  HRM_AAT_SPEC_MAP,
  listHrmAatSpecCodes,
  type HrmAatSpecArea,
  type HrmAatSpecCode,
} from "./aat-spec-map.shared"

export {
  AAT_LIST_SURFACE_IDS,
  AAT_STAT_SURFACE_KEY,
  AAT_CHART_SURFACE_KEY,
  AAT_HEATMAP_SURFACE_KEY,
  type AatListSurfaceId,
} from "./data/aat-surface-metadata.shared"

export { AbsenceAnalyticsPage } from "./components/absence-analytics-page"

export {
  resolveAatSurfaceAccess,
  type AatSurfaceAccess,
} from "./data/aat-access.server"

export type { AatPeriodKey }
