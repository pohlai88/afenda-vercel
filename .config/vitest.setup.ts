import { configure } from "@testing-library/dom"
import { vi } from "vitest"

vi.mock("server-only", () => ({}))

configure({ asyncUtilTimeout: 10_000 })

/** Stub Neon Auth env so the createNeonAuth call doesn't throw during unit test imports. */
process.env.NEON_AUTH_BASE_URL ??= "https://vitest.neonauth.example/neondb/auth"
process.env.NEON_AUTH_COOKIE_SECRET ??=
  "dGVzdHNlY3JldHRlc3RzZWNyZXR0ZXN0c2VjcmV0dGVzdA=="

/** Dummy URL so importing `#lib/db` does not throw in unit tests. */
process.env.DATABASE_URL ??= "postgresql://vitest:vitest@127.0.0.1:5432/vitest"
