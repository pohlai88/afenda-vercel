import "server-only"

import {
  buildNexusPressureListSurfaceConfiguration,
  buildNexusPriorityLanesListSurfaceConfiguration,
  buildNexusResolutionsListSurfaceConfiguration,
} from "#features/nexus/server"

import type {
  OperationalPressureItem,
  PriorityLane,
  ResolutionEvent,
} from "#features/nexus"

const GALLERY_NEXUS_PRESSURE_ITEMS = [
  {
    id: "gallery-nexus-pressure-1",
    severity: "attention",
    title: "Payroll period awaiting approval",
    surface: "Workforce",
    reason: "Period in preparing state",
    evidenceCount: 1,
    stageBadge: null,
    primaryAction: {
      label: "Open payroll",
      command: "/o/demo/apps/hrm",
    },
  },
] as const satisfies readonly OperationalPressureItem[]

const GALLERY_NEXUS_PRIORITY_LANES = [
  {
    id: "gallery-lane-approvals",
    kind: "approvals",
    label: "Approvals",
    surface: "Orbit",
    count: 4,
    href: "/o/demo/apps/orbit",
  },
] as const satisfies readonly PriorityLane[]

const GALLERY_NEXUS_RESOLUTIONS = [
  {
    id: "gallery-resolution-1",
    what: "Leave request approved",
    consequence: "Balance updated for employee",
    surface: "Workforce",
    actorName: "Jordan Lee",
    resolvedAt: new Date(Date.now() - 3600_000).toISOString(),
    evidenceCount: 1,
    lynxAssisted: false,
    href: "/o/demo/apps/hrm",
  },
] as const satisfies readonly ResolutionEvent[]

export const GALLERY_NEXUS_PRESSURE_LIST =
  buildNexusPressureListSurfaceConfiguration(GALLERY_NEXUS_PRESSURE_ITEMS)

export const GALLERY_NEXUS_PRIORITY_LANES_LIST =
  buildNexusPriorityLanesListSurfaceConfiguration(GALLERY_NEXUS_PRIORITY_LANES)

export const GALLERY_NEXUS_RESOLUTIONS_LIST =
  buildNexusResolutionsListSurfaceConfiguration(GALLERY_NEXUS_RESOLUTIONS)
