import { describe, expect, it } from "vitest"

import { parseListSurfaceRendererConfiguration } from "#features/governed-surface"
import { buildNexusPressureListSurfaceConfiguration } from "#features/nexus/server"

import type { OperationalPressureItem } from "#features/nexus"

const SAMPLE_PRESSURE = [
  {
    id: "p-1",
    severity: "critical",
    title: "Blocked payroll run",
    surface: "Workforce",
    reason: "Approval pending",
    evidenceCount: 2,
    stageBadge: { label: "Blocked", tone: "critical" },
    primaryAction: { label: "Review", command: "/o/acme/apps/hrm" },
  },
] as const satisfies readonly OperationalPressureItem[]

describe("buildNexusPressureListSurfaceConfiguration", () => {
  it("returns parseable list-surface configuration", () => {
    const config = buildNexusPressureListSurfaceConfiguration(SAMPLE_PRESSURE)
    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.rows).toHaveLength(1)
    expect(parsed.data.rows[0]?.linkColumnId).toBe("action")
  })

  it("empty pressure uses calm empty copy", () => {
    const config = buildNexusPressureListSurfaceConfiguration([])
    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.surface.empty?.title).toContain("calm")
  })
})
