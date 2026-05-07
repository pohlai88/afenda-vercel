import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
    sequence: { shuffle: false },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./.artifacts/coverage",
      exclude: [
        "**/*.d.ts",
        "**/*.{config,setup}.*",
        "**/schema.generated.ts",
        "tests/**",
      ],
      // Ratchet global executed coverage toward 80%; keep coverage.all off until breadth grows.
      // Global floors track what Vitest currently executes from unit imports (lib/auth barrel drags many server modules).
      thresholds: {
        statements: 53,
        branches: 43,
        lines: 54,
        functions: 43,
        "lib/auth/**/*.shared.ts": {
          statements: 95,
          branches: 95,
          lines: 95,
          functions: 95,
        },
        "lib/auth/callback-path.ts": {
          statements: 95,
          branches: 95,
          lines: 95,
          functions: 95,
        },
      },
    },
  },
})
