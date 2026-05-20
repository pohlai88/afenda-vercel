/**
 * L2 typed ESLint — `parserOptions.projectService` (ADR-0042 Phase 3).
 * Not used by L0 `pnpm lint:path` / `pnpm gate -- <paths>`.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "eslint/config"

import baseConfig from "../eslint.config.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

export default defineConfig([
  ...baseConfig,
  {
    name: "afenda/typescript-project-service-l2",
    files: ["**/*.{ts,tsx}"],
    ignores: [
      ".next/**",
      ".next-ui/**",
      ".next-workflow/**",
      ".source/**",
      ".artifacts/**",
      ".venv/**",
      "node_modules/**",
      "tests/**",
      "scripts/**",
      "turbo/**",
      "drizzle/**",
      "content/**",
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: root,
      },
    },
  },
])
