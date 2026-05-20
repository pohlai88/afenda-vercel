import "server-only"

import type { StatCardConfigurationInput } from "#features/governed-surface"
import type { GovernedChartConfigurationInput } from "#features/governed-surface/schemas/chart.schema"

import {
  formatAbsenceRatePercent,
  formatTrendDeltaPercent,
} from "./aat-analytics-engine.shared"
import type { AatOrgAnalyticsSnapshot } from "./aat-analytics.queries.server"

type AatKpiCopy = {
  absenceRate: string
  lostWorkdays: string
  absenceFrequency: string
  availability: string
  trend: string
  plannedVsUnplanned: string
  coverageRisk: string
  patternSignals: string
  trendDirectionLabel: string
  trendTone: "default" | "positive" | "attention"
}

export function buildAatKpiStatConfiguration(
  snapshot: AatOrgAnalyticsSnapshot,
  copy: AatKpiCopy
): StatCardConfigurationInput {
  return {
    stats: [
      {
        label: copy.absenceRate,
        value: formatAbsenceRatePercent(snapshot.absenceRate),
        delta: formatTrendDeltaPercent({
          currentRate: snapshot.absenceRate,
          priorRate: snapshot.priorAbsenceRate,
        }),
        tone:
          copy.trendTone === "positive"
            ? "positive"
            : copy.trendTone === "attention"
              ? "attention"
              : "default",
      },
      {
        label: copy.lostWorkdays,
        value: snapshot.lostWorkdays.toFixed(1),
        delta: `${snapshot.calendarDays} calendar days`,
        tone: "default",
      },
      {
        label: copy.absenceFrequency,
        value: String(snapshot.absenceFrequency),
        delta: `${snapshot.activeEmployeeCount} active employees`,
        tone: "default",
      },
      {
        label: copy.availability,
        value: formatAbsenceRatePercent(snapshot.availabilityRate),
        delta: snapshot.coverageRisk
          ? copy.coverageRisk
          : copy.trendDirectionLabel,
        tone: snapshot.coverageRisk ? "attention" : "positive",
      },
      {
        label: copy.plannedVsUnplanned,
        value: `${snapshot.plannedLostWorkdays.toFixed(1)} / ${snapshot.unplannedLostWorkdays.toFixed(1)}`,
        delta: copy.patternSignals,
        tone:
          snapshot.unplannedLostWorkdays > snapshot.plannedLostWorkdays
            ? "attention"
            : "default",
      },
    ],
  }
}

export function buildAatTrendChartConfiguration(
  snapshot: AatOrgAnalyticsSnapshot,
  title: string
): GovernedChartConfigurationInput {
  const points =
    snapshot.weeklyTrend.length > 0
      ? snapshot.weeklyTrend.map((point) => ({
          x: point.weekLabel,
          y: point.lostWorkdays,
        }))
      : [{ x: snapshot.range.startDate.slice(0, 7), y: 0 }]

  return {
    dataNature: "time-series",
    chartKind: "area",
    title,
    series: [
      {
        id: "lost-workdays",
        label: title,
        color: "chart-1",
        points,
      },
    ],
  }
}

export function buildAatDailyHeatmapChartConfiguration(
  snapshot: AatOrgAnalyticsSnapshot,
  title: string
): GovernedChartConfigurationInput {
  const points =
    snapshot.dailyHeatmap.length > 0
      ? snapshot.dailyHeatmap.map((point) => ({
          x: point.date,
          y: point.lostWorkdays,
        }))
      : [{ x: snapshot.range.startDate, y: 0 }]

  return {
    dataNature: "categorical",
    chartKind: "bar",
    title,
    series: [
      {
        id: "daily-absence",
        label: title,
        color: "chart-2",
        points,
      },
    ],
  }
}
