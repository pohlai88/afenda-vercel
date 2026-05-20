/**
 * HRM apps path segments — re-exported from i18n routing SSOT.
 */
export {
  HRM_APPS_CAPABILITY_SEGMENTS,
  HRM_APPS_CAPABILITY_SEGMENT_SET,
  type HrmAppsCapabilitySegment,
} from "#lib/i18n/org-apps-route-segments.shared"

import {
  HRM_APPS_CAPABILITY_SEGMENT_SET,
  type HrmAppsCapabilitySegment,
} from "#lib/i18n/org-apps-route-segments.shared"

export function isAllowedHrmAppsSubsegment(
  segment: string
): segment is HrmAppsCapabilitySegment {
  return HRM_APPS_CAPABILITY_SEGMENT_SET.has(segment)
}
