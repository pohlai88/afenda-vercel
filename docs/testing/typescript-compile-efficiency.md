# TypeScript compile efficiency

How Afenda keeps **`pnpm typecheck`** fast (~20–40s warm) while the app graph stays strict. Complements [erp-test-scale-strategy.md](./erp-test-scale-strategy.md) (Vitest runtime) and **AGENTS.md** §2.

## Three graphs (do not merge)

| Graph | Command | Config | ~Files (warm) |
| --- | --- | --- | --- |
| App | `pnpm typecheck` | `tsconfig.json` | ~6.5k |
| Tests | `pnpm typecheck:test` | `.config/tsconfig.test.json` | ~5.7k |
| Scripts | `pnpm typecheck:scripts` | `.config/tsconfig.scripts.json` | smaller |

Splitting keeps Playwright/Vitest config and seed scripts out of the main ERP graph. **Never** add `tests/**` to root `tsconfig.json` `include`.

## Settings already locked in

| Option | App | Test | Why |
| --- | --- | --- | --- |
| `incremental` + `tsBuildInfoFile` | `.artifacts/.tsbuildinfo/main` | `…/test` | Warm reruns skip full rebind |
| `skipLibCheck` | yes | yes | Skips checking all `.d.ts` bodies |
| `types: ["node"]` | yes | inherited | Avoids scanning every `@types/*` package |
| `assumeChangesOnlyAffectDirectDependencies` | `true` | `true` | Incremental: only recheck direct importers on change |
| `strict` | yes | yes | Non-negotiable for ERP |

Reference: [TypeScript performance — controlling types inclusion](https://github.com/microsoft/TypeScript/wiki/Performance).

## Test/scripts graph optimizations

**`.config/tsconfig.test.json`**

- **`plugins: []`** — Next.js / Workflow language-service plugins are not needed to type-check `tests/` (stubs cover `next/headers`). Removing them cuts plugin work on ~5k files.
- **Exclude `.next/**`** — Generated route types belong in the **app** graph only.
- **Include `vitest.shared.ts` + setup files** — not deprecated `vitest.setup.ts` shim only.

**`.config/tsconfig.scripts.json`**

- Same: `plugins: []`, `assumeChangesOnlyAffectDirectDependencies: true`.

## Type-level patterns (cheap at compile time)

Prefer these over heavy conditional/mapped types in hot paths:

```ts
// Good — O(1) for the compiler
const STATES = ["draft", "posted"] as const
export type PayrollState = (typeof STATES)[number]

// Avoid in shared barrels — deep instantiation cost
type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] }
```

| Pattern | Compile cost | Use when |
| --- | --- | --- |
| `as const` + indexed access | Low | Enums, status unions, audit verbs |
| Zod `z.infer<typeof schema>` | Medium | Boundary validation (preferred over duplicate interfaces) |
| `Parameters<typeof fn>` on large generics | High | Single call site only — not in barrel `index.ts` |
| Recursive `Deep*` utility types | High | Avoid in `lib/features/*/index.ts` |
| `satisfies` + `as const` | Low | Fixtures ([AGENTS.md](../AGENTS.md) fixture rule) |

## Import graph = typecheck graph

Unit tests that `import { X } from "#features/hrm"` load the **server barrel** type graph. For faster **Vitest** and slightly leaner **typecheck:test**:

- Import `#features/<module>/client` or `schemas/` from tests (ADR-0030).
- Keep schema-only specs in `**/*.pure.test.ts` (`unit-pure` project).

## Diagnostics

```bash
pnpm typecheck
pnpm exec tsc --noEmit --extendedDiagnostics

pnpm typecheck:test
pnpm exec tsc --noEmit -p .config/tsconfig.test.json --extendedDiagnostics
```

Watch **Total time**, **Files**, and **Instantiations** (should stay low on warm incremental runs).

## Cache hygiene

Phantom errors after route deletes:

```powershell
Remove-Item -Recurse -Force .next\types -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .artifacts\.tsbuildinfo -ErrorAction SilentlyContinue
pnpm typecheck
```

## Related

- [ADR-0008](../decisions/0008-vitest-nextjs-unit-test-configuration.md) — Vitest config types (`CoverageOptions`, `test.deps.optimizer`)
- `.cursor/rules/targeted-verification.mdc` — `typecheck` vs `typecheck:full`
