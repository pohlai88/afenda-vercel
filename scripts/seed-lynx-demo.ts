/**
 * Seeds org-scoped rows into `lynx_demo_unicorn` for the Lynx NL→SQL demo.
 *
 * Usage (after migration 0008):
 *   node scripts/with-env.mjs tsx scripts/seed-lynx-demo.ts <organizationId>
 *
 * The organization must already exist. Rows use ON CONFLICT DO NOTHING on
 * (organizationId, company).
 */
import { db } from "#lib/db"
import { lynxDemoUnicorn } from "#lib/db/schema"

const rows = [
  {
    company: "Acme Labs",
    valuation: "12.50",
    dateJoined: "2018-03-15",
    country: "United States",
    city: "San Francisco",
    industry: "enterprise tech",
    selectInvestors: "Sequoia, Founders Fund",
  },
  {
    company: "Northwind Health",
    valuation: "4.20",
    dateJoined: "2019-07-01",
    country: "United Kingdom",
    city: "London",
    industry: "healthcare & life sciences",
    selectInvestors: "Index Ventures",
  },
  {
    company: "Blue River Retail",
    valuation: "2.80",
    dateJoined: "2020-11-20",
    country: "United States",
    city: "Chicago",
    industry: "consumer & retail",
    selectInvestors: "Accel",
  },
  {
    company: "Atlas Finance",
    valuation: "18.00",
    dateJoined: "2017-05-10",
    country: "United States",
    city: "New York",
    industry: "financial services",
    selectInvestors: "a16z, Ribbit",
  },
  {
    company: "Signal Media",
    valuation: "6.40",
    dateJoined: "2021-02-28",
    country: "United States",
    city: "Los Angeles",
    industry: "media & entertainment",
    selectInvestors: "Lightspeed",
  },
  {
    company: "Ironworks Industrial",
    valuation: "3.10",
    dateJoined: "2016-09-12",
    country: "United States",
    city: "Detroit",
    industry: "industrials",
    selectInvestors: "Bessemer",
  },
  {
    company: "Shield Insurance",
    valuation: "9.75",
    dateJoined: "2015-12-01",
    country: "United States",
    city: "Boston",
    industry: "insurance",
    selectInvestors: "General Catalyst",
  },
  {
    company: "Zenith Enterprise",
    valuation: "22.30",
    dateJoined: "2014-04-22",
    country: "United States",
    city: "Seattle",
    industry: "enterprise tech",
    selectInvestors: "Greylock, IVP",
  },
] as const

async function main() {
  const organizationId = process.argv[2]?.trim()
  if (!organizationId) {
    console.error("Usage: tsx scripts/seed-lynx-demo.ts <organizationId>")
    process.exit(1)
  }

  let inserted = 0
  for (const row of rows) {
    const res = await db
      .insert(lynxDemoUnicorn)
      .values({
        organizationId,
        company: row.company,
        valuation: row.valuation,
        dateJoined: new Date(`${row.dateJoined}T12:00:00.000Z`),
        country: row.country,
        city: row.city,
        industry: row.industry,
        selectInvestors: row.selectInvestors,
      })
      .onConflictDoNothing({
        target: [lynxDemoUnicorn.organizationId, lynxDemoUnicorn.company],
      })
      .returning({ id: lynxDemoUnicorn.id })

    if (res.length > 0) inserted += 1
  }

  console.log(
    `Lynx demo: attempted ${rows.length} rows for org ${organizationId}; inserted ${inserted} new (rest already present).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
