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
  ".cursor/rules/never-restore-deleted-components.mdc",
  ".cursor/rules/design-system.mdc",
  ".cursor/rules/i18n-directory.mdc",
  ".cursor/rules/lynx-knowledge.mdc",
  ".cursor/rules/erp-primitives.mdc",
  ".cursor/rules/planner-directory.mdc",
  ".cursor/rules/simulation-directory.mdc",
  ".cursor/rules/shell-directory.mdc",
  ".cursor/rules/portal-directory.mdc",
  ".cursor/rules/module-client-server-barrels.mdc",
  "docs/decisions/0030-module-client-server-barrel-boundary.md",
  "eslint.config.mjs",
  "scripts/check-design-contract.mjs",
  "scripts/check-route-error-files.mjs",
  "scripts/check-public-lynx-contract.mjs",
  ".cursor/rules/public-lynx.mdc",
  ".cursor/rules/governed-renderer-contract.mdc",
  "scripts/check-renderer-contracts.mjs",
  "tests/unit/fixtures-i18n-parity.test.ts",
  "turbo.json",
  "turbo/generators/config.ts",
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
  ".config",
  ".cursor",
  ".cursor-plugin",
  ".github",
  ".husky",
  ".vscode",
  ".source",
  "app",
  "components2",
  "docs",
  "drizzle",
  "hooks",
  "i18n",
  "lib",
  "messages",
  "public",
  "scripts",
  "tests",
  "turbo",
  "content",
])

