/**
 * AGENTS/rules contract enforcement (mechanical, CI-safe).
 *
 * Fails fast when architecture governance is weakened or violated.
 */
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const root = path.join(import.meta.dirname, "..")

const REQUIRED_FILES = [
  "AGENTS.md",
  ".cursor/rules/agents-md-mandatory.mdc",
  ".cursor/rules/design-system-enforcement.mdc",
  ".cursor/rules/design-system-docs-enforcement.mdc",
  ".cursor/rules/i18n-directory.mdc",
  "eslint.config.mjs",
  "scripts/check-design-contract.mjs",
]

const DUMP_DIR_NAMES = new Set([
  "tmp",
  "temp",
  "misc",
  "stuff",
  "backup",
  "backups",
  "new",
  "test2",
  "sandbox",
  "junk",
  "wip",
])

const TOP_LEVEL_DIR_ALLOWLIST = new Set([
  ".agents",
  ".cursor",
  ".cursor-plugin",
  ".github",
  ".vscode",
  "app",
  "components",
  "docs",
  "drizzle",
  "hooks",
  "i18n",
  "lib",
  "messages",
  "public",
  "scripts",
  "tests",
])

const ROOT_RUNTIME_FILES = new Set([
  "AGENTS.md",
  "README.md",
  "proxy.ts",
  "instrumentation.ts",
  "next.config.ts",
  "next-env.d.ts",
  "vercel.json",
])

const ROOT_TOOLING_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "eslint.config.mjs",
  "prettier.config.mjs",
  ".prettierrc",
  ".prettierignore",
  "postcss.config.mjs",
  "drizzle.config.ts",
  "vitest.config.ts",
  "vitest.setup.ts",
  "playwright.config.ts",
  "components.json",
  ".gitignore",
  ".node-version",
  ".nvmrc",
])

const ROOT_WORKSPACE_FILES = new Set([
  ".cursorignore",
  ".editorconfig",
  ".env.config.example",
  ".gitattributes",
  "skills-lock.json",
])

const TOP_LEVEL_FILE_ALLOWLIST = new Set([
  ...ROOT_RUNTIME_FILES,
  ...ROOT_TOOLING_FILES,
  ...ROOT_WORKSPACE_FILES,
])

const ALLOWED_MODULE_ROOT_ENTRIES = new Set([
  "actions",
  "data",
  "components",
  "schemas",
  "constants.ts",
  "types.ts",
  "index.ts",
  "README.md",
])

const CODE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/
const DEEP_FEATURE_IMPORT_RE = /from\s+["']#features\/([^/"']+)\/[^"']+["']/g

let failed = false

function fail(message) {
  failed = true
  console.error(`[agent-contract] ${message}`)
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel))
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8")
}

function posixRel(absPath) {
  return path.relative(root, absPath).split(path.sep).join("/")
}

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absPath = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(absPath))
    else if (entry.isFile() && CODE_EXT_RE.test(entry.name)) out.push(absPath)
  }
  return out
}

function assertRequiredFiles() {
  for (const rel of REQUIRED_FILES) {
    if (!exists(rel)) {
      fail(`required contract file missing: ${rel}`)
    }
  }
}

function assertRuleStrength() {
  if (!exists(".cursor/rules/agents-md-mandatory.mdc")) return
  if (!exists("eslint.config.mjs")) return

  const mandatory = read(".cursor/rules/agents-md-mandatory.mdc")
  const eslintConfig = read("eslint.config.mjs")

  if (!/alwaysApply:\s*true/.test(mandatory)) {
    fail("agents-md-mandatory.mdc must keep alwaysApply: true")
  }
  if (!/#features\/\*\/\*/.test(eslintConfig)) {
    fail("eslint must restrict deep feature imports (#features/*/*)")
  }
}

function assertNoDumpDirsAtRoot() {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith(".")) continue
    if (DUMP_DIR_NAMES.has(entry.name.toLowerCase())) {
      fail(`forbidden dumping directory at repo root: ${entry.name}/`)
    }
  }
}

