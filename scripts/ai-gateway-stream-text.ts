/**
 * Smoke test: Vercel AI Gateway + AI SDK `streamText` (string model id).
 *
 * Requires `AI_GATEWAY_API_KEY` in `.env.local` (see `.env.config.example` §C.1).
 *
 * Run: `pnpm ai:gateway:smoke`
 */
import dotenv from "dotenv"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { streamText } from "ai"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
dotenv.config({ path: resolve(root, ".env.local") })

if (!process.env.AI_GATEWAY_API_KEY?.trim()) {
  console.error(
    "Missing AI_GATEWAY_API_KEY. Add it to .env.local (e.g. from Vercel → AI Gateway)."
  )
  process.exit(1)
}

const prompt =
  process.argv.slice(2).join(" ") || "Say hello in one short sentence."

const result = streamText({
  model: "openai/gpt-5.4",
  prompt,
})

process.stdout.write("stream: ")
for await (const delta of result.textStream) {
  process.stdout.write(delta)
}
process.stdout.write("\n")

console.error("[token usage]", await result.usage)
