import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  HRM_TCI_AUDIT,
  HRM_TCI_SPEC_MAP,
  listHrmTciSpecCodes,
  TCI_LIST_SURFACE_IDS,
  TCI_STAT_SURFACE_KEY,
} from "#features/hrm"
import {
  getDeviceAttendanceHoursForEmployeeDateRange,
  hasDevicePunchOnDate,
  ingestTimeClockBatch,
  listDevicePunchesForEmployeeDate,
  persistTimeClockPunch,
} from "#features/hrm/server"

const REPO_ROOT = process.cwd()
const TCI_ROOT = join(
  REPO_ROOT,
  "lib/features/hrm/time-attendance/time-clock-integration"
)

function readTciSource(relativePath: string): string {
  return readFileSync(join(TCI_ROOT, relativePath), "utf8")
}

describe("HRM time-clock integration contract", () => {
  it("maps HRM-TCI spec codes", () => {
    const codes = listHrmTciSpecCodes()
    expect(codes.length).toBeGreaterThanOrEqual(10)
    expect(HRM_TCI_SPEC_MAP["HRM-TCI-010"]).toBeDefined()
  })

  it("exposes stable governed surface keys", () => {
    expect(TCI_STAT_SURFACE_KEY).toBe("hrm:time-clock:kpi-summary")
    expect(TCI_LIST_SURFACE_IDS.devices).toBe("hrm:time-clock:devices")
  })

  it("uses erp.hrm.time_clock audit namespace", () => {
    expect(HRM_TCI_AUDIT.deviceCreate.startsWith("erp.hrm.time_clock")).toBe(
      true
    )
    expect(HRM_TCI_AUDIT.deviceRevoke.startsWith("erp.hrm.time_clock")).toBe(
      true
    )
    expect(HRM_TCI_AUDIT.exceptionApprove.startsWith("erp.hrm.time_clock")).toBe(
      true
    )
  })

  it("re-exports integration doors from #features/hrm/server", () => {
    expect(typeof persistTimeClockPunch).toBe("function")
    expect(typeof ingestTimeClockBatch).toBe("function")
    expect(typeof listDevicePunchesForEmployeeDate).toBe("function")
    expect(typeof hasDevicePunchOnDate).toBe("function")
    expect(typeof getDeviceAttendanceHoursForEmployeeDateRange).toBe("function")
  })

  it("documents cron as sync watch (not vendor punch pull)", () => {
    const cronRoute = readFileSync(
      join(REPO_ROOT, "app/api/cron/hrm-time-clock-sync/route.ts"),
      "utf8"
    )
    expect(cronRoute).toContain("runTimeClockSyncWatchTick")
    expect(cronRoute).not.toContain("ingestTimeClockBatch")
  })

  it("persistTimeClockPunch returns duplicate status for batch ingest", () => {
    const source = readTciSource("data/tci-punch-commands.server.ts")
    expect(source).toContain('status: "duplicate"')
    expect(source).toContain("recordExceptionOnReject")
  })

  it("exposes ingest API key auth resolver", () => {
    const source = readTciSource("data/tci-ingest-auth.server.ts")
    expect(source).toContain("resolveTimeClockIngestActor")
    expect(source).toContain("HRM_TIME_CLOCK_INGEST_API_KEY")
    expect(source).toContain("integrationCredentialRef")
  })

  it("registers manual import adapter for org-admin CSV jobs", () => {
    const source = readTciSource("data/tci-manual-import.adapter.server.ts")
    expect(source).toContain('id: "hrm_time_clock_import"')
    expect(source).toContain("persistTimeClockPunch")
  })

  it("writes source: device only from persistTimeClockPunch", () => {
    const punchCommands = readTciSource("data/tci-punch-commands.server.ts")
    expect(punchCommands).toContain('source: "device"')

    const hrmTimeAttendanceDir = join(
      REPO_ROOT,
      "lib/features/hrm/time-attendance"
    )
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, {
        withFileTypes: true,
      })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === "time-clock-integration") continue
          walk(full)
        } else if (
          entry.name.endsWith(".ts") &&
          readFileSync(full, "utf8").includes('source: "device"')
        ) {
          offenders.push(full.replace(REPO_ROOT + "\\", "").replace(REPO_ROOT + "/", ""))
        }
      }
    }
    walk(hrmTimeAttendanceDir)
    expect(offenders).toEqual([])
  })
})
