/**
 * Normalized parsing for App Router `searchParams` (awaited), matching Next.js
 * `PageProps` / `PageProps["searchParams"]` resolution shape.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
 */
export type AppSearchParams = Record<string, string | string[] | undefined>

/** First scalar query value for `key` (`string` beats first entry of `string[]`). */
export function searchParamFirst(
  sp: AppSearchParams,
  key: string
): string | undefined {
  const raw = sp[key]
  if (typeof raw === "string") return raw
  if (Array.isArray(raw)) return raw[0]
  return undefined
}

/** 1-based positive integer (e.g. `?page=2`); invalid/missing → `fallback`. */
export function searchParamPositiveInt(
  sp: AppSearchParams,
  key: string,
  fallback: number
): number {
  const raw = searchParamFirst(sp, key)
  if (raw === undefined) return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return n
}
