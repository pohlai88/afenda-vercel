import net from "node:net"

function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const finish = (result: boolean) => {
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(750)
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false))
    socket.connect(port, "127.0.0.1")
  })
}

async function isAfendaDevServer(baseURL: string): Promise<boolean> {
  try {
    const signIn = await fetch(`${baseURL}/en/sign-in`, {
      redirect: "follow",
      signal: AbortSignal.timeout(5_000),
    })
    if (!(signIn.ok || signIn.status === 307 || signIn.status === 308)) {
      return false
    }

    // Port 3000 is often occupied by a hung process; require auth route to respond.
    const authProbe = await fetch(`${baseURL}/api/auth/get-session`, {
      signal: AbortSignal.timeout(5_000),
    })
    return authProbe.status < 500
  } catch {
    return false
  }
}

/**
 * Matches `.config/playwright.config.ts` — prefer explicit env, then local `pnpm dev` on 3000, else Playwright harness on 3001.
 */
export async function resolveE2EBaseURL(): Promise<string> {
  const configured =
    process.env.PLAYWRIGHT_BASE_URL?.trim() ||
    process.env.BASE_URL?.trim() ||
    ""
  if (configured.length > 0) return configured

  const isCi = ["1", "true", "yes"].includes(
    String(process.env.CI ?? "").toLowerCase()
  )
  const devUrl = "http://127.0.0.1:3000"
  if (!isCi && (await isPortListening(3000)) && (await isAfendaDevServer(devUrl))) {
    return devUrl
  }

  return "http://127.0.0.1:3001"
}
