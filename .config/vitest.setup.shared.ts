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

process.env.NEON_AUTH_BASE_URL ??= "https://vitest.neonauth.example/neondb/auth"
process.env.NEON_AUTH_COOKIE_SECRET ??=
  "dGVzdHNlY3JldHRlc3RzZWNyZXR0ZXN0c2VjcmV0dGVzdA=="
process.env.DATABASE_URL ??= "postgresql://vitest:vitest@127.0.0.1:5432/vitest"
