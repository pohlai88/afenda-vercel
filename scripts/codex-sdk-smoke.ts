/**
 * Smoke test: Codex SDK via the repo's server-only helper.
 *
 * Requires `OPENAI_API_KEY` or `CODEX_API_KEY` in `.env.local`.
 *
 * Run: `pnpm codex:sdk:smoke "Summarize the current repo in one sentence."`
 */
import { resolveCodexApiKey, startCodexThread } from "#lib/codex/codex.shared"

const prompt =
  process.argv.slice(2).join(" ") ||
  "Reply with a single line that says Codex SDK is configured."

if (!resolveCodexApiKey()) {
  console.error(
    "Missing OPENAI_API_KEY or CODEX_API_KEY. Add one to .env.config, then run `pnpm env:sync`."
  )
  process.exit(1)
}

const thread = startCodexThread()
const turn = await thread.run(prompt)

process.stdout.write(`${turn.finalResponse}\n`)

if (thread.id) {
  console.error(`[thread] ${thread.id}`)
}

if (turn.usage) {
  console.error("[usage]", turn.usage)
}
