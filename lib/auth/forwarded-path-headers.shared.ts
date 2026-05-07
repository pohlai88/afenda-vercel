/**
 * Request header names set by [`proxy.ts`](../../proxy.ts) for matched routes.
 * Kept in a non-`server-only` module so Edge `proxy` can import safely.
 */
export const AFENDA_PATHNAME_HEADER = "x-afenda-pathname" as const
export const AFENDA_SEARCH_HEADER = "x-afenda-search" as const
