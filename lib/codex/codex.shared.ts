import {
  Codex,
  type ApprovalMode,
  type CodexOptions,
  type ModelReasoningEffort,
  type SandboxMode,
  type ThreadOptions,
  type WebSearchMode,
} from "@openai/codex-sdk"

const APPROVAL_MODES = new Set<ApprovalMode>([
  "never",
  "on-request",
  "on-failure",
  "untrusted",
])

const SANDBOX_MODES = new Set<SandboxMode>([
  "read-only",
  "workspace-write",
  "danger-full-access",
])

const REASONING_EFFORTS = new Set<ModelReasoningEffort>([
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
])

const WEB_SEARCH_MODES = new Set<WebSearchMode>(["disabled", "cached", "live"])

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

function readBooleanEnv(name: string): boolean | undefined {
  const value = readEnv(name)
  if (!value) return undefined
  if (value === "1" || value.toLowerCase() === "true") return true
  if (value === "0" || value.toLowerCase() === "false") return false
  throw new Error(`${name} must be "1", "0", "true", or "false"`)
}

function readEnumEnv<T extends string>(
  name: string,
  allowed: ReadonlySet<T>
): T | undefined {
  const value = readEnv(name)
  if (!value) return undefined
  if (allowed.has(value as T)) return value as T
  throw new Error(`${name} must be one of: ${Array.from(allowed).join(", ")}`)
}

function readCsvEnv(name: string): string[] | undefined {
  const value = readEnv(name)
  if (!value) return undefined

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  return items.length > 0 ? items : undefined
}

export function resolveCodexApiKey(): string | undefined {
  return readEnv("CODEX_API_KEY") ?? readEnv("OPENAI_API_KEY")
}

export function createCodex(options: CodexOptions = {}): Codex {
  return new Codex({
    ...options,
    apiKey: options.apiKey ?? resolveCodexApiKey(),
    baseUrl: options.baseUrl ?? readEnv("CODEX_BASE_URL"),
  })
}

export function resolveDefaultCodexThreadOptions(): ThreadOptions {
  return {
    model: readEnv("CODEX_MODEL"),
    sandboxMode:
      readEnumEnv("CODEX_SANDBOX_MODE", SANDBOX_MODES) ?? "workspace-write",
    workingDirectory: readEnv("CODEX_WORKING_DIRECTORY") ?? process.cwd(),
    skipGitRepoCheck: readBooleanEnv("CODEX_SKIP_GIT_REPO_CHECK"),
    modelReasoningEffort: readEnumEnv(
      "CODEX_REASONING_EFFORT",
      REASONING_EFFORTS
    ),
    networkAccessEnabled: readBooleanEnv("CODEX_NETWORK_ACCESS_ENABLED"),
    webSearchMode:
      readEnumEnv("CODEX_WEB_SEARCH_MODE", WEB_SEARCH_MODES) ?? "disabled",
    approvalPolicy:
      readEnumEnv("CODEX_APPROVAL_POLICY", APPROVAL_MODES) ?? "never",
    additionalDirectories: readCsvEnv("CODEX_ADDITIONAL_DIRECTORIES"),
  }
}

export function startCodexThread(options: ThreadOptions = {}) {
  return createCodex().startThread({
    ...resolveDefaultCodexThreadOptions(),
    ...options,
  })
}

export function resumeCodexThread(id: string, options: ThreadOptions = {}) {
  return createCodex().resumeThread(id, {
    ...resolveDefaultCodexThreadOptions(),
    ...options,
  })
}
