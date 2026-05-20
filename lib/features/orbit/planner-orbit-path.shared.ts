export const ORBIT_SURFACES = [
  "queue",
  "triage",
  "today",
  "timeline",
  "signals",
  "sessions",
  "links",
] as const

export type OrbitSurface = (typeof ORBIT_SURFACES)[number]

export {
  ORBIT_SURFACE_SEGMENTS,
  ORBIT_SURFACE_SEGMENT_SET,
  isOrbitSurfaceSegment,
  type OrbitSurfaceSegment,
} from "#lib/i18n/org-apps-route-segments.shared"
