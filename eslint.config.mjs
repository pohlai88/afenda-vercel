import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

// ---------------------------------------------------------------------------
// Shared import-restriction patterns
// ---------------------------------------------------------------------------

/** @type {import("eslint").Linter.RuleEntry} */
const radixRestrictedPatterns = [
  {
    group: ["radix-ui"],
    message:
      "Import primitives only via #components2/ui/* — radix-ui stays inside components2/ui.",
  },
  {
    group: ["@radix-ui/*"],
    message:
      "Use #components2/ui/* wrappers; do not import @radix-ui packages outside components2/ui.",
  },
  {
    group: ["@base-ui/react"],
    message:
      "Use #components2/ui/* wrappers (e.g. Combobox); @base-ui/react only inside components2/ui.",
  },
]

/**
 * UI shelf lives under `components2/ui/**` on disk; every consumer must import
 * through the package alias `#components2/ui/*` (see `package.json` `imports`
 * and AGENTS.md §7). Filesystem-relative specifiers into `components2/ui` break
 * when files move and bypass the single import door.
 */
const uiShelfFilesystemImportPatterns = [
  {
    group: ["**/components2/ui", "**/components2/ui/*"],
    message:
      "Import UI primitives only via #components2/ui/* — not filesystem-relative paths into components2/ui (AGENTS.md §7).",
  },
  {
    group: ["**/components/ui", "**/components/ui/*"],
    message:
      "components/ui is retired — import via #components2/ui/* (components2/ui on disk).",
  },
]

/**
 * Cross-module deep-import patterns.
 * `app/`, `components/`, `hooks/`, and all `lib/` outside the same module must
 * use only the public doors: #features/<module>, #features/<module>/client,
 * or #features/<module>/server. Internals (actions/, data/, components/,
 * schemas/, types) are private by contract (AGENTS.md §6).
 */
const deepFeatureImportPatterns = [
  {
    group: [
      "#features/*/actions",
      "#features/*/actions/*",
      "#features/*/components",
      "#features/*/components/*",
      "#features/*/constants",
      "#features/*/data",
      "#features/*/data/*",
      "#features/*/schemas",
      "#features/*/schemas/*",
      "#features/*/types",
    ],
    message:
      "Do not deep-import feature internals. Use #features/<module>, #features/<module>/client, or #features/<module>/server.",
  },
]

/**
 * Server-only symbols that must never appear in client-only files.
 * Hooks are always executed in the browser; they must use #lib/auth-client
 * and client-safe shared helpers (#lib/auth/*.shared) instead.
 */
const serverOnlyPatterns = [
  {
    group: ["server-only", "next/headers", "next/cache"],
    message:
      "This module is server-only and cannot be imported from client-side code. Use client-safe alternatives.",
  },
  {
    group: ["#lib/auth"],
    message:
      "lib/auth is server-only. Use #lib/auth-client for browser code or #lib/auth/*.shared for shared utilities.",
  },
]

/**
 * Server feature index barrels (#features/<module>) pull the whole module graph
 * into the client bundle. Client files must use #features/<module>/client instead.
 * @see ADR-0030 · .cursor/rules/module-client-server-barrels.mdc
 */
const serverFeatureIndexBarrelPatterns = [
  {
    group: ["#features/*"],
    message:
      "Do not import the server feature index barrel from Client Components. Use #features/<module>/client, #features/<module>/server, or an allowed schemas/*.shared deep path (ADR-0030).",
  },
]

/**
 * Public Lynx (ask-docs AI chat) must stay separate from ERP Lynx and IAM.
 * @see .cursor/rules/public-lynx.mdc · scripts/check-public-lynx-contract.mjs
 */
const publicLynxForbiddenImports = [
  {
    group: ["#features/lynx", "#features/lynx/*"],
    message:
      "Public Lynx must not import ERP Lynx. Use lib/ask-docs/public-lynx* and Vercel AI SDK in app/api/chat/route.ts.",
  },
  {
    group: ["lib/features/lynx", "lib/features/lynx/*"],
    message:
      "Public Lynx must not import ERP Lynx internals. Use lib/ask-docs/public-lynx* only.",
  },
  {
    group: ["#lib/auth", "#lib/auth/*"],
    message:
      "Public Lynx has no org session. Do not import IAM server modules on the ask-docs chat surface.",
  },
]

// ---------------------------------------------------------------------------
// ESLint flat config
// ---------------------------------------------------------------------------

