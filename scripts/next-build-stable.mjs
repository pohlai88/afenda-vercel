/**
 * Serialize local `next build` executions and recover from stale `.next/lock`
 * files that can remain after interrupted Windows builds.
 *
 * The wrapper owns one workspace-scoped lock under `.artifacts/` and retries
 * once when Next exits with its "another build process is already running"
 * failure after worker processes have drained.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const artifactsDir = path.join(root, ".artifacts")
const runnerLockPath = path.join(artifactsDir, "next-build-runner.lock")
const nextLockPath = path.join(root, ".next", "lock")
const nextCliPath = path.join(
  root,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
)
const forwardedArgs = process.argv.slice(2)
const isWindows = process.platform === "win32"
const WAIT_INTERVAL_MS = 2_000
const WAIT_TIMEOUT_MS = 15 * 60 * 1_000
const BUILD_OUTPUT_MAX_BUFFER_BYTES = 32 * 1024 * 1024
const RETRYABLE_LOCK_MESSAGE = "Another next build process is already running."

fs.mkdirSync(artifactsDir, { recursive: true })

function normalizePathForMatch(value) {
  return value.replaceAll("\\", "/").toLowerCase()
}

const workspaceMatch = normalizePathForMatch(root)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch {
    return null
  }
}

function writeRunnerLock() {
  const fd = fs.openSync(runnerLockPath, "wx")
  const payload = JSON.stringify({
    pid: process.pid,
    createdAt: new Date().toISOString(),
  })
  fs.writeFileSync(fd, payload)
  fs.closeSync(fd)
}

function removeFileIfExists(filePath) {
  try {
    fs.rmSync(filePath, { force: true })
  } catch {}
}

async function acquireRunnerLock() {
  const deadline = Date.now() + WAIT_TIMEOUT_MS

  while (true) {
    try {
      writeRunnerLock()
      return
    } catch (error) {
      if (error && error.code !== "EEXIST") {
        throw error
      }
    }

    const lockPayload = readJsonFile(runnerLockPath)
    const activePid = lockPayload?.pid
    if (!isProcessAlive(activePid)) {
      removeFileIfExists(runnerLockPath)
      continue
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `[next-build-stable] Timed out waiting for workspace build lock held by pid ${activePid}.`
      )
    }

    await sleep(WAIT_INTERVAL_MS)
  }
}

function listProcesses() {
  if (isWindows) {
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
      ],
      {
        cwd: root,
        encoding: "utf8",
      }
    )
    if (result.status !== 0 || !result.stdout.trim()) return []
    const parsed = JSON.parse(result.stdout)
    return (Array.isArray(parsed) ? parsed : [parsed]).map((row) => ({
      pid: Number(row.ProcessId),
      command: String(row.CommandLine ?? ""),
    }))
  }

  const result = spawnSync("ps", ["-ax", "-o", "pid=,command="], {
    cwd: root,
    encoding: "utf8",
  })
  if (result.status !== 0) return []

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.*)$/)
      return match
        ? { pid: Number(match[1]), command: match[2] }
        : { pid: -1, command: line }
    })
}

function isWorkspaceBuildProcess(command) {
  const normalized = normalizePathForMatch(command)
  if (!normalized.includes(workspaceMatch)) return false
  if (normalized.includes("getciminstance win32_process")) return false

  return (
    normalized.includes("next build") ||
    normalized.includes("/.next/build/") ||
    normalized.includes("\\.next\\build\\")
  )
}

function listWorkspaceBuildProcesses() {
  return listProcesses().filter((processInfo) => {
    if (processInfo.pid === process.pid) return false
    return isWorkspaceBuildProcess(processInfo.command)
  })
}

async function waitForWorkspaceBuildProcesses(label) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS

  while (true) {
    const active = listWorkspaceBuildProcesses()
    if (active.length === 0) return

    if (Date.now() >= deadline) {
      const ids = active.map((processInfo) => processInfo.pid).join(", ")
      throw new Error(
        `[next-build-stable] Timed out waiting for ${label}: ${ids}.`
      )
    }

    await sleep(WAIT_INTERVAL_MS)
  }
}

function clearStaleNextLock() {
  if (!fs.existsSync(nextLockPath)) return false
  removeFileIfExists(nextLockPath)
  return true
}

function runNextBuild() {
  const buildEnv = { ...process.env }
  if (!buildEnv.NODE_OPTIONS?.includes("--max-old-space-size")) {
    buildEnv.NODE_OPTIONS = [buildEnv.NODE_OPTIONS, "--max-old-space-size=8192"]
      .filter(Boolean)
      .join(" ")
  }

  return spawnSync(process.execPath, [nextCliPath, "build", ...forwardedArgs], {
    cwd: root,
    env: buildEnv,
    stdio: "pipe",
    encoding: "utf8",
    maxBuffer: BUILD_OUTPUT_MAX_BUFFER_BYTES,
  })
}

function flushBuildOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
}

function assertBuildProcessResult(result) {
  if (result.error) {
    throw result.error
  }

  if (result.signal) {
    throw new Error(
      `[next-build-stable] next build exited via signal ${result.signal}.`
    )
  }
}

function isRetryableLockFailure(result) {
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
  return combined.includes(RETRYABLE_LOCK_MESSAGE)
}

async function main() {
  await acquireRunnerLock()

  try {
    await waitForWorkspaceBuildProcesses("existing next build processes")

    if (clearStaleNextLock()) {
      console.warn("[next-build-stable] Removed stale .next/lock before build.")
    }

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = runNextBuild()
      flushBuildOutput(result)
      assertBuildProcessResult(result)

      if ((result.status ?? 1) === 0) {
        return
      }

      if (attempt === 1 && isRetryableLockFailure(result)) {
        await waitForWorkspaceBuildProcesses("draining next build workers")
        if (clearStaleNextLock()) {
          console.warn(
            "[next-build-stable] Cleared stale .next/lock after failed build attempt."
          )
        }
        continue
      }

      process.exit(result.status ?? 1)
    }

    process.exit(1)
  } finally {
    removeFileIfExists(runnerLockPath)
  }
}

await main()