function getAddedPathsFromGitDiff() {
  try {
    const baseRef = process.env.GITHUB_BASE_REF
    const cmd = baseRef
      ? `git diff --name-only --diff-filter=A origin/${baseRef}...HEAD`
      : "git diff --name-only --diff-filter=A HEAD~1...HEAD"
    const out = execSync(cmd, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function assertNoNewDumpDirsInDiff() {
  const addedPaths = getAddedPathsFromGitDiff()
  for (const relPath of addedPaths) {
    const topLevel = relPath.split("/")[0]
    if (DUMP_DIR_NAMES.has(topLevel.toLowerCase())) {
      fail(`new forbidden top-level directory introduced in diff: ${topLevel}/`)
    }
  }
}

function assertNoUnexpectedTopLevelDirsInDiff() {
  const addedPaths = getAddedPathsFromGitDiff()
  const seenDirs = new Set()

  for (const relPath of addedPaths) {
    const parts = relPath.split("/")
    if (parts.length < 2) continue
    const topLevel = parts[0]
    if (seenDirs.has(topLevel)) continue
    seenDirs.add(topLevel)

    if (!TOP_LEVEL_DIR_ALLOWLIST.has(topLevel)) {
      fail(
        `new top-level directory is not allowlisted: ${topLevel}/ (update TOP_LEVEL_DIR_ALLOWLIST in scripts/check-agent-contract.mjs if intentional)`
      )
    }
  }
}

function assertNoUnexpectedTopLevelFilesInDiff() {
  const addedPaths = getAddedPathsFromGitDiff()
  const seenFiles = new Set()

  for (const relPath of addedPaths) {
    const parts = relPath.split("/")
    if (parts.length !== 1) continue
    const rootFile = parts[0]
    if (seenFiles.has(rootFile)) continue
    seenFiles.add(rootFile)

    if (!TOP_LEVEL_FILE_ALLOWLIST.has(rootFile)) {
      fail(
        `new root file is not allowlisted: ${rootFile} (update TOP_LEVEL_FILE_ALLOWLIST in scripts/check-agent-contract.mjs if intentional)`
      )
    }
  }
}

function assertModuleRootShape() {
  const featuresRoot = path.join(root, "lib", "features")
  if (!fs.existsSync(featuresRoot)) return

  for (const moduleEntry of fs.readdirSync(featuresRoot, {
    withFileTypes: true,
  })) {
    if (!moduleEntry.isDirectory()) continue
    const modulePath = path.join(featuresRoot, moduleEntry.name)
    const moduleRel = posixRel(modulePath)

    const entries = fs.readdirSync(modulePath, { withFileTypes: true })
    const names = entries.map((entry) => entry.name)

    if (!names.includes("index.ts")) {
      fail(`missing required module public door: ${moduleRel}/index.ts`)
    }

    for (const entry of entries) {
      const name = entry.name
      if (!ALLOWED_MODULE_ROOT_ENTRIES.has(name)) {
        fail(
          `forbidden module root entry in ${moduleRel}: ${name} (allowed: actions, data, components, schemas, constants.ts, types.ts, index.ts, README.md)`
        )
      }
    }
  }
}

function assertNoDeepFeatureImports() {
  const scanDirs = ["app", "components", "hooks", "lib"]
  const files = scanDirs.flatMap((dir) => walk(path.join(root, dir)))

  for (const absPath of files) {
    const rel = posixRel(absPath)
    const text = fs.readFileSync(absPath, "utf8")
    const lines = text.split("\n")

    lines.forEach((line, index) => {
      DEEP_FEATURE_IMPORT_RE.lastIndex = 0
      const match = DEEP_FEATURE_IMPORT_RE.exec(line)
      if (!match) return
      const importedModule = match[1]
      const fromModuleMatch = rel.match(/^lib\/features\/([^/]+)\//)
      const fromModule = fromModuleMatch ? fromModuleMatch[1] : null
      const isCrossModule = fromModule !== null && fromModule !== importedModule
      const isOutsideFeatures = fromModule === null

      if (isOutsideFeatures || isCrossModule) {
        fail(
          `deep feature import violation at ${rel}:${index + 1} -> ${line.trim()}`
        )
      }
    })
  }
}

assertRequiredFiles()
assertRuleStrength()
assertNoDumpDirsAtRoot()
assertNoNewDumpDirsInDiff()
assertNoUnexpectedTopLevelDirsInDiff()
assertNoUnexpectedTopLevelFilesInDiff()
assertModuleRootShape()
assertNoDeepFeatureImports()

if (failed) {
  console.error(`
Contract failed.
- Keep AGENTS.md + .cursor/rules authoritative and strict.
- Import features via #features/<module> only.
- Keep repo/module roots clean (no dumping dirs, no extra module-root categories).
`)
  process.exit(1)
}