const eslintConfig = defineConfig([
  // -------------------------------------------------------------------------
  // Base: Next.js core-web-vitals (React, react-hooks, @next/next, import,
  //       jsx-a11y) + TypeScript recommended
  // -------------------------------------------------------------------------
  ...nextVitals,
  ...nextTs,

  // `eslint-config-next/typescript` enables `@typescript-eslint/no-misused-promises`,
  // which requires parser type information. Tooling under `.config/` is compiled
  // via split tsconfigs (`tsconfig.test.json` / `tsconfig.scripts.json`), not the
  // root program — ESLint hits "no parserOptions.project for this file" and crashes.
  {
    name: "afenda/config-tooling-disable-misused-promises",
    files: [".config/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-misused-promises": "off",
    },
  },

  // -------------------------------------------------------------------------
  // Global ignores — build artifacts, generated files, external tooling
  // -------------------------------------------------------------------------
  globalIgnores([
    // Next.js build output
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Workflow DevKit internals (not app code)
    "app/.well-known/workflow/**",
    // Fumadocs generated collection output; app code imports through
    // `#collections/*`, but generated artifacts must not be linted as source.
    ".source/**",
    // Python virtual environment (pip vendored JS, not project code)
    ".venv/**",
    // Artifact directories
    ".artifacts/**",
  ]),

  // -------------------------------------------------------------------------
  // § General code-quality (all files, after ignores)
  //
  // Rules here catch problems that TypeScript alone won't prevent and that
  // are safe to apply universally: binding re-assignment, legacy var,
  // strict equality, and debug statements.
  // -------------------------------------------------------------------------
  {
    name: "afenda/general-quality",
    rules: {
      /** Prefer immutable bindings; signals intent and enables optimisations. */
      "prefer-const": "error",
      /** ES2022 codebase — `var` is never correct here. */
      "no-var": "error",
      /**
       * Strict equality except for null comparisons — `== null` is an
       * intentional idiom for `=== null || === undefined`.
       */
      eqeqeq: ["error", "always", { null: "ignore" }],
      /** Debugger statements must never reach production. */
      "no-debugger": "error",
    },
  },

  // -------------------------------------------------------------------------
  // § TypeScript governance — upgraded strictness for .ts / .tsx
  //
  // eslint-config-next/typescript ships @typescript-eslint/recommended with
  // no-unused-vars, no-unused-expressions, and no-explicit-any at "warn".
  // We promote all three to "error" and add the rules that matter most for
  // an enterprise TS codebase: consistent type-imports, no CommonJS
  // require(), and no async callbacks passed to sync-only contexts.
  // -------------------------------------------------------------------------
  {
    name: "afenda/typescript-governance",
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      /**
       * Unused variables are always bugs or dead code. Underscore prefix
       * (`_name`) is the only accepted exception (ignored arguments / catch
       * vars that intentionally receive but discard a value).
       */
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      /**
       * Expressions whose result is unused are almost always a mistake
       * (e.g. a missing `await`, a call whose return value matters).
       */
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: false,
        },
      ],
      /**
       * Keep import declarations honest — value imports for values, type
       * imports for type-only uses. The `inline-type-imports` style (`import
       * { type Foo }`) avoids churn when a symbol gains a runtime use.
       */
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
          disallowTypeAnnotations: true,
        },
      ],
      /**
       * The codebase is pure ESM (package.json `"type": "module"`).
       * require() is never correct here.
       */
      "@typescript-eslint/no-require-imports": "error",
      /**
       * `any` defeats the TypeScript contract. The quality contract
       * (frontend-quality-contract.mdc §6) bans `any` without a justification
       * comment; promoting from warn → error makes the gate hard.
       */
      "@typescript-eslint/no-explicit-any": "error",
      /**
       * `no-misused-promises` requires parserOptions.projectService (typed
       * linting) which is intentionally not configured here — it would add
       * 30–60s to every lint run. Enable it in a dedicated typed-lint pass
       * once projectService is wired to tsconfig.json.
       * "@typescript-eslint/no-misused-promises": "error",
       */
    },
  },

  // -------------------------------------------------------------------------
  // § Production logging discipline — app / lib / components / hooks
  //
  // Application code must use `logUnexpectedServerError` from
  // `#lib/logger.server` (Node) or Sentry client handlers — never raw
  // console.*. This rule surfaces accidental console calls during review
  // without blocking the build (warn). The team should treat the count as a
  // ratchet toward zero.
  //
  // Exclusions: scripts/** and test fixtures are free to use console because
  // they run in Node CLI contexts where structured logging would be overhead.
  // -------------------------------------------------------------------------
  {
    name: "afenda/production-logging",
    files: [
      "app/**/*.{ts,tsx,js,jsx}",
      "components2/**/*.{ts,tsx,js,jsx}",
      "lib/**/*.{ts,tsx,js,jsx}",
      "hooks/**/*.{ts,tsx,js,jsx}",
      "i18n/**/*.{ts,tsx,js}",
      "proxy.ts",
      "instrumentation.ts",
      "instrumentation-client.ts",
      "instrumentation.node.ts",
    ],
    rules: {
      /**
       * Use `logUnexpectedServerError` (lib/logger.server) on Node,
       * `instrumentation.ts`'s onRequestError on Edge, or Sentry client.
       * See AGENTS.md §5 — Observability five-layer doctrine.
       * Promoted to "error" (was "warn") — with --max-warnings 0 the gate
       * was already hard; the severity now matches the doctrine's absolutism.
       */
      "no-console": "error",
    },
  },

  // -------------------------------------------------------------------------
  // § ERP modules — radix / base-ui confinement + deep-import boundary
  //
  // `lib/features/**` must not reach outside components2/ui for UI primitives.
  // The deep-import boundary is also enforced by check-agent-contract.mjs for
  // belt-and-suspenders (script scans all source files at preinstall/CI).
  // -------------------------------------------------------------------------
  {
    name: "afenda/erp-module-imports",
    files: ["lib/features/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...radixRestrictedPatterns,
            ...uiShelfFilesystemImportPatterns,
          ],
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // § App-layer / component / hook import discipline
  //
  // All source outside components2/ui and lib/features must respect:
  //   1. Radix / Base UI confinement
  //   2. UI shelf import door (#components2/ui/* only; no **/components2/ui paths)
  //   3. No deep cross-module feature imports
  //
  // hooks/** additionally enforces the server-only client boundary — hooks
  // execute in the browser and must never pull next/headers, next/cache,
  // server-only, or #lib/auth (server-only barrel) into the client bundle.
  // -------------------------------------------------------------------------
  {
    name: "afenda/app-layer-imports",
    files: [
      "app/**/*.{js,jsx,ts,tsx}",
      "components2/**/*.{js,jsx,ts,tsx}",
      "hooks/**/*.{js,jsx,ts,tsx}",
      "lib/**/*.{js,jsx,ts,tsx}",
    ],
    ignores: [
      // UI primitive shelf — allowed to import radix/base-ui directly
      "components2/ui/**",
      // ERP feature internals are governed by afenda/erp-module-imports
      "lib/features/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...radixRestrictedPatterns,
            ...uiShelfFilesystemImportPatterns,
            ...deepFeatureImportPatterns,
          ],
        },
      ],
    },
  },

  {
    name: "afenda/ai-gateway-only",
    files: ["app/api/chat/**/*.{ts,tsx}", "lib/ai/**/*.{ts,tsx}"],
    ignores: ["lib/ai/model-policy.server.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "openai",
              message:
                "Use Vercel AI Gateway via #lib/ai/gateway.server — no direct OpenAI SDK.",
            },
            {
              name: "@ai-sdk/openai",
              message:
                "Use Vercel AI Gateway via #lib/ai/gateway.server — no direct @ai-sdk/openai.",
            },
          ],
        },
      ],
    },
  },

  {
    name: "afenda/public-lynx-boundary",
    files: [
      "app/api/chat/**/*.{ts,tsx}",
      "components2/ai/search.tsx",
      "components2/ai/public-lynx-fab-drag.ts",
      "components2/ai/ask-lynx-tooltip.tsx",
      "lib/ask-docs/public-lynx*.ts",
      "lib/ask-docs/lynx-brand.shared.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: publicLynxForbiddenImports,
        },
      ],
    },
  },

  {
    name: "afenda/hooks-server-boundary",
    files: ["hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...radixRestrictedPatterns,
            ...uiShelfFilesystemImportPatterns,
            ...deepFeatureImportPatterns,
            ...serverOnlyPatterns,
          ],
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // § components2/ server-boundary — client shell must stay client-safe
  //
  // components2/ is the canonical shell layer (AppShell, PortalShell,
  // stores, providers). Its *.client.tsx files execute in the browser.
  // Apply the same server-import gate that hooks/ has.
  // -------------------------------------------------------------------------
  {
    name: "afenda/components2-server-boundary",
    files: ["components2/**/*.client.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...serverFeatureIndexBarrelPatterns,
            ...serverOnlyPatterns,
          ],
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // § Feature modules — client files must not import server index barrels
  // @see ADR-0030 · bundle-barrel-imports (Vercel React best practices)
  // -------------------------------------------------------------------------
  {
    name: "afenda/feature-client-server-barrel",
    files: ["lib/features/**/*.client.{ts,tsx}", "hooks/**/*.client.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...serverFeatureIndexBarrelPatterns,
            ...serverOnlyPatterns,
          ],
        },
      ],
    },
  },

  // App Router client special files (not always *.client.tsx)
  // @see ADR-0030 · scripts/scan-client-barrel-imports.mjs
  {
    name: "afenda/app-client-server-barrel",
    files: [
      "app/**/error.tsx",
      "app/**/not-found.tsx",
      "app/**/global-error.tsx",
      "app/**/*-client.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...serverFeatureIndexBarrelPatterns,
            ...serverOnlyPatterns,
          ],
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // § React hooks quality — promote exhaustive-deps to error
  //
  // eslint-config-next/core-web-vitals sets react-hooks/exhaustive-deps to
  // "warn". The quality contract (frontend-quality-contract.mdc §1) treats
  // stale-closure useEffect as a block-merge anti-pattern. Promote to "error"
  // so the pre-commit hook and CI gate are consistent with the contract.
  // -------------------------------------------------------------------------
  {
    name: "afenda/react-hooks-quality",
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "react-hooks/exhaustive-deps": "error",
    },
  },

  // -------------------------------------------------------------------------
  // § Nexus field — Tooltip import gate
  //
  // Nexus product surface must not import raw Tooltip ad hoc; L1 discs live
  // under `components2/app-shell/top-utils-bar/` (AppShellUtility* wrappers).
  // -------------------------------------------------------------------------
  {
    name: "afenda/nexus-tooltip-import-gate",
    files: ["components/nexus/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "#components2/ui/tooltip",
              message:
                "Use AppShellUtilityRoundTooltipButton, AppShellUtilityRoundTooltipLink, or AppShellUtilityTriggerTooltip from `components2/app-shell/top-utils-bar/` for L1-style tooltips — or add a Nexus-local primitive with an ESLint ignore and ADR note.",
            },
          ],
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // § HRM module — PII audit-metadata guardrail
  //
  // PII fields must never appear as keys inside the `metadata` argument of
  // `writeIamAuditEvent` or `writeIamAuditEventFromNextHeaders` calls within
  // the HRM module. Use only derived booleans or anonymised signals.
  // Phase 1B risk: taxIdentifierNumber, bankAccountNumber, nationalId,
  // payrollBankAccount, icNumber, passportNumber.
  // See: AGENTS.md §5 — IAM audit policy (ERP).
  // -------------------------------------------------------------------------
  {
    name: "afenda/hrm-pii-audit-metadata",
    files: ["lib/features/hrm/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name=/^writeIamAuditEvent/] Property[key.name=/^(taxIdentifierNumber|bankAccountNumber|nationalId|payrollBankAccount|icNumber|passportNumber)$/]",
          message:
            "PII must not appear in writeIamAuditEvent metadata inside lib/features/hrm. Use derived booleans (e.g. hasTaxIdentifier) or anonymised signals instead.",
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // § Test files — relax rules that conflict with test-framework idioms
  //
  // Vitest's `importOriginal<typeof import("module")>()` and Playwright's
  // inline `import("@playwright/test").Page` annotations are idiomatic
  // patterns in test infrastructure. `disallowTypeAnnotations: false` allows
  // these while preserving the rule's core value (enforcing `import type`
  // for type-only imports) everywhere else.
  //
  // console.* is also appropriate in tests — test output is not structured
  // production logging.
  // -------------------------------------------------------------------------
  {
    name: "afenda/test-overrides",
    files: ["tests/**/*.{ts,tsx,spec.ts,test.ts,test.tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
          disallowTypeAnnotations: false,
        },
      ],
      "no-console": "off",
    },
  },

  // -------------------------------------------------------------------------
  // § components2/metadata/renderers — import allowlist (renderer kernel)
  // -------------------------------------------------------------------------
  {
    name: "afenda/components2-metadata-renderer-imports",
    files: ["components2/metadata/renderers/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-jsx-parser",
              message:
                "Forbidden in renderer kernel — use typed renderer components, not runtime JSX parsing (ADR-0011).",
            },
          ],
          patterns: [
            {
              group: ["#components/ui", "#components/ui/*"],
              message: "Renderers import primitives from #components2/ui only.",
            },
            {
              group: ["**/components/ui", "**/components/ui/*"],
              message: "Renderers import primitives from #components2/ui only.",
            },
            {
              group: ["#app-shell", "#app-shell/*", "#components2/app-shell/*"],
              message: "Renderers must not import shell chrome.",
            },
          ],
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // § components2/metadata/renderers — placement contract (ADR-0025 §1, §4)
  //
  // Renderers must be placement-correct in any container ≥ minContainerPx —
  // they do not own viewport geometry. This rule bans viewport breakpoints
  // (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) inside renderer files; renderers must
  // use container-query breakpoints (`@sm:`, `@md:`, `@lg:`, ...) instead.
  //
  // It also bans template-literal `className` in renderers, which silently
  // bypasses the exhaustive `Record<SchemaEnum, string>` map pattern that
  // forces a TypeScript error when a new tone/density/dataNature ships.
  // -------------------------------------------------------------------------
  {
    name: "afenda/renderer-placement-contract",
    files: ["components2/metadata/renderers/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)(?:sm|md|lg|xl|2xl):(?!\\[)/]",
          message:
            "Use container-query breakpoints (@sm:, @md:, @lg:) — not viewport breakpoints (sm:, md:) — inside renderer files (ADR-0025 §1).",
        },
        {
          selector: "JSXAttribute[name.name='className'] TemplateLiteral",
          message:
            "Avoid template-literal className in renderers — use cn() with a Record<SchemaEnum, string> map so a new enum value forces a TypeScript error (ADR-0025 §4).",
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // § Governed-surface builders — return the Zod *input* type
  //
  // Builder functions and fixtures must declare the Zod input type
  // (`*ConfigurationInput`), not the Zod output type (`*Configuration`).
  // Using the output type forces every default-bearing field
  // (e.g. `dataNature`, `density`, `tone`) to be supplied at the call site,
  // which is the wrong contract for a builder. ADR-0025 §4.
  // -------------------------------------------------------------------------
  {
    name: "afenda/governed-surface-builder-return",
    files: [
      "**/*surface-builders*.{ts,tsx}",
      "**/*-builders.server.{ts,tsx}",
      "components2/dev/**/*.{ts,tsx}",
      "lib/features/**/payslip-metadata.shared.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "FunctionDeclaration[returnType.typeAnnotation.typeName.name=/^(StatCard|ListSurfaceRenderer|GovernedActionBar|GovernedSection|GovernedStack|GovernedKanbanBoard|GovernedMultiStepForm|GovernedScorecardForm|GovernedApprovalTimeline|GovernedChart)Configuration$/]",
          message:
            "Builders must declare the Zod input type. Use `<Schema>ConfigurationInput` (not `<Schema>Configuration`) so default-bearing fields stay optional at the call site (ADR-0025 §4).",
        },
        {
          selector:
            "ArrowFunctionExpression[returnType.typeAnnotation.typeName.name=/^(StatCard|ListSurfaceRenderer|GovernedActionBar|GovernedSection|GovernedStack|GovernedKanbanBoard|GovernedMultiStepForm|GovernedScorecardForm|GovernedApprovalTimeline|GovernedChart)Configuration$/]",
          message:
            "Builders must declare the Zod input type. Use `<Schema>ConfigurationInput` (not `<Schema>Configuration`) so default-bearing fields stay optional at the call site (ADR-0025 §4).",
        },
        {
          selector:
            "FunctionExpression[returnType.typeAnnotation.typeName.name=/^(StatCard|ListSurfaceRenderer|GovernedActionBar|GovernedSection|GovernedStack|GovernedKanbanBoard|GovernedMultiStepForm|GovernedScorecardForm|GovernedApprovalTimeline|GovernedChart)Configuration$/]",
          message:
            "Builders must declare the Zod input type. Use `<Schema>ConfigurationInput` (not `<Schema>Configuration`) so default-bearing fields stay optional at the call site (ADR-0025 §4).",
        },
        {
          selector:
            "TSSatisfiesExpression > TSTypeReference[typeName.name=/^(StatCard|ListSurfaceRenderer|GovernedActionBar|GovernedSection|GovernedStack|GovernedKanbanBoard|GovernedMultiStepForm|GovernedScorecardForm|GovernedApprovalTimeline|GovernedChart)Configuration$/]",
          message:
            "Fixtures must satisfy the Zod input type. Use `as const satisfies <Schema>ConfigurationInput` so default-bearing fields stay optional (ADR-0025 §4).",
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // § Scripts — relax production rules for Node CLI scripts
  //
  // scripts/** run outside the Next.js runtime: no browser globals, no
  // server-only constraints, and console.* is the correct output channel.
  // -------------------------------------------------------------------------
  {
    name: "afenda/scripts-overrides",
    files: ["scripts/**/*.{js,mjs,cjs,ts,mts}"],
    rules: {
      "no-console": "off",
    },
  },
])

export default eslintConfig
