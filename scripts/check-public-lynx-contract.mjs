/**
 * Public Lynx (Ask Lynx) — mechanical contract for the public docs chat stack.
 *
 * Prevents:
 *  - Routing public chat through ERP Lynx (`#features/lynx`)
 *  - IAM / tenant session usage on the public boundary
 *  - Unbounded POST bodies (`req.json()` bypass)
 *  - Duplicated transcript helpers in the UI shell
 *
 * @see .cursor/rules/public-lynx.mdc
 * @see AGENTS.md §5 — Public Lynx / app/api/chat
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const CHAT_ROUTE_REL = "app/api/chat/route.ts"
const SEARCH_UI_REL = "components/ai/search.tsx"

/** Files and dirs scanned for forbidden ERP Lynx / IAM coupling. */
const PUBLIC_LYNX_SCAN_RELS = [
  CHAT_ROUTE_REL,
  SEARCH_UI_REL,
  "components/ai/public-lynx-fab-drag.ts",
  "components/ai/ask-lynx-tooltip.tsx",
  "lib/ask-docs/lynx-brand.shared.ts",
]

const FORBIDDEN_IMPORT_RE =
  /\bfrom\s+["'](#features\/lynx(?:\/[^"']*)?|lib\/features\/lynx(?:\/[^"']*)?)["']|\bimport\s+["'](#features\/lynx|lib\/features\/lynx)["']/

const FORBIDDEN_IAM_RE =
  /\b(requireOrgSession|requireSignedInSession|getOrgTenantContext|writeIamAuditEvent|writeIamAuditEventFromNextHeaders)\b/

let failed = false

function fail(message) {
  failed = true
  console.error(`check-public-lynx-contract: ${message}`)
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8")
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel))
}

function listPublicLynxLibFiles() {
  const dir = path.join(root, "lib", "ask-docs")
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(
      (name) =>
        name.startsWith("public-lynx") &&
        (name.endsWith(".ts") || name.endsWith(".tsx"))
    )
    .map((name) => `lib/ask-docs/${name}`)
}

function assertRequiredSurfacesExist() {
  for (const rel of [CHAT_ROUTE_REL, SEARCH_UI_REL]) {
    if (!exists(rel)) {
      fail(`missing Public Lynx surface: ${rel}`)
    }
  }
}

function assertNoForbiddenImportsInSurfaces() {
  const rels = [...PUBLIC_LYNX_SCAN_RELS, ...listPublicLynxLibFiles()]
  for (const rel of rels) {
    if (!exists(rel)) continue
    const text = read(rel)
    if (FORBIDDEN_IMPORT_RE.test(text)) {
      fail(
        `${rel} must not import ERP Lynx (#features/lynx). Public Lynx uses lib/ask-docs/public-lynx* and Vercel AI SDK only.`
      )
    }
  }
}

function assertChatRouteInvariants() {
  if (!exists(CHAT_ROUTE_REL)) return
  const text = read(CHAT_ROUTE_REL)

  if (FORBIDDEN_IAM_RE.test(text)) {
    fail(
      `${CHAT_ROUTE_REL} must not call IAM session or audit helpers — Public Lynx is unauthenticated.`
    )
  }

  if (!text.includes("readPublicLynxChatRequestBody")) {
    fail(
      `${CHAT_ROUTE_REL} must parse POST bodies via readPublicLynxChatRequestBody (raw size cap before JSON.parse).`
    )
  }

  if (/\breq\.json\s*\(/.test(text)) {
    fail(
      `${CHAT_ROUTE_REL} must not use req.json() — use readPublicLynxChatRequestBody so PUBLIC_LYNX_MAX_RAW_BODY_CHARS is enforced.`
    )
  }

  if (!text.includes("checkPublicLynxRateLimit")) {
    fail(
      `${CHAT_ROUTE_REL} must call checkPublicLynxRateLimit before streaming.`
    )
  }

  if (!text.includes("hasAiGatewayAuth")) {
    fail(
      `${CHAT_ROUTE_REL} must gate on hasAiGatewayAuth from #lib/ai/gateway.server (AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN).`
    )
  }

  if (
    !text.includes("resolveLanguageModelWithFallback") &&
    !text.includes("resolveLanguageModel")
  ) {
    fail(
      `${CHAT_ROUTE_REL} must resolve models via resolveLanguageModelWithFallback (#lib/ai/model-policy.server) or resolveLanguageModel (#lib/ai/gateway.server).`
    )
  }

  if (/@ai-sdk\/openai/.test(text) || /\bopenai\s*\(/.test(text)) {
    fail(
      `${CHAT_ROUTE_REL} must not import @ai-sdk/openai or call openai() — use Vercel AI Gateway only.`
    )
  }
}

function assertSearchUiUsesSharedTranscript() {
  if (!exists(SEARCH_UI_REL)) return
  const text = read(SEARCH_UI_REL)

  if (!text.includes("buildPublicLynxConversationTranscript")) {
    fail(
      `${SEARCH_UI_REL} must import buildPublicLynxConversationTranscript from #lib/ask-docs/public-lynx-transcript.shared (no local duplicate).`
    )
  }

  if (/function\s+buildConversationTranscript\b/.test(text)) {
    fail(
      `${SEARCH_UI_REL} must not define a local buildConversationTranscript — use buildPublicLynxConversationTranscript.`
    )
  }

  if (!text.includes("extractPublicLynxMessageText")) {
    fail(
      `${SEARCH_UI_REL} must use extractPublicLynxMessageText from #lib/ask-docs/public-lynx-message-parts.shared.`
    )
  }
}

function assertSharedRequestExports() {
  const rel = "lib/ask-docs/public-lynx-request.shared.ts"
  if (!exists(rel)) {
    fail(`missing ${rel}`)
    return
  }
  const text = read(rel)
  for (const symbol of [
    "readPublicLynxChatRequestBody",
    "parsePublicLynxChatRequestBodyText",
    "parsePublicLynxChatRequest",
  ]) {
    if (!text.includes(symbol)) {
      fail(`${rel} must export ${symbol}`)
    }
  }
}

function assertVitestScriptsUseCanonicalConfig() {
  const pkgPath = path.join(root, "package.json")
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
  const canonical = "--config .config/vitest.config.ts"

  for (const [name, script] of Object.entries(pkg.scripts ?? {})) {
    if (typeof script !== "string" || !script.includes("vitest")) continue
    if (!script.includes(canonical)) {
      fail(
        `package.json script "${name}" invokes vitest without ${canonical} — bare vitest skips server-only/next stubs and causes false failures (ADR-0008).`
      )
    }
  }

  for (const name of [
    "vitest.config.ts",
    "vitest.config.mjs",
    "vitest.config.js",
  ]) {
    if (exists(name)) {
      fail(
        `forbidden root ${name} — canonical Vitest config is .config/vitest.config.ts only (ADR-0008).`
      )
    }
  }
}

assertRequiredSurfacesExist()
assertNoForbiddenImportsInSurfaces()
assertChatRouteInvariants()
assertSearchUiUsesSharedTranscript()
assertSharedRequestExports()
assertVitestScriptsUseCanonicalConfig()

if (failed) {
  console.error(`
Public Lynx contract failed.
- Public chat: app/api/chat/route.ts + #components/ai/search on /{locale}/ask-docs
- Never import #features/lynx or call IAM guards on this surface
- Run unit tests via pnpm test:fast (includes --config .config/vitest.config.ts)
- See .cursor/rules/public-lynx.mdc and AGENTS.md §5
`)
  process.exit(1)
}
