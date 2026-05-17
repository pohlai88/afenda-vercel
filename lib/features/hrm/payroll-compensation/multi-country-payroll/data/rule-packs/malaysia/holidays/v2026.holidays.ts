/**
 * Malaysia Public Holidays 2026 — Federal and per-state calendar.
 *
 * Source: Jabatan Perisytiharan Negara (JPN) gazette; state gazetted calendars.
 *
 * Structure:
 *   - Each entry declares `stateCodes`: an empty array [] means FEDERAL
 *     (applies to all states), a non-empty array restricts to those states.
 *   - State codes follow ISO 3166-2:MY convention:
 *       MY-JHR  Johor          MY-KDH  Kedah         MY-KTN  Kelantan
 *       MY-MLK  Melaka         MY-NSN  Negeri Sembilan MY-PHG Pahang
 *       MY-PRK  Perak          MY-PLS  Perlis         MY-PNG  Penang
 *       MY-SBH  Sabah          MY-SWK  Sarawak        MY-SGR  Selangor
 *       MY-TRG  Terengganu     MY-KUL  Kuala Lumpur (WP) MY-LBN  Labuan (WP)
 *       MY-PJY  Putrajaya (WP)
 *
 * NOTE: Dates for Islamic calendar holidays are estimated based on lunar
 * calculations for 2026. Actual dates may differ by 1 day depending on
 * moon sighting. Production implementations should sync from JAKIM's
 * annual gazette once published.
 *
 * Rule-pack version: MY-HOLIDAY-2026
 */

export const HOLIDAYS_2026_CODE = "MY-HOLIDAY-2026" as const

export type MalaysiaHolidayEntry = {
  readonly date: string // "YYYY-MM-DD"
  readonly nameEn: string
  readonly nameMy: string
  /** Empty array = all states (federal). Non-empty = restricted to listed states. */
  readonly stateCodes: readonly string[]
}

/**
 * Malaysia public holidays 2026.
 *
 * Federal holidays (stateCodes: []) apply to all states.
 * State-specific entries are restricted to the listed state codes.
 * Some states add their own King / Sultan birthdays — the most common
 * are included; consult the state gazettes for the full list.
 */
