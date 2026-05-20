/**
 * Canonical paths under `.artifacts/` (gitignored). Keeps ad-hoc output out of repo root.
 */
import fs from "node:fs"
import path from "node:path"

export const ARTIFACTS_ROOT = ".artifacts"

export const ARTIFACTS_LOGS_DIR = `${ARTIFACTS_ROOT}/logs`
export const ARTIFACTS_REPORTS_DIR = `${ARTIFACTS_ROOT}/reports`

export const PLAYWRIGHT_DIR = `${ARTIFACTS_ROOT}/playwright`
export const PLAYWRIGHT_JUNIT_PATH = `${PLAYWRIGHT_DIR}/junit.xml`
export const PLAYWRIGHT_TEST_RESULTS_DIR = `${PLAYWRIGHT_DIR}/test-results`

/** @deprecated Use PLAYWRIGHT_JUNIT_PATH — migrated on `ensure-artifacts-layout`. */
export const PLAYWRIGHT_JUNIT_LEGACY_PATH = `${ARTIFACTS_ROOT}/playwright-junit.xml`

const REPORT_BASENAMES = new Set([
  "ask-docs-quality-audit.txt",
  "typecheck-parity-report.txt",
  "tsgo-pilot-report.txt",
  "vitest-failures.txt",
  "vitest-import-durations.txt",
  "vitest-report.json",
  "vitest-junit.xml",
  "cursor-lint-queue.txt",
  "knip-output.txt",
])

/**
 * @param {string} root Repo root (absolute).
 * @param  {...string} segments Path segments under `.artifacts/`.
 */
export function artifactsPath(root, ...segments) {
  return path.join(root, ARTIFACTS_ROOT, ...segments)
}

/**
 * @param {string} root
 * @param {string} basename
 */
export function artifactsReportPath(root, basename) {
  return artifactsPath(root, "reports", basename)
}

/**
 * @param {string} root
 * @param {string} basename
 */
export function artifactsLogPath(root, basename) {
  return artifactsPath(root, "logs", basename)
}

/**
 * @param {string} root
 */
export function ensureArtifactsSubdirs(root) {
  const dirs = [
    ARTIFACTS_LOGS_DIR,
    ARTIFACTS_REPORTS_DIR,
    PLAYWRIGHT_DIR,
    PLAYWRIGHT_TEST_RESULTS_DIR,
    `${ARTIFACTS_ROOT}/coverage`,
    `${ARTIFACTS_ROOT}/vitest-vite`,
    `${ARTIFACTS_ROOT}/vitest-reports`,
    `${ARTIFACTS_ROOT}/.tsbuildinfo`,
    `${ARTIFACTS_ROOT}/types`,
  ]
  for (const rel of dirs) {
    fs.mkdirSync(path.join(root, rel), { recursive: true })
  }
}

/**
 * Moves legacy flat files from `.artifacts/` root into `logs/` or `reports/`.
 * @param {string} root
 */
export function migrateLegacyFlatArtifacts(root) {
  const artifactsDir = path.join(root, ARTIFACTS_ROOT)
  if (!fs.existsSync(artifactsDir)) {
    return
  }

  const legacyJunit = path.join(artifactsDir, "playwright-junit.xml")
  const targetJunit = path.join(root, PLAYWRIGHT_JUNIT_PATH)
  if (fs.existsSync(legacyJunit)) {
    fs.mkdirSync(path.dirname(targetJunit), { recursive: true })
    if (!fs.existsSync(targetJunit)) {
      fs.renameSync(legacyJunit, targetJunit)
    } else {
      fs.rmSync(legacyJunit, { force: true })
    }
  }

  for (const entry of fs.readdirSync(artifactsDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue
    }
    const name = entry.name
    const from = path.join(artifactsDir, name)

    if (name.endsWith(".log")) {
      const to = artifactsLogPath(root, name)
      moveFileIfAbsent(from, to)
      continue
    }

    if (REPORT_BASENAMES.has(name)) {
      const to = artifactsReportPath(root, name)
      moveFileIfAbsent(from, to)
    }
  }
}

/**
 * @param {string} from
 * @param {string} to
 */
function moveFileIfAbsent(from, to) {
  if (!fs.existsSync(from)) {
    return
  }
  fs.mkdirSync(path.dirname(to), { recursive: true })
  if (!fs.existsSync(to)) {
    fs.renameSync(from, to)
  } else {
    fs.rmSync(from, { force: true })
  }
}
