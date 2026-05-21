import "server-only"

import { cache } from "react"

import { listUserIdsWithErpPermission } from "#features/erp-rbac/server"
import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { organizationAppsPath } from "#lib/org-apps-module-paths"

import { HRM_TCI_AUDIT } from "../tci.contract"

export type TimeClockSyncFailureReason =
  | "watch_stale"
  | "watch_failed"
  | "scheduled_poll"
  | "scheduled_ingest"

const REASON_TITLE: Record<TimeClockSyncFailureReason, string> = {
  watch_stale: "Time clock sync stuck",
  watch_failed: "Time clock sync failed",
  scheduled_poll: "Scheduled vendor sync failed",
  scheduled_ingest: "Scheduled vendor ingest failed",
}

const resolveTimeClockLinkedPath = cache(
  async (organizationId: string): Promise<string> => {
    const slug = await getOrganizationSlugById(organizationId)
    if (!slug) return "/apps/hrm/time-clock"
    return `${organizationAppsPath(slug, "hrm")}/time-clock`
  }
)

export type TimeClockNotificationDispatcher = {
  notifyDeviceSyncFailure(input: {
    readonly organizationId: string
    readonly deviceId: string
    readonly deviceName: string
    readonly externalDeviceId: string
    readonly reason: TimeClockSyncFailureReason
    readonly detail?: string | null
  }): Promise<number>
}

/** One ERP permission lookup per org per cron tick (avoids N+1 on multi-device failures). */
export function createTimeClockNotificationDispatcher(): TimeClockNotificationDispatcher {
  const targetUserIdsByOrg = new Map<string, readonly string[]>()
  const linkedPathByOrg = new Map<string, string>()

  async function resolveTargets(organizationId: string): Promise<readonly string[]> {
    const cached = targetUserIdsByOrg.get(organizationId)
    if (cached) return cached
    const targets = await listUserIdsWithErpPermission({
      organizationId,
      permission: {
        module: "hrm",
        object: "time_clock_device",
        function: "update",
      },
    })
    targetUserIdsByOrg.set(organizationId, targets)
    return targets
  }

  async function resolveLinkedPath(organizationId: string): Promise<string> {
    const cached = linkedPathByOrg.get(organizationId)
    if (cached) return cached
    const path = await resolveTimeClockLinkedPath(organizationId)
    linkedPathByOrg.set(organizationId, path)
    return path
  }

  return {
    async notifyDeviceSyncFailure(input) {
      const targetUserIds = await resolveTargets(input.organizationId)
      if (targetUserIds.length === 0) return 0

      const linkedPath = await resolveLinkedPath(input.organizationId)
      const title = REASON_TITLE[input.reason]
      const label = input.deviceName.trim() || input.externalDeviceId
      const detail = input.detail?.trim()
      const bodyParts = [
        `${title} for ${label} (${input.externalDeviceId}).`,
        detail ? detail : null,
      ].filter(Boolean)

      let sent = 0
      for (const targetUserId of targetUserIds) {
        try {
          await publishOrgNotificationIfMissing({
            organizationId: input.organizationId,
            targetUserId,
            title,
            body: bodyParts.join(" "),
            severity: "warning",
            linkedEntityType: HRM_TCI_AUDIT.syncFail,
            linkedEntityId: input.deviceId,
            linkedEntityLabel: "time clock device",
            linkedPath,
            expiresAt: null,
          })
          sent += 1
        } catch {
          // Notification delivery must not roll back sync watch or scheduled sync.
        }
      }

      return sent
    },
  }
}

/**
 * In-app notification for device sync failures (HRM-TCI-026 / Slice 6).
 * Best-effort — never throws after cron or ingest work completes.
 */
export async function notifyTimeClockDeviceSyncFailure(input: {
  readonly organizationId: string
  readonly deviceId: string
  readonly deviceName: string
  readonly externalDeviceId: string
  readonly reason: TimeClockSyncFailureReason
  readonly detail?: string | null
}): Promise<number> {
  return createTimeClockNotificationDispatcher().notifyDeviceSyncFailure(input)
}
