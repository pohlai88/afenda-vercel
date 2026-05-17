export type ClientCookieSameSite = "Lax" | "Strict" | "None"

type ClientCookieOptions = {
  readonly name: string
  readonly value: string | number | boolean
  readonly maxAgeSeconds: number
  readonly path?: `/${string}`
  readonly sameSite?: ClientCookieSameSite
  readonly secure?: boolean
}

function shouldUseSecureCookie(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:"
}

export function buildClientCookieString({
  name,
  value,
  maxAgeSeconds,
  path = "/",
  sameSite = "Lax",
  secure = shouldUseSecureCookie(),
}: ClientCookieOptions): string {
  if (sameSite === "None" && !secure) {
    throw new Error("SameSite=None cookies must also use Secure.")
  }

  const parts = [
    `${name}=${encodeURIComponent(String(value))}`,
    `Path=${path}`,
    `Max-Age=${maxAgeSeconds}`,
    `SameSite=${sameSite}`,
  ]

  if (secure) {
    parts.push("Secure")
  }

  return parts.join("; ")
}

export function writeClientPreferenceCookie(
  options: ClientCookieOptions
): void {
  if (typeof document === "undefined") return
  document.cookie = buildClientCookieString(options)
}
