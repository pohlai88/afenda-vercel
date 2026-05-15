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
      "Import primitives only via #components/ui/* — radix-ui stays inside components/ui.",
  },
  {
    group: ["@radix-ui/*"],
    message:
      "Use #components/ui/* wrappers; do not import @radix-ui packages outside components/ui.",
  },
  {
    group: ["@base-ui/react"],
    message:
      "Use #components/ui/* wrappers (e.g. Combobox); @base-ui/react only inside components/ui.",
  },
]

/**
 * UI shelf lives under `components/ui/**` on disk; every consumer must import
 * through the package alias `#components/ui/*` (see `package.json` `imports`
 * and AGENTS.md §7). Filesystem-relative specifiers into `components/ui` break
 * when files move and bypass the single import door.
 */
const uiShelfFilesystemImportPatterns = [
  {
    group: ["**/components/ui", "**/components/ui/*"],
    message:
      "Import UI primitives only via #components/ui/* — not filesystem-relative paths into components/ui (AGENTS.md §7).",
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
  // no-unused-vars and no-unused-expressions at "warn". We promote both to
  // "error" and add the two rules that matter most for an enterprise TS
  // codebase: consistent type-imports and no CommonJS require().
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
      "components/**/*.{ts,tsx,js,jsx}",
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
       */
      "no-console": "warn",
    },
  },

  // -------------------------------------------------------------------------
  // § ERP modules — radix / base-ui confinement + deep-import boundary
  //
  // `lib/features/**` must not reach outside components/ui for UI primitives.
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
  // All source outside components/ui and lib/features must respect:
  //   1. Radix / Base UI confinement
  //   2. UI shelf import door (#components/ui/* only; no **/components/ui paths)
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
      "components/**/*.{js,jsx,ts,tsx}",
      "hooks/**/*.{js,jsx,ts,tsx}",
      "lib/**/*.{js,jsx,ts,tsx}",
    ],
    ignores: ["components/ui/**", "lib/features/**"],
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
  // § Nexus field — Tooltip import gate
  //
  // Nexus product surface must not import raw Tooltip ad hoc; L1 discs live
  // under `components/workbench/utility-bar/` (WorkbenchUtility* wrappers).
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
              name: "#components/ui/tooltip",
              message:
                "Use WorkbenchUtilityRoundTooltipButton, WorkbenchUtilityRoundTooltipLink, or WorkbenchUtilityTriggerTooltip from `components/workbench/utility-bar/` for L1-style tooltips — or add a Nexus-local primitive with an ESLint ignore and ADR note.",
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
