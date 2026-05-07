/**
 * Request header set by [`proxy.ts`](../../proxy.ts) when the URL has a valid
 * `/{locale}/…` prefix — consumed by root [`app/layout.tsx`](../../app/layout.tsx) for `<html lang>`.
 */
export const AFENDA_LOCALE_HEADER = "x-afenda-locale"
