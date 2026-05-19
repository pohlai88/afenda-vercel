import type {
  HrmFwaArrangementKind,
  HrmFwaWorkMode,
} from "../schemas/fwa-workflow-state.shared"
import type { FwaSchedulePatternInput } from "../schemas/fwa.schema"

const WEEKDAY_INDICES = [1, 2, 3, 4, 5] as const

const OFFICE_CORE = {
  coreStart: "09:00",
  coreEnd: "17:00",
  expectedMinutes: 480,
} as const

const FLEXIBLE_HOURS = {
  coreStart: "10:00",
  coreEnd: "15:00",
  flexibleStart: "07:00",
  flexibleEnd: "19:00",
  expectedMinutes: 480,
} as const

const STAGGERED_EARLY = {
  coreStart: "07:00",
  coreEnd: "15:00",
  expectedMinutes: 480,
} as const

export function fwaStateLabelKey(state: string): string {
  return `stateLabels.${state}`
}

export function fwaArrangementKindLabel(kind: HrmFwaArrangementKind): string {
  const labels: Record<HrmFwaArrangementKind, string> = {
    hybrid: "Hybrid",
    remote: "Remote",
    compressed: "Compressed week",
    flexible_hours: "Flexible hours",
    staggered: "Staggered hours",
    part_time: "Part-time",
    temporary: "Temporary",
  }
  return labels[kind]
}

function officeDay(dayOfWeek: number): FwaSchedulePatternInput {
  return {
    dayOfWeek,
    workMode: "office",
    ...OFFICE_CORE,
  }
}

function remoteDay(dayOfWeek: number): FwaSchedulePatternInput {
  return {
    dayOfWeek,
    workMode: "remote",
    expectedMinutes: OFFICE_CORE.expectedMinutes,
  }
}

function restDay(dayOfWeek: number): FwaSchedulePatternInput {
  return { dayOfWeek, workMode: "rest" }
}

export function buildDefaultSchedulePatternForKind(
  arrangementKind: HrmFwaArrangementKind
): FwaSchedulePatternInput[] {
  switch (arrangementKind) {
    case "remote":
      return WEEKDAY_INDICES.map((dayOfWeek) => remoteDay(dayOfWeek))
    case "hybrid":
      return [
        officeDay(1),
        remoteDay(2),
        officeDay(3),
        remoteDay(4),
        officeDay(5),
      ]
    case "part_time":
      return [officeDay(1), officeDay(2), officeDay(3), restDay(4), restDay(5)]
    case "compressed":
      return [
        { ...officeDay(1), expectedMinutes: 600 },
        { ...officeDay(2), expectedMinutes: 600 },
        { ...officeDay(3), expectedMinutes: 600 },
        { ...officeDay(4), expectedMinutes: 600 },
        restDay(5),
      ]
    case "flexible_hours":
      return WEEKDAY_INDICES.map((dayOfWeek) => ({
        dayOfWeek,
        workMode: "office" as HrmFwaWorkMode,
        ...FLEXIBLE_HOURS,
      }))
    case "staggered":
      return WEEKDAY_INDICES.map((dayOfWeek) => ({
        dayOfWeek,
        workMode: "office" as HrmFwaWorkMode,
        ...STAGGERED_EARLY,
      }))
    default:
      return WEEKDAY_INDICES.map((dayOfWeek) => officeDay(dayOfWeek))
  }
}

export function formatFwaDateRange(input: {
  startDate: string
  endDate: string | null
}): string {
  if (!input.endDate || input.startDate === input.endDate) {
    return input.startDate
  }
  return `${input.startDate} → ${input.endDate}`
}
