import type { StatCardConfiguration } from "#features/governed-surface"

export const SHELL_PREVIEW_STAT_CARDS = {
  stats: [
    {
      label: "Total employees",
      value: "248",
      delta: "+3 this week",
      tone: "positive",
    },
    {
      label: "Open positions",
      value: "12",
      delta: "4 urgent",
      tone: "attention",
    },
    {
      label: "Payroll this month",
      value: "$1.2M",
      delta: "On track",
      tone: "default",
    },
    {
      label: "Compliance items",
      value: "3",
      delta: "2 overdue",
      tone: "critical",
    },
  ],
} as const satisfies StatCardConfiguration
