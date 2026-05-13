/**
 * Malaysia Public Holidays 2027 — Federal and selected state entries.
 *
 * Source policy matches `v2026.holidays.ts`: fixed dates from civil calendar;
 * Islamic / lunar rows remain **estimates** until JAKIM / JPN gazette — replace
 * with gazetted dates during the annual statutory table bump (see
 * `docs/_draft/malaysia-statutory-calendar-ops.md`).
 *
 * Rule-pack version: MY-HOLIDAY-2027
 */

import type { MalaysiaHolidayEntry } from "./v2026.holidays"

export const HOLIDAYS_2027_CODE = "MY-HOLIDAY-2027" as const

/**
 * Malaysia public holidays 2027 (baseline for leave / attendance planning).
 */
export const MALAYSIA_HOLIDAYS_2027: readonly MalaysiaHolidayEntry[] = [
  {
    date: "2027-01-01",
    nameEn: "New Year's Day",
    nameMy: "Tahun Baru",
    stateCodes: [
      "MY-MLK",
      "MY-NSN",
      "MY-PHG",
      "MY-PRK",
      "MY-PNG",
      "MY-SBH",
      "MY-SWK",
      "MY-SGR",
      "MY-KUL",
      "MY-LBN",
      "MY-PJY",
    ],
  },
  {
    date: "2027-01-28",
    nameEn: "Chinese New Year (Day 1)",
    nameMy: "Tahun Baru Cina (Hari Pertama)",
    stateCodes: [],
  },
  {
    date: "2027-01-29",
    nameEn: "Chinese New Year (Day 2)",
    nameMy: "Tahun Baru Cina (Hari Kedua)",
    stateCodes: [],
  },
  {
    date: "2027-02-01",
    nameEn: "Federal Territory Day",
    nameMy: "Hari Wilayah Persekutuan",
    stateCodes: ["MY-KUL", "MY-LBN", "MY-PJY"],
  },
  {
    date: "2027-02-08",
    nameEn: "Thaipusam — est.",
    nameMy: "Thaipusam",
    stateCodes: ["MY-KUL", "MY-PRK", "MY-PNG", "MY-SGR"],
  },
  {
    date: "2027-02-26",
    nameEn: "Nuzul Al-Quran — est.",
    nameMy: "Nuzul Al-Quran",
    stateCodes: [
      "MY-KDH",
      "MY-KTN",
      "MY-PHG",
      "MY-PRK",
      "MY-PLS",
      "MY-PNG",
      "MY-SGR",
      "MY-TRG",
      "MY-KUL",
      "MY-PJY",
    ],
  },
  {
    date: "2027-03-19",
    nameEn: "Hari Raya Aidilfitri (Day 1) — est.",
    nameMy: "Hari Raya Aidilfitri (Hari Pertama)",
    stateCodes: [],
  },
  {
    date: "2027-03-20",
    nameEn: "Hari Raya Aidilfitri (Day 2) — est.",
    nameMy: "Hari Raya Aidilfitri (Hari Kedua)",
    stateCodes: [],
  },
  {
    date: "2027-05-01",
    nameEn: "Labour Day",
    nameMy: "Hari Pekerja",
    stateCodes: [],
  },
  {
    date: "2027-05-03",
    nameEn: "Wesak Day — est.",
    nameMy: "Hari Wesak",
    stateCodes: [],
  },
  {
    date: "2027-05-26",
    nameEn: "Hari Raya Aidiladha — est.",
    nameMy: "Hari Raya Aidiladha",
    stateCodes: [],
  },
  {
    date: "2027-06-07",
    nameEn: "Yang di-Pertuan Agong's Birthday",
    nameMy: "Hari Keputeraan Yang di-Pertuan Agong",
    stateCodes: [],
  },
  {
    date: "2027-06-16",
    nameEn: "Awal Muharram — est.",
    nameMy: "Awal Muharram (Maal Hijrah)",
    stateCodes: [],
  },
  {
    date: "2027-08-31",
    nameEn: "National Day (Merdeka Day)",
    nameMy: "Hari Kebangsaan",
    stateCodes: [],
  },
  {
    date: "2027-09-16",
    nameEn: "Malaysia Day",
    nameMy: "Hari Malaysia",
    stateCodes: [],
  },
  {
    date: "2027-09-24",
    nameEn: "Prophet Muhammad's Birthday — est.",
    nameMy: "Hari Keputeraan Nabi Muhammad SAW",
    stateCodes: [],
  },
  {
    date: "2027-10-18",
    nameEn: "Deepavali — est.",
    nameMy: "Hari Deepavali",
    stateCodes: [],
  },
  {
    date: "2027-12-25",
    nameEn: "Christmas Day",
    nameMy: "Hari Krismas",
    stateCodes: [],
  },
  {
    date: "2027-04-16",
    nameEn: "Sultan of Terengganu's Birthday — est.",
    nameMy: "Hari Keputeraan Sultan Terengganu",
    stateCodes: ["MY-TRG"],
  },
  {
    date: "2027-06-02",
    nameEn: "Yang di-Pertua Negeri Sabah's Birthday — est.",
    nameMy: "Hari Keputeraan Yang di-Pertua Negeri Sabah",
    stateCodes: ["MY-SBH"],
  },
  {
    date: "2027-06-26",
    nameEn: "Sultan of Selangor's Birthday — est.",
    nameMy: "Hari Keputeraan Sultan Selangor",
    stateCodes: ["MY-SGR"],
  },
  {
    date: "2027-07-10",
    nameEn: "Penang Governor's Birthday — est.",
    nameMy: "Hari Keputeraan Yang di-Pertua Negeri Pulau Pinang",
    stateCodes: ["MY-PNG"],
  },
  {
    date: "2027-08-23",
    nameEn: "Melaka Governor's Birthday — est.",
    nameMy: "Hari Keputeraan Yang di-Pertua Negeri Melaka",
    stateCodes: ["MY-MLK"],
  },
]

export function getHolidaysV2027(
  year: number,
  stateCodes: readonly string[]
): string[] {
  if (year !== 2027) {
    throw new Error(
      `holidays/v2027 only covers year 2027; requested year=${year}`
    )
  }

  return MALAYSIA_HOLIDAYS_2027.filter((h) => {
    if (h.stateCodes.length === 0) return true
    return stateCodes.some((s) => h.stateCodes.includes(s))
  }).map((h) => h.date)
}

export function countHolidaysV2027(stateCodes: readonly string[]): number {
  return getHolidaysV2027(2027, stateCodes).length
}
