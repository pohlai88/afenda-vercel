/**
 * Serialize local `next build` executions and recover from stale `.next/lock`
 * files that can remain after interrupted Windows builds.
 *
 * The wrapper owns one workspace-scoped lock under `.artifacts/` and retries
 * once when Next exits with its "another build process is already running"
 * failure after worker processes have drained.
 *
 * Use `spawn()` rather than `spawnSync()` so the wrapper can forward signals
 * and tear down the entire build process tree when the parent is interrupted.
 */
import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const artifactsDir = path.join(root, ".artifacts")
const runnerLockPath = path.join(artifactsDir, "next-build-runner.lock")
const nextLockPath = path.join(root, ".next", "lock")
const nextDistPath = path.join(root, ".next")
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
const BUILD_OUTPUT_CAPTURE_MAX_BYTES = 1024 * 1024
const RETRYABLE_LOCK_MESSAGE = "Another next build process is already running."
const parentPid = process.ppid
let activeBuildChild = null
let cleanupRegistered = false
let parentWatchdog = null

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
    normalized.includes("next-build-stable") ||
    normalized.includes("next build") ||
    normalized.includes("/.next/build/") ||
    normalized.includes("\\.next\\build\\")
  )
}

// Detects every shape a `next dev` invocation can take inside this workspace.
// The substring "next dev" alone misses two real cases on Windows:
//   1. The Turbopack/Next worker that actually owns `.next/dev/` and binds the
//      port runs as `node …/next/dist/server/lib/start-server.js` — the
//      command line never contains the literal "next dev".
//   2. The package-manager shell wrapper (`pnpm run dev`, `npm run dev`, …)
//      stays alive as the parent of that worker and is what most editors
//      attach to. Catching it lets the wrapper fail fast with a useful pid.
function isWorkspaceDevProcess(command) {
  const normalized = normalizePathForMatch(command)
  if (!normalized.includes(workspaceMatch)) return false
  if (normalized.includes("getciminstance win32_process")) return false

  if (normalized.includes("next dev")) return true

  if (
    normalized.includes("/next/dist/server/lib/start-server.js") ||
    normalized.includes("\\next\\dist\\server\\lib\\start-server.js")
  ) {
    return true
  }

  return /\b(pnpm|npm|yarn|bun)\b[^"\n]*\brun\b\s+dev\b/.test(normalized)
}

function listWorkspaceBuildProcesses() {
  return listProcesses().filter((processInfo) => {
    if (processInfo.pid === process.pid) return false
    return isWorkspaceBuildProcess(processInfo.command)
  })
}

function listWorkspaceDevProcesses() {
  return listProcesses().filter((processInfo) => {
    if (processInfo.pid === process.pid) return false
    return isWorkspaceDevProcess(processInfo.command)
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

function removeNextDistDir() {
  try {
    fs.rmSync(nextDistPath, {
      force: true,
      recursive: true,
      maxRetries: 5,
      retryDelay: 200,
    })
  } catch (error) {
    throw new Error(
      `[next-build-stable] Failed to remove ${nextDistPath} before build: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

function appendCapturedOutput(current, chunk) {
  if (!chunk) return current
  const next = current + chunk
  if (next.length <= BUILD_OUTPUT_CAPTURE_MAX_BYTES) {
    return next
  }
  return next.slice(-BUILD_OUTPUT_CAPTURE_MAX_BYTES)
}

function terminateChildProcessTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return

  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], {
      cwd: root,
      stdio: "ignore",
    })
    return
  }

  try {
    process.kill(-pid, "SIGTERM")
  } catch {}
}

function registerBuildCleanup() {
  if (cleanupRegistered) return
  cleanupRegistered = true

  const cleanup = () => {
    if (parentWatchdog) {
      clearInterval(parentWatchdog)
      parentWatchdog = null
    }

    if (activeBuildChild?.pid) {
      terminateChildProcessTree(activeBuildChild.pid)
    }
    removeFileIfExists(runnerLockPath)
  }

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      cleanup()
      process.exit(130)
    })
  }

  process.on("exit", cleanup)

  parentWatchdog = setInterval(() => {
    if (!isProcessAlive(parentPid)) {
      cleanup()
      process.exit(130)
    }
  }, WAIT_INTERVAL_MS)
  parentWatchdog.unref?.()
}

function runNextBuild() {
  const buildEnv = { ...process.env }
  if (!buildEnv.NODE_OPTIONS?.includes("--max-old-space-size")) {
    buildEnv.NODE_OPTIONS = [buildEnv.NODE_OPTIONS, "--max-old-space-size=8192"]
      .filter(Boolean)
      .join(" ")
  }

  return new Promise((resolve, reject) => {
    let stdout = ""
    let stderr = ""

    const child = spawn(
      process.execPath,
      [nextCliPath, "build", ...forwardedArgs],
      {
        cwd: root,
        env: buildEnv,
        stdio: ["inherit", "pipe", "pipe"],
        detached: !isWindows,
      }
    )

    activeBuildChild = child
    registerBuildCleanup()

    child.stdout?.setEncoding("utf8")
    child.stderr?.setEncoding("utf8")

    child.stdout?.on("data", (chunk) => {
      stdout = appendCapturedOutput(stdout, chunk)
      process.stdout.write(chunk)
    })

    child.stderr?.on("data", (chunk) => {
      stderr = appendCapturedOutput(stderr, chunk)
      process.stderr.write(chunk)
    })

    child.once("error", (error) => {
      activeBuildChild = null
      reject(error)
    })

    child.once("close", (code, signal) => {
      activeBuildChild = null
      resolve({
        status: code,
        signal,
        stdout,
        stderr,
        error: null,
      })
    })
  })
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

    const activeDevProcesses = listWorkspaceDevProcesses()
    if (activeDevProcesses.length > 0) {
      const detail = activeDevProcesses
        .map((processInfo) => `pid ${processInfo.pid}: ${processInfo.command}`)
        .join("\n  ")
      throw new Error(
        `[next-build-stable] Refusing to run while workspace next dev is active. Stop the dev server first so build can own .next/.\n  ${detail}`
      )
    }

    // Next.js 16 on Windows can fail during its internal "clean" stage when a
    // prior interrupted build leaves a partially-owned `.next` tree behind.
    // Remove the dist dir ourselves so the actual build starts from a known
    // empty workspace and the wrapper, not Next internals, owns recovery.
    removeNextDistDir()

    if (clearStaleNextLock()) {
      console.warn("[next-build-stable] Removed stale .next/lock before build.")
    }

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = await runNextBuild()
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