export const MALAYSIA_HOLIDAYS_2026: readonly MalaysiaHolidayEntry[] = [
  // ── Fixed federal holidays ────────────────────────────────────────────────
  {
    date: "2026-01-01",
    nameEn: "New Year's Day",
    nameMy: "Tahun Baru",
    // Does NOT apply to Johor, Kedah, Kelantan, Perlis, Terengganu
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
    date: "2026-01-29",
    nameEn: "Chinese New Year (Day 1)",
    nameMy: "Tahun Baru Cina (Hari Pertama)",
    stateCodes: [],
  },
  {
    date: "2026-01-30",
    nameEn: "Chinese New Year (Day 2)",
    nameMy: "Tahun Baru Cina (Hari Kedua)",
    stateCodes: [],
  },
  {
    date: "2026-02-01",
    nameEn: "Federal Territory Day",
    nameMy: "Hari Wilayah Persekutuan",
    stateCodes: ["MY-KUL", "MY-LBN", "MY-PJY"],
  },
  {
    date: "2026-03-06",
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
    date: "2026-03-20",
    nameEn: "Hari Raya Aidilfitri (Day 1) — est.",
    nameMy: "Hari Raya Aidilfitri (Hari Pertama)",
    stateCodes: [],
  },
  {
    date: "2026-03-21",
    nameEn: "Hari Raya Aidilfitri (Day 2) — est.",
    nameMy: "Hari Raya Aidilfitri (Hari Kedua)",
    stateCodes: [],
  },
  {
    date: "2026-02-19",
    nameEn: "Thaipusam",
    nameMy: "Thaipusam",
    stateCodes: ["MY-KUL", "MY-PRK", "MY-PNG", "MY-SGR"],
  },
  {
    date: "2026-05-01",
    nameEn: "Labour Day",
    nameMy: "Hari Pekerja",
    stateCodes: [],
  },
  {
    date: "2026-05-12",
    nameEn: "Wesak Day",
    nameMy: "Hari Wesak",
    stateCodes: [],
  },
  {
    date: "2026-06-16",
    nameEn: "Awal Muharram — est.",
    nameMy: "Awal Muharram (Maal Hijrah)",
    stateCodes: [],
  },
  {
    date: "2026-05-27",
    nameEn: "Hari Raya Aidiladha — est.",
    nameMy: "Hari Raya Aidiladha",
    stateCodes: [],
  },
  {
    date: "2026-06-01",
    nameEn: "Yang di-Pertuan Agong's Birthday",
    nameMy: "Hari Keputeraan Yang di-Pertuan Agong",
    stateCodes: [],
  },
  {
    date: "2026-08-31",
    nameEn: "National Day (Merdeka Day)",
    nameMy: "Hari Kebangsaan",
    stateCodes: [],
  },
  {
    date: "2026-09-04",
    nameEn: "Prophet Muhammad's Birthday — est.",
    nameMy: "Hari Keputeraan Nabi Muhammad SAW",
    stateCodes: [],
  },
  {
    date: "2026-09-16",
    nameEn: "Malaysia Day",
    nameMy: "Hari Malaysia",
    stateCodes: [],
  },
  {
    date: "2026-10-20",
    nameEn: "Deepavali — est.",
    nameMy: "Hari Deepavali",
    stateCodes: [], // federal (except Sarawak officially; included here for payroll purposes)
  },
  {
    date: "2026-12-25",
    nameEn: "Christmas Day",
    nameMy: "Hari Krismas",
    stateCodes: [],
  },

  // ── Selected state-specific King/Sultan birthdays ─────────────────────────
  {
    date: "2026-04-26",
    nameEn: "Sultan of Terengganu's Birthday",
    nameMy: "Hari Keputeraan Sultan Terengganu",
    stateCodes: ["MY-TRG"],
  },
  {
    date: "2026-06-10",
    nameEn: "Yang di-Pertua Negeri Sabah's Birthday",
    nameMy: "Hari Keputeraan Yang di-Pertua Negeri Sabah",
    stateCodes: ["MY-SBH"],
  },
  {
    date: "2026-07-07",
    nameEn: "Sultan of Selangor's Birthday",
    nameMy: "Hari Keputeraan Sultan Selangor",
    stateCodes: ["MY-SGR"],
  },
  {
    date: "2026-07-17",
    nameEn: "Penang Governor's Birthday",
    nameMy: "Hari Keputeraan Yang di-Pertua Negeri Pulau Pinang",
    stateCodes: ["MY-PNG"],
  },
  {
    date: "2026-08-24",
    nameEn: "Melaka Governor's Birthday",
    nameMy: "Hari Keputeraan Yang di-Pertua Negeri Melaka",
    stateCodes: ["MY-MLK"],
  },
  {
    date: "2026-09-24",
    nameEn: "Johor Royal Anniversary",
    nameMy: "Hari Thaipusam / Hari Kebesaran Johor",
    stateCodes: ["MY-JHR"],
  },
]

/**
 * Return holiday dates applicable to a given year and set of state codes.
 *
 * @param year       Full year (e.g. 2026). Must match this file.
 * @param stateCodes ISO 3166-2:MY codes for the employee's work state.
 *                   Pass `["MY-KUL"]` for Kuala Lumpur employees, etc.
 * @returns Array of "YYYY-MM-DD" strings for holidays applicable to those states.
 */
export function getHolidaysV2026(
  year: number,
  stateCodes: readonly string[]
): string[] {
  if (year !== 2026) {
    throw new Error(
      `holidays/v2026 only covers year 2026; requested year=${year}`
    )
  }

  return MALAYSIA_HOLIDAYS_2026.filter((h) => {
    // Federal (applies everywhere)
    if (h.stateCodes.length === 0) return true
    // State-specific — check intersection
    return stateCodes.some((s) => h.stateCodes.includes(s))
  }).map((h) => h.date)
}

/** Count holidays for a given state set (used by golden tests). */
export function countHolidaysV2026(stateCodes: readonly string[]): number {
  return getHolidaysV2026(2026, stateCodes).length
}
