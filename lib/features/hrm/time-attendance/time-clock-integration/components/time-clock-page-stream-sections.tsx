import { getTranslations } from "next-intl/server"

import { logUnexpectedServerError } from "#lib/logger.server"

import {
  countTimeClockKpiSummary,
  listTimeClockDevicesForOrg,
  listTimeClockExceptionsForOrg,
  listTimeClockMappingsForOrg,
  listTimeClockSyncBatchesForOrg,
  type TimeClockKpiSummary,
} from "../data/tci.queries.server"
import { listActiveEmployeeChoicesForAttendance } from "../../leave-attendance-management/data/attendance.queries.server"

import { TimeClockDevicesSection } from "./tci-devices-section"
import { TimeClockExceptionsSection } from "./tci-exceptions-section"
import { TimeClockKpiSection } from "./tci-kpi-section"
import { TimeClockMappingsSection } from "./tci-mappings-section"
import { TimeClockSyncBatchesSection } from "./tci-sync-batches-section"

type QueryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: unknown }

const EMPTY_KPI_SUMMARY = {
  activeDevices: 0,
  activeMappings: 0,
  pendingExceptions: 0,
  failedSyncDevices: 0,
  punchesToday: 0,
} as const satisfies TimeClockKpiSummary

async function runTimeClockPageQuery<T>(
  label: string,
  organizationId: string,
  query: () => Promise<T>
): Promise<QueryResult<T>> {
  try {
    return { ok: true, value: await query() }
  } catch (error) {
    logUnexpectedServerError(
      `time-clock-page: ${label} query failed`,
      error,
      { organizationId }
    )
    return { ok: false, error }
  }
}

async function loadFailedCopy() {
  const t = await getTranslations("Dashboard.Hrm.timeClock")
  return { title: t("loadFailed") } as const
}

/** Tier B — KPI stat cards; streamed on the time-clock page. */
export async function TimeClockKpiStreamSection({
  organizationId,
}: {
  readonly organizationId: string
}) {
  const [result, loadFailed] = await Promise.all([
    runTimeClockPageQuery("kpi", organizationId, () =>
      countTimeClockKpiSummary(organizationId)
    ),
    loadFailedCopy(),
  ])

  return (
    <TimeClockKpiSection
      summary={result.ok ? result.value : EMPTY_KPI_SUMMARY}
      loadError={result.ok ? undefined : loadFailed}
    />
  )
}

/** Tier B — device registry; streamed on the time-clock page. */
export async function TimeClockDevicesStreamSection({
  organizationId,
  canRead,
  canManageDevices,
}: {
  readonly organizationId: string
  readonly canRead: boolean
  readonly canManageDevices: boolean
}) {
  const loadFailed = await loadFailedCopy()

  if (!canRead) {
    return (
      <TimeClockDevicesSection
        rows={[]}
        canManage={canManageDevices}
        parentAccessAllowed={false}
      />
    )
  }

  const result = await runTimeClockPageQuery("devices", organizationId, () =>
    listTimeClockDevicesForOrg(organizationId)
  )

  return (
    <TimeClockDevicesSection
      rows={result.ok ? result.value : []}
      canManage={canManageDevices}
      parentAccessAllowed={canRead}
      loadError={result.ok ? undefined : loadFailed}
    />
  )
}

/** Tier B — mappings + choice lists; streamed on the time-clock page. */
export async function TimeClockMappingsStreamSection({
  organizationId,
  canRead,
  canManageMappings,
}: {
  readonly organizationId: string
  readonly canRead: boolean
  readonly canManageMappings: boolean
}) {
  const loadFailed = await loadFailedCopy()

  if (!canRead) {
    return (
      <TimeClockMappingsSection
        rows={[]}
        canManage={canManageMappings}
        employeeChoices={[]}
        deviceChoices={[]}
        parentAccessAllowed={false}
      />
    )
  }

  const [mappingsResult, devicesResult, employeesResult] = await Promise.all([
    runTimeClockPageQuery("mappings", organizationId, () =>
      listTimeClockMappingsForOrg(organizationId)
    ),
    runTimeClockPageQuery("devices", organizationId, () =>
      listTimeClockDevicesForOrg(organizationId)
    ),
    canManageMappings
      ? runTimeClockPageQuery("employee choices", organizationId, () =>
          listActiveEmployeeChoicesForAttendance(organizationId)
        )
      : Promise.resolve({ ok: true as const, value: [] }),
  ])

  const employeeChoices = (employeesResult.ok ? employeesResult.value : []).map(
    (row) => ({
      id: row.id,
      label:
        row.employeeNumber != null
          ? `${row.legalName} · ${row.employeeNumber}`
          : row.legalName,
    })
  )

  const deviceChoices = (devicesResult.ok ? devicesResult.value : [])
    .filter((row) => row.state === "active")
    .map((row) => ({
      id: row.id,
      label: `${row.name} (${row.externalDeviceId})`,
    }))

  const mappingsLoadError =
    mappingsResult.ok && devicesResult.ok && employeesResult.ok
      ? undefined
      : loadFailed

  return (
    <TimeClockMappingsSection
      rows={mappingsResult.ok ? mappingsResult.value : []}
      canManage={canManageMappings}
      employeeChoices={employeeChoices}
      deviceChoices={deviceChoices}
      parentAccessAllowed={canRead}
      loadError={mappingsLoadError}
    />
  )
}

/** Tier B — ingest batch history; streamed on the time-clock page. */
export async function TimeClockSyncBatchesStreamSection({
  organizationId,
}: {
  readonly organizationId: string
}) {
  const [result, loadFailed] = await Promise.all([
    runTimeClockPageQuery("sync batches", organizationId, () =>
      listTimeClockSyncBatchesForOrg(organizationId)
    ),
    loadFailedCopy(),
  ])

  return (
    <TimeClockSyncBatchesSection
      rows={result.ok ? result.value : []}
      parentAccessAllowed
      loadError={result.ok ? undefined : loadFailed}
    />
  )
}

/** Tier B — exception inbox; streamed on the time-clock page. */
export async function TimeClockExceptionsStreamSection({
  organizationId,
  canRead,
  canDecideExceptions,
  canCorrectAttendance,
}: {
  readonly organizationId: string
  readonly canRead: boolean
  readonly canDecideExceptions: boolean
  readonly canCorrectAttendance: boolean
}) {
  const loadFailed = await loadFailedCopy()

  if (!canRead) {
    return (
      <TimeClockExceptionsSection
        rows={[]}
        canDecide={canDecideExceptions}
        canCorrectAttendance={canCorrectAttendance}
        parentAccessAllowed={false}
      />
    )
  }

  const result = await runTimeClockPageQuery("exceptions", organizationId, () =>
    listTimeClockExceptionsForOrg(organizationId, { state: "submitted" })
  )

  return (
    <TimeClockExceptionsSection
      rows={result.ok ? result.value : []}
      canDecide={canDecideExceptions}
      canCorrectAttendance={canCorrectAttendance}
      parentAccessAllowed={canRead}
      loadError={result.ok ? undefined : loadFailed}
    />
  )
}
