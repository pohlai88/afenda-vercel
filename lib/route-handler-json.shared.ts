import { NextResponse } from "next/server"

/**
 * Standard headers for JSON Route Handlers — private, non-cacheable, MIME-sniff resistant.
 * Pair with {@link routeJsonOk} / {@link routeJsonError} for consistent API responses.
 */
export const ROUTE_JSON_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
} as const

export type RouteJsonErrorBody = {
  error: string
  code?: string
}

export function routeJsonOk<T>(
  body: T,
  init?: { status?: number }
): NextResponse<T> {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: ROUTE_JSON_HEADERS,
  })
}

export function routeJsonError(
  message: string,
  status: number,
  options?: { code?: string }
): NextResponse<RouteJsonErrorBody> {
  const body: RouteJsonErrorBody = { error: message }
  if (options?.code) body.code = options.code
  return NextResponse.json(body, {
    status,
    headers: ROUTE_JSON_HEADERS,
  })
}

export const ROUTE_TEXT_ERROR_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Type": "text/plain; charset=utf-8",
} as const

export function routeTextError(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: ROUTE_TEXT_ERROR_HEADERS,
  })
}

export async function readRequestJson(
  request: Request
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse<RouteJsonErrorBody> }
> {
  try {
    const value = await request.json()
    return { ok: true, value }
  } catch {
    return { ok: false, response: routeJsonError("Invalid JSON", 400) }
  }
}

export function routePublicErrorMessage(
  err: unknown,
  fallback: string
): string {
  if (process.env.NODE_ENV !== "production") {
    return err instanceof Error ? err.message : fallback
  }
  return fallback
}
