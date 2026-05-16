/**
 * Smoke test: Vercel AI Gateway image output via Gemini “flash image” (language API + image modality).
 *
 * Model `google/gemini-3.1-flash-image-preview` is a **language** model on the gateway; use
 * `generateText` with `providerOptions.google.responseModalities` including `IMAGE`
 * (often needs `TEXT` as well for stable multimodal responses). Not `generateImage`.
 *
 * Requires `AI_GATEWAY_API_KEY` in `.env.local`.
 *
 * Run: `pnpm ai:gateway:image`
 * Optional: `pnpm ai:gateway:image "your prompt" ./out/custom.png`
 */
import dotenv from "dotenv"
import { mkdirSync, writeFileSync } from "node:fs"
import { basename, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { generateText } from "ai"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
dotenv.config({ path: resolve(root, ".env.local") })

const MODEL_ID = "google/gemini-3.1-flash-image-preview" as const

function extensionForMediaType(mediaType: string | undefined): string {
  if (!mediaType) return "bin"
  if (mediaType === "image/png") return "png"
  if (mediaType === "image/jpeg" || mediaType === "image/jpg") return "jpg"
  if (mediaType === "image/webp") return "webp"
  const sub = mediaType.split("/")[1]
  return sub?.replaceAll("+", "-") ?? "bin"
}

async function main() {
  const gatewayAuth =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim()

  if (!gatewayAuth) {
    console.error(
      "Missing AI Gateway credentials. Set AI_GATEWAY_API_KEY in .env.local or run vercel env pull for VERCEL_OIDC_TOKEN."
    )
    process.exit(1)
  }

  const prompt =
    process.argv[2]?.trim() ||
    "A minimal flat icon: a single red circle centered on a white background, no text."

  const outArg = process.argv[3]?.trim()
  const defaultDir = resolve(root, ".artifacts", "ai-gateway")
  const outPath =
    outArg && outArg.length > 0
      ? resolve(root, outArg)
      : resolve(defaultDir, `gemini-image-${Date.now()}.png`)

  mkdirSync(dirname(outPath), { recursive: true })

  const modalities = [
    { google: { responseModalities: ["TEXT", "IMAGE"] } },
    { google: { responseModalities: ["IMAGE"] } },
  ]

  let result = await generateText({
    model: MODEL_ID,
    prompt,
    providerOptions: modalities[0],
  })

  let file = result.files?.find((f) => f.mediaType?.startsWith("image/"))

  if (!file) {
    result = await generateText({
      model: MODEL_ID,
      prompt,
      providerOptions: modalities[1],
    })
    file = result.files?.find((f) => f.mediaType?.startsWith("image/"))
  }

  if (!file) {
    console.error(
      "No image file in response. files:",
      result.files?.length ?? 0,
      "text:",
      result.text?.slice(0, 200) || "(empty)"
    )
    if (process.env.DEBUG_AI_GATEWAY === "1") {
      console.error("result keys:", Object.keys(result))
    }
    process.exit(1)
  }

  const b64 =
    "base64Data" in file && typeof file.base64Data === "string"
      ? file.base64Data
      : null
  if (!b64) {
    console.error("Image file has no base64Data:", Object.keys(file))
    process.exit(1)
  }

  const ext = extensionForMediaType(file.mediaType)
  const finalPath =
    outPath.endsWith(`.${ext}`) || basename(outPath).includes(".")
      ? outPath
      : `${outPath}.${ext}`

  if (finalPath !== outPath) {
    mkdirSync(dirname(finalPath), { recursive: true })
  }

  writeFileSync(finalPath, Buffer.from(b64, "base64"))
  console.error("Wrote:", finalPath)
  console.error("[token usage]", result.usage)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
