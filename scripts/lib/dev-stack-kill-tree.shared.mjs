import { spawnSync } from "node:child_process"

/**
 * @param {import('node:child_process').ChildProcess} child
 */
export function killProcessTree(child) {
  if (!child.pid) {
    try {
      child.kill("SIGTERM")
    } catch {
      /* ignore */
    }
    return
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: true,
    })
    return
  }

  try {
    child.kill("SIGTERM")
  } catch {
    /* ignore */
  }
}
