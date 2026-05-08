/**
 * Drizzle Kit applies migrations listed in drizzle/meta/_journal.json only.
 * Every drizzle/NNNN_*.sql file must have a matching journal entry (same tag,
 * contiguous idx). See AGENTS.md (Drizzle migrations) and Context7 /drizzle-team docs.
 */
import fs from "node:fs"
import path from "node:path"

const root = path.join(import.meta.dirname, "..")
const drizzleDir = path.join(root, "drizzle")
const journalPath = path.join(drizzleDir, "meta", "_journal.json")

const TOP_LEVEL_SQL_RE = /^(\d{4})_[a-z0-9_]+\.sql$/i

function fail(message) {
  console.error(`[check-drizzle-journal] ${message}`)
  process.exit(1)
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

  console.log(
    `[check-drizzle-journal] OK — ${sqlFiles.length} migration(s) aligned with _journal.json`
  )
}

main()
