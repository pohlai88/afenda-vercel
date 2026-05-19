import { configure } from "@testing-library/dom"
import { vi } from "vitest"

vi.mock("server-only", () => ({}))

/** Keeps `#features/erp-rbac` barrel imports from pulling `#i18n/navigation` in Node tests. */
vi.mock("#i18n/navigation", () => ({
  Link: ({ children }: { children?: unknown }) => children,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  redirect: vi.fn(),
}))

vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: ({ children }: { children?: unknown }) => children,
    redirect: vi.fn(),
    usePathname: () => "/",
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
    getPathname: vi.fn(() => "/"),
  }),
}))

configure({ asyncUtilTimeout: 10_000 })

/** Stub Neon Auth env so the createNeonAuth call doesn't throw during unit test imports. */
process.env.NEON_AUTH_BASE_URL ??= "https://vitest.neonauth.example/neondb/auth"
process.env.NEON_AUTH_COOKIE_SECRET ??=
  "dGVzdHNlY3JldHRlc3RzZWNyZXR0ZXN0c2VjcmV0dGVzdA=="

/** Dummy URL so importing `#lib/db` does not throw in unit tests. */
process.env.DATABASE_URL ??= "postgresql://vitest:vitest@127.0.0.1:5432/vitest"

/**
 * jsdom does not implement `window.matchMedia` — shadcn `useIsMobile` and any
 * other media-query consumer must work in `*.dom.test.tsx` files without each
 * test re-declaring the polyfill.
 *
 * @see https://github.com/jsdom/jsdom/issues/3522
 */
if (typeof globalThis.window !== "undefined" && !globalThis.window.matchMedia) {
  Object.defineProperty(globalThis.window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
