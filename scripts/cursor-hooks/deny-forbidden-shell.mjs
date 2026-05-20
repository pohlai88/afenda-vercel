#!/usr/bin/env node
/**
 * Cursor `beforeShellExecution` hook — mechanical enforcement of AGENTS.md.
 *
 * - PRIORITY #1: Drizzle ledger / DB destructive commands
 * - §2 Human approval for full commands: agents cannot run L2/L3 full gates
 *
 * Reference: https://cursor.com/docs/agent/hooks
 */
import process from "node:process"
import {
  FULL_COMMAND_KEYS,
  FULL_COMMAND_META,
} from "../lib/human-full-commands.shared.mjs"

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
    pattern: /AFENDA_SKIP_FULL_VERIFY_CONFIRM/i,
    reason:
      "Agents must not bypass human full-command approval (AGENTS.md §2).",
    fix: "Use L0: pnpm gate -- <touched-paths> and pnpm gate:typecheck.",
  },
  {
    pattern: /\bnode\s+scripts[\\/]confirm-human-full\.mjs\b/i,
    reason:
      "Full commands require a human terminal — agents must not invoke the confirm script directly.",
    fix: "Use L0 gates. Human runs pnpm gate:push in an interactive terminal.",
  },
]

for (const key of FULL_COMMAND_KEYS) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const short = key === "lint" ? "lint" : null
  const patterns = [
    new RegExp(`\\bpnpm\\s+run\\s+${escaped}\\b`, "i"),
    new RegExp(`\\bpnpm\\s+${escaped}\\b`, "i"),
  ]
  if (short) {
    patterns.push(/\bpnpm\s+lint\b(?!:)/i)
    patterns.push(/\bpnpm\s+run\s+lint\b(?!:)/i)
  }
  for (const pattern of patterns) {
    if (key === "lint" && pattern.source.includes("lint:full")) continue
    DENY_PATTERNS.push({
      pattern,
      reason: `pnpm ${key} is a FULL command (${FULL_COMMAND_META[key]?.tier ?? "L2"}) — human approval required (AGENTS.md §2).`,
      fix: `Use: ${FULL_COMMAND_META[key]?.l0 ?? "pnpm gate -- <touched-paths>"}. Human runs ${key} once before push.`,
    })
  }
}

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
      respond({
        permission: "deny",
        userMessage: message,
        agentMessage: message,
      })
    }
  }

  respond({ permission: "allow" })
} catch (error) {
  process.stderr.write(
    `[deny-forbidden-shell] hook error: ${error instanceof Error ? error.message : String(error)}\n`
  )
  respond({ permission: "allow" })
}
