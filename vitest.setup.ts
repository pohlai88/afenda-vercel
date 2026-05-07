import { vi } from "vitest"

vi.mock("server-only", () => ({}))

/** Dummy URL so importing `#lib/auth` (Better Auth config → DB) does not throw in unit tests. */
process.env.DATABASE_URL ??= "postgresql://vitest:vitest@127.0.0.1:5432/vitest"