const ROOT_RUNTIME_FILES = new Set([
  "AGENTS.md",
  "README.md",
  "proxy.ts",
  "instrumentation.ts",
  "instrumentation-client.ts",
  "instrumentation.node.ts",
  "pyrightconfig.json",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
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
  ".prettierignore",
  "postcss.config.mjs",
  "scripts/check-drizzle-journal.mjs",
  "components.json",
  ".gitignore",
  ".node-version",
  ".nvmrc",
  ".lintstagedrc.json",
  "turbo.json",
  "turbo/generators/config.ts",
  "source.config.ts",
  "cli.json",
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

const DEFAULT_ALLOWED_MODULE_ROOT_ENTRIES = new Set([
  "actions",
  "data",
  "components",
  "schemas",
  "constants.ts",
  "types.ts",
  "index.ts",
  "server.ts",
  "client.ts",
  "README.md",
])

const MODULE_ROOT_ENTRY_ALLOWLISTS = new Map([
  [
    "hrm",
    new Set([
      ...DEFAULT_ALLOWED_MODULE_ROOT_ENTRIES,
      "employee-management",
      "industry-specific-hrm",
      "payroll-compensation",
      "talent-management",
      "time-attendance",
      "_hrm_landing_page",
      "_internal-cross-cutting",
      "_module-governance",
      "hrm-dashboard-path.shared.ts",
    ]),
  ],
  [
    "planner",
    new Set([
      "domain",
      "data",
      "server",
      "server.ts",
      "client",
      "scheduling",
      "recurrence",
      "worklog",
      "filters",
      "views",
      "integrations",
      "audit",
      "relations",
      "commands",
      "policies",
      "automation",
      "signals",
      "ranking",
      "timeline",
      "pressure",
      "intelligence",
      "evidence",
      "triage",
      "constants.ts",
      "types.ts",
      "index.ts",
      "README.md",
      "planner-dashboard-path.shared.ts",
    ]),
  ],
  [
    "tools",
    new Set([
      ...DEFAULT_ALLOWED_MODULE_ROOT_ENTRIES,
      "bulk-csv-import",
      "electronic-signatures",
      "_module-governance",
    ]),
  ],
])

/** Cross-boundary deep imports documented in AGENTS.md §6.2 (not module barrels). */
function isAllowedDeepFeatureImport(importedModule, subpath) {
  if (importedModule === "hrm" && subpath === "hrm-dashboard-path.shared") {
    return true
  }
  if (importedModule === "planner" && subpath === "planner-dashboard-path.shared") {
    return true
  }
  if (
    importedModule === "governed-surface" &&
    (subpath.startsWith("schemas/") || subpath.startsWith("components/"))
  ) {
    return true
  }
  return false
}

const CODE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/
/** Second segment `server` / `client` are allowed composition barrels. */
const DEEP_FEATURE_IMPORT_RE =
  /from\s+["']#features\/([^/"']+)\/(.+?)["']/g

/** AGENTS.md §6.1 — only these files may live at lib/*.ts / lib/*.tsx root. */
const LIB_ROOT_ALLOWLIST = new Set([
  "auth-client.ts",
  "auth-client-neon-compat.ts",
  "org-apps-module-paths.ts",
  "design-system.ts",
  "logger.server.ts",
  "session-cache.ts",
  "site.ts",
  "utils.ts",
])

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

function assertRepoRootComponentsDeleted() {
  const legacyComponents = path.join(root, "components")
  if (fs.existsSync(legacyComponents)) {
    fail(
      "repo-root components/ must not exist (hard-deleted). Delete the directory and fix imports to components2/ — see .cursor/rules/never-restore-deleted-components.mdc"
    )
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

  if (exists(".cursor/rules/never-restore-deleted-components.mdc")) {
    const neverRestore = read(".cursor/rules/never-restore-deleted-components.mdc")
    if (!/alwaysApply:\s*true/.test(neverRestore)) {
      fail("never-restore-deleted-components.mdc must keep alwaysApply: true")
    }
  }

  if (!/#features\/\*\/actions/.test(eslintConfig)) {
    fail(
      "eslint must restrict deep feature imports (explicit #features/*/… patterns)"
    )
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

function shouldRunGitDiffContractChecks() {
  return Boolean(process.env.GITHUB_ACTIONS || process.env.GITHUB_BASE_REF)
}

function getAddedPathsFromGitDiff() {
  if (!shouldRunGitDiffContractChecks()) {
    return []
  }
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

    if (topLevel === "components") {
      fail(
        "repo-root components/ is hard-deleted — do not add files under components/ (fix imports to components2/). See .cursor/rules/never-restore-deleted-components.mdc"
      )
    }

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

    const allowedEntries =
      MODULE_ROOT_ENTRY_ALLOWLISTS.get(moduleEntry.name) ??
      DEFAULT_ALLOWED_MODULE_ROOT_ENTRIES

    for (const entry of entries) {
      const name = entry.name
      const isContractTs =
        entry.isFile() &&
        name.endsWith(".contract.ts") &&
        /^[a-z0-9][a-z0-9-]*\.contract\.ts$/.test(name)
      if (!allowedEntries.has(name) && !isContractTs) {
        fail(
          `forbidden module root entry in ${moduleRel}: ${name} (allowed: ${[...allowedEntries].join(", ")}, *.contract.ts)`
        )
      }
    }
  }
}

function assertLibRootAllowlist() {
  const libRoot = path.join(root, "lib")
  if (!fs.existsSync(libRoot)) return

  const onDisk = []
  for (const entry of fs.readdirSync(libRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    if (!/\.tsx?$/.test(entry.name)) continue
    onDisk.push(entry.name)
    if (!LIB_ROOT_ALLOWLIST.has(entry.name)) {
      fail(
        `forbidden lib root file: lib/${entry.name} (nest under a §6.2 subtree; only AGENTS.md §6.1 files may live at lib/ root)`
      )
    }
  }

  for (const name of LIB_ROOT_ALLOWLIST) {
    if (!fs.existsSync(path.join(libRoot, name))) {
      fail(`AGENTS.md §6.1 allowlisted file missing on disk: lib/${name}`)
    }
  }

  if (onDisk.length !== LIB_ROOT_ALLOWLIST.size) {
    fail(
      `lib/ root must contain exactly ${LIB_ROOT_ALLOWLIST.size} allowlisted .ts/.tsx files (found ${onDisk.length}: ${onDisk.sort().join(", ")})`
    )
  }
}

function assertAgentsLibRootTableParity() {
  if (!exists("AGENTS.md")) return
  const agents = read("AGENTS.md")
  for (const name of LIB_ROOT_ALLOWLIST) {
    if (!agents.includes(`| \`${name}\` |`)) {
      fail(`AGENTS.md §6.1 table missing row for lib/${name}`)
    }
  }
}

const SERVER_FEATURE_INDEX_IMPORT_RE =
  /from\s+["']#features\/([^/"']+)["']/g

const CLIENT_FILE_RE = /\.client\.(ts|tsx)$/

function isClientSourceFile(rel) {
  if (CLIENT_FILE_RE.test(rel)) return true
  if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) return false
  const abs = path.join(root, rel)
  try {
    const head = fs.readFileSync(abs, "utf8").slice(0, 400)
    return /^\s*["']use client["']/.test(head)
  } catch {
    return false
  }
}

/** @see docs/decisions/0030-module-client-server-barrel-boundary.md */
function featureIndexLooksServerOnly(moduleName) {
  const indexPath = path.join(root, "lib/features", moduleName, "index.ts")
  if (!fs.existsSync(indexPath)) return false
  const content = fs.readFileSync(indexPath, "utf8")
  if (/import\s+["']server-only["']/.test(content)) return true
  if (/from\s+["']\.\/data\//.test(content)) return true
  if (/from\s+["'][^"']*\.server["']/.test(content)) return true
  const componentExportRe = /from\s+["']\.\/components\/([^"']+)["']/g
  let match
  while ((match = componentExportRe.exec(content)) !== null) {
    const comp = match[1]
    if (comp.includes(".client")) continue
    const compPath = path.join(
      root,
      "lib/features",
      moduleName,
      "components",
      comp.endsWith(".tsx") || comp.endsWith(".ts") ? comp : `${comp}.tsx`
    )
    if (!fs.existsSync(compPath)) continue
    const compContent = fs.readFileSync(compPath, "utf8")
    if (/import\s+["']server-only["']/.test(compContent)) return true
  }
  return false
}

function assertNoServerFeatureBarrelInClientFiles() {
  const scanDirs = ["app", "lib/features", "components2", "hooks"]
  const files = scanDirs
    .flatMap((dir) => walk(path.join(root, dir)))
    .map((absPath) => posixRel(absPath))
    .filter((rel) => isClientSourceFile(rel))

  for (const rel of files) {
    const content = read(rel)
    SERVER_FEATURE_INDEX_IMPORT_RE.lastIndex = 0
    let match
    while ((match = SERVER_FEATURE_INDEX_IMPORT_RE.exec(content)) !== null) {
      const moduleName = match[1]
      if (!featureIndexLooksServerOnly(moduleName)) continue
      const line = content.slice(0, match.index).split("\n").length
      fail(
        `server feature barrel import in client file at ${rel}:${line} -> #features/${moduleName} (use #features/${moduleName}/client or ADR-0030)`
      )
    }
  }
}

function assertNoDeepFeatureImports() {
  const scanDirs = ["app", "components2", "hooks", "lib"]
  const files = scanDirs.flatMap((dir) => walk(path.join(root, dir)))

  for (const absPath of files) {
    const rel = posixRel(absPath)
    const text = fs.readFileSync(absPath, "utf8")
    const lines = text.split("\n")

    lines.forEach((line, index) => {
      let match
      DEEP_FEATURE_IMPORT_RE.lastIndex = 0
      while ((match = DEEP_FEATURE_IMPORT_RE.exec(line)) !== null) {
        const importedModule = match[1]
        const subpath = match[2]
        if (subpath === "server" || subpath === "client") continue
        if (isAllowedDeepFeatureImport(importedModule, subpath)) continue

        const fromModuleMatch = rel.match(/^lib\/features\/([^/]+)\//)
        const fromModule = fromModuleMatch ? fromModuleMatch[1] : null
        const isCrossModule =
          fromModule !== null && fromModule !== importedModule
        const isOutsideFeatures = fromModule === null

        if (isOutsideFeatures || isCrossModule) {
          fail(
            `deep feature import violation at ${rel}:${index + 1} -> ${line.trim()}`
          )
        }
      }
    })
  }
}

assertRequiredFiles()
assertRepoRootComponentsDeleted()
assertRuleStrength()
assertNoDumpDirsAtRoot()
assertNoNewDumpDirsInDiff()
assertNoUnexpectedTopLevelDirsInDiff()
assertNoUnexpectedTopLevelFilesInDiff()
assertModuleRootShape()
assertLibRootAllowlist()
assertAgentsLibRootTableParity()
assertNoDeepFeatureImports()
assertNoServerFeatureBarrelInClientFiles()

if (failed) {
  console.error(`
Contract failed.
- Keep AGENTS.md + .cursor/rules authoritative and strict.
- Import features via #features/<module>, #features/<module>/client (client islands), or #features/<module>/server (server-only).
- Keep repo/module roots clean (no dumping dirs, no extra module-root categories).
`)
  process.exit(1)
}
