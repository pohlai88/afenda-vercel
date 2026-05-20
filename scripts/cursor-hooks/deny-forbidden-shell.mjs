#!/usr/bin/env node
/**
 * Cursor `beforeShellExecution` hook — mechanical enforcement of AGENTS.md PRIORITY #1.
 *
 * Cursor invokes this on every Shell tool call. Hook reads a JSON payload from stdin
 * containing `{ command: string, ... }` and decides:
 *
 *   - allow → command runs (exit 0, empty stdout)
 *   - deny  → command blocked, agent sees the message (exit 0, JSON on stdout)
 *
 * Reference: https://cursor.com/docs/agent/hooks
 *
 * The denylist mirrors AGENTS.md PRIORITY #1 + the "Forbidden for agents" table.
 * Catching this at the shell layer is stricter than `scripts/forbid-db-push.mjs`
 * (which only blocks `pnpm db:push*` aliases) because it also catches raw
 * `drizzle-kit push`, hand-edit attempts to the journal, and nuke scripts.
 */
import process from "node:process"

const DENY_PATTERNS = [
  {
    pattern: /\bdrizzle-kit\s+push\b/i,
    reason:
      "drizzle-kit push bypasses drizzle/meta/_journal.json (AGENTS.md PRIORITY #1).",
    fix: "Use: pnpm db:generate → pnpm lint:drizzle-journal → pnpm db:migrate:local.",
  },
  {
    pattern: /\bpnpm\s+db:push(:local)?\b/i,
    reason: "pnpm db:push* is a hard-fail stub (ADR-0032).",
    fix: "Use the journal pipeline; never bypass the ledger.",
  },
  {
    pattern: /\bdrizzle-kit\s+migrate\b/i,
    reason:
      "Raw `drizzle-kit migrate` bypasses scripts/drizzle-migrate-logged.mjs guardrails.",
    fix: "Use: pnpm db:migrate:local",
  },
  {
    pattern: /\bnode\s+scripts[\\/]nuke-db-public\.mjs\b/i,
    reason:
      "Nuking the database is destructive and never agent-owned (AGENTS.md PRIORITY #1).",
    fix: "Do not reset the database. Fix the schema or migration ledger forward.",
  },
  {
    pattern: /\bmkdir\b[^\n]*\bcomponents\b(?![/\\]?2)/i,
    reason:
      "Repo-root components/ is hard-deleted (.cursor/rules/never-restore-deleted-components.mdc).",
    fix: "Use components2/ — never recreate components/.",
  },
  {
    pattern: /\b(rm|del|Remove-Item)\b[^\n]*drizzle[\\/]meta\b/i,
    reason:
      "Deleting drizzle/meta/ corrupts the migration ledger (AGENTS.md PRIORITY #1).",
    fix: "If a migration is wrong, revert the offending db:generate, not the meta folder.",
  },
  {
    pattern: /\bpnpm\s+(lint:full|lint)\b(?!.*--help)/i,
    reason:
      "pnpm lint:full is L2 — not for the edit loop (.cursor/rules/targeted-verification.mdc).",
    fix: "Use: pnpm gate -- <touched-paths>   (or pnpm lint:path -- <paths>)",
    severity: "warn", // soft warning; allow to proceed
  },
  {
    pattern: /\bpnpm\s+gate:push\b/i,
    reason: "pnpm gate:push is L2 (pre-push) — not for the edit loop.",
    fix: "Use: pnpm gate -- <touched-paths> after each task; gate:push only before pushing.",
    severity: "warn",
  },
]

function respond({ permission, userMessage, agentMessage }) {
  const payload = { permission }
  if (userMessage) payload.userMessage = userMessage
  if (agentMessage) payload.agentMessage = agentMessage
  process.stdout.write(JSON.stringify(payload))
  process.exit(0)
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let raw = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk) => {
      raw += chunk
    })
    process.stdin.on("end", () => resolve(raw))
    process.stdin.on("error", reject)
  })
}

try {
  const raw = await readStdin()
  if (!raw.trim()) {
    respond({ permission: "allow" })
  }

  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    respond({ permission: "allow" })
  }

  const command = String(payload?.command ?? "")
  if (!command) {
    respond({ permission: "allow" })
  }

  for (const rule of DENY_PATTERNS) {
    if (rule.pattern.test(command)) {
      const message = `[afenda hook] ${rule.reason}\n→ ${rule.fix}`
      if (rule.severity === "warn") {
        // Allow but surface the warning to the agent so it can self-correct next time.
        respond({
          permission: "allow",
          agentMessage: message,
        })
      }
      respond({
        permission: "deny",
        userMessage: message,
        agentMessage: message,
      })
    }
  }

  respond({ permission: "allow" })
} catch (error) {
  // Never break the agent loop on hook failure — log and allow.
  process.stderr.write(
    `[deny-forbidden-shell] hook error: ${error instanceof Error ? error.message : String(error)}\n`
  )
  respond({ permission: "allow" })
}
