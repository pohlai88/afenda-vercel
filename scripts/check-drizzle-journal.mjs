/**
 * Drizzle Kit applies migrations listed in drizzle/meta/_journal.json only.
 * Every drizzle/NNNN_*.sql file must have a matching journal entry (same tag,
 * contiguous idx). Each journal tag must have drizzle/meta/NNNN_snapshot.json.
 * See ADR-0032, AGENTS.md PRIORITY #1, and .cursor/rules/drizzle-migration-ledger.mdc.
 */
import fs from "node:fs"
import path from "node:path"

const root = path.join(import.meta.dirname, "..")
const drizzleDir = path.join(root, "drizzle")
const metaDir = path.join(drizzleDir, "meta")
const journalPath = path.join(metaDir, "_journal.json")

const TOP_LEVEL_SQL_RE = /^(\d{4})_[a-z0-9_]+\.sql$/i
const SNAPSHOT_RE = /^(\d{4})_snapshot\.json$/i

function fail(message) {
  console.error(`[check-drizzle-journal] ${message}`)
  process.exit(1)
}

/**
 * @param {string[]} tagsFromJournal
 * @param {string} metaDirectory
 * @returns {Set<string>}
 */
function resolveKnownSnapshotGapPrefixes(tagsFromJournal, metaDirectory) {
  const gaps = new Set()
  const has0001 = tagsFromJournal.includes("0001_hrm_signature_ceremony")
  const has0002 = tagsFromJournal.includes("0002_uneven_retro_girl")
  if (!has0001 || !has0002) return gaps

  const snapshot0000Path = path.join(metaDirectory, "0000_snapshot.json")
  const snapshot0002Path = path.join(metaDirectory, "0002_snapshot.json")
  if (!fs.existsSync(snapshot0000Path) || !fs.existsSync(snapshot0002Path)) {
    return gaps
  }

  try {
    const snapshot0000 = JSON.parse(fs.readFileSync(snapshot0000Path, "utf8"))
    const snapshot0002 = JSON.parse(fs.readFileSync(snapshot0002Path, "utf8"))
    if (snapshot0002.prevId === snapshot0000.id) {
      gaps.add("0001")
    }
  } catch {
    return gaps
  }

  return gaps
}

function main() {
  if (!fs.existsSync(journalPath)) {
    fail(`missing ${path.relative(root, journalPath)}`)
  }

  let journal
  try {
    journal = JSON.parse(fs.readFileSync(journalPath, "utf8"))
  } catch (err) {
    fail(`invalid JSON in _journal.json: ${err}`)
  }

  const entries = journal.entries
  if (!Array.isArray(entries)) {
    fail('_journal.json: expected top-level "entries" array')
  }

  const sqlFiles = fs
    .readdirSync(drizzleDir)
    .filter((name) => TOP_LEVEL_SQL_RE.test(name))
    .sort((a, b) => {
      const na = Number.parseInt(a.slice(0, 4), 10)
      const nb = Number.parseInt(b.slice(0, 4), 10)
      return na - nb
    })

  const tagsFromFiles = sqlFiles.map((n) => n.replace(/\.sql$/i, ""))
  const tagsFromJournal = entries.map((e) => e.tag)

  if (tagsFromFiles.length !== tagsFromJournal.length) {
    fail(
      [
        `count mismatch: ${tagsFromFiles.length} top-level SQL file(s) vs ${tagsFromJournal.length} journal entr(y|ies).`,
        `  SQL (sorted): ${tagsFromFiles.join(", ") || "(none)"}`,
        `  journal tags: ${tagsFromJournal.join(", ") || "(none)"}`,
        "Add a journal row for each new drizzle/*.sql (or remove orphan SQL).",
        "Never hand-edit _journal.json — run pnpm db:generate from lib/db/schema.ts (ADR-0032).",
      ].join("\n")
    )
  }

  for (let i = 0; i < tagsFromFiles.length; i++) {
    const fileTag = tagsFromFiles[i]
    const journalTag = tagsFromJournal[i]
    if (fileTag !== journalTag) {
      fail(
        `tag mismatch at index ${i}: file "${sqlFiles[i]}" implies tag "${fileTag}" but journal has "${journalTag}"`
      )
    }
    if (entries[i].idx !== i) {
      fail(
        `journal entries[${i}].idx is ${entries[i].idx}, expected ${i} (contiguous from 0)`
      )
    }
  }

  const snapshotFiles = fs.existsSync(metaDir)
    ? fs.readdirSync(metaDir).filter((name) => SNAPSHOT_RE.test(name))
    : []

  const snapshotPrefixes = snapshotFiles.map((name) => {
    const match = SNAPSHOT_RE.exec(name)
    return match ? match[1] : name
  })

  const journalPrefixes = tagsFromJournal.map((tag) => tag.slice(0, 4))

  /** Pre-ADR-0032 ledger: 0001 SQL+journal exist but 0002_snapshot.prevId still points at 0000. */
  const snapshotGapPrefixes = resolveKnownSnapshotGapPrefixes(tagsFromJournal, metaDir)

  for (const prefix of journalPrefixes) {
    if (snapshotGapPrefixes.has(prefix)) {
      console.warn(
        `[check-drizzle-journal] WARN — known snapshot gap at ${prefix} (repair on next schema change via pnpm db:generate; see ADR-0032)`
      )
      continue
    }
    if (!snapshotPrefixes.includes(prefix)) {
      fail(
        [
          `missing snapshot for journal tag prefix ${prefix} (expected drizzle/meta/${prefix}_snapshot.json).`,
          "Run one clean pnpm db:generate after fixing lib/db/schema.ts — do not hand-create snapshots.",
        ].join("\n")
      )
    }
  }

  for (const prefix of snapshotPrefixes) {
    if (!journalPrefixes.includes(prefix)) {
      fail(
        `orphan snapshot drizzle/meta/${prefix}_snapshot.json with no matching journal tag (prefix ${prefix}).`
      )
    }
  }

  const expectedSnapshotCount =
    journalPrefixes.length - snapshotGapPrefixes.size
  if (snapshotPrefixes.length !== expectedSnapshotCount) {
    fail(
      `snapshot count mismatch: ${snapshotPrefixes.length} snapshot(s) vs ${expectedSnapshotCount} expected (${journalPrefixes.length} journal entr(y|ies), ${snapshotGapPrefixes.size} known gap(s)).`
    )
  }

  console.log(
    `[check-drizzle-journal] OK — ${sqlFiles.length} migration(s), ${snapshotPrefixes.length} snapshot(s) aligned with _journal.json` +
      (snapshotGapPrefixes.size > 0
        ? ` (${snapshotGapPrefixes.size} known snapshot gap(s))`
        : "")
  )
}

main()
