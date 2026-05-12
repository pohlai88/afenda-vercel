/**
 * Auto-increment the next ADR number based on existing files under
 * `docs/decisions/`.
 *
 * ADR files are named `NNNN-<kebab-title>.md` (4-digit zero-padded number,
 * matching `0001-` … `0009-` and growing). Some ADRs use letter suffixes
 * (`0007a`, `0007b`) — those still parse as `0007` for the leading number
 * but reserve the slot; the next ADR is `0008` regardless.
 *
 * Returns the next free `NNNN` as a 4-digit string. Throws if `docs/decisions/`
 * is missing — the generator should fail loudly rather than guess `0001`.
 */
import fs from "node:fs"
import path from "node:path"

import { REPO_ROOT } from "./paths"

const ADR_FILENAME = /^(\d{4})[a-z]?-[a-z0-9-]+\.md$/

export function getNextAdrNumber(): string {
  const dir = path.join(REPO_ROOT, "docs", "decisions")
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(
      `getNextAdrNumber: docs/decisions/ not found at ${dir} — generator cannot resolve next ADR slot.`
    )
  }
  const files = fs.readdirSync(dir, { withFileTypes: true })
  let maxNumber = 0
  for (const entry of files) {
    if (!entry.isFile()) continue
    const match = ADR_FILENAME.exec(entry.name)
    if (!match) continue
    const num = parseInt(match[1] ?? "0", 10)
    if (!Number.isFinite(num)) continue
    if (num > maxNumber) maxNumber = num
  }
  const next = maxNumber + 1
  if (next > 9999) {
    throw new Error("getNextAdrNumber: ADR slot 9999 reached.")
  }
  return next.toString().padStart(4, "0")
}
