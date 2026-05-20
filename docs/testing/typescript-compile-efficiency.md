# TypeScript compile efficiency

How Afenda keeps **`pnpm typecheck`** tractable while the app graph stays strict. Complements [erp-test-scale-strategy.md](./erp-test-scale-strategy.md) (Vitest runtime), **ADR-0042** ([`0042-typescript-gate-performance.md`](../decisions/0042-typescript-gate-performance.md)), and [`docs/_draft/typescript-upgrade.md`](../_draft/typescript-upgrade.md).

## Three graphs (do not merge)

| Graph | Command | Config | Notes |
| --- | --- | --- | --- |
| App | `pnpm typecheck` | `tsconfig.json` + `.config/tsconfig.lib-db.json` | `tsc -b` via `scripts/typecheck-build.mjs` |
| Tests | `pnpm typecheck:test` | `.config/tsconfig.test.json` | `tsc --noEmit -p` |
| Scripts | `pnpm typecheck:scripts` | `.config/tsconfig.scripts.json` | `tsc --noEmit -p` |

Splitting keeps Playwright/Vitest config and seed scripts out of the main ERP graph. **Never** add `tests/**` to root `tsconfig.json` `include`.

## Project references (app graph)

| File | Role |
| --- | --- |
| `tsconfig.base.json` | Shared `compilerOptions` + path aliases |
| `.config/tsconfig.lib-db.json` | Composite slice: `lib/db` only |
| `tsconfig.json` | Platform graph; `references` lib-db; excludes `lib/db` from `include` |
| `tsconfig.build.json` | Solution root (`files: []`, references both) |

Declaration emit: `.artifacts/types/lib-db/` (gitignored). Warm feature edits can skip rebuilding lib-db when its `.tsbuildinfo` is fresh.

Slice commands:

```bash
pnpm typecheck              # tsc -b tsconfig.build.json (solution root)
pnpm typecheck:turbo          # Turbo parallel lib-db → platform + test + scripts (CI)
pnpm typecheck:lib-db
pnpm typecheck:platform
pnpm typecheck:tsgo           # tsgo pilot (non-blocking; separate tsgo tsconfigs)
pnpm typecheck:diagnostics
pnpm typecheck:profile
```

## Settings already locked in

| Option | App | Test | Why |
| --- | --- | --- | --- |
| `incremental` + `tsBuildInfoFile` | `.artifacts/.tsbuildinfo/platform` / `lib-db` | `…/test` | Warm reruns skip full rebind |
| `skipLibCheck` | yes | yes | Skips checking all `.d.ts` bodies |
| `types: ["node"]` | yes (base) | inherited | Avoids scanning every `@types/*` package |
| `assumeChangesOnlyAffectDirectDependencies` | `true` | `true` | Incremental: only recheck direct importers on change |
| `strict` | yes | yes | Non-negotiable for ERP |

Reference: [TypeScript performance — controlling types inclusion](https://github.com/microsoft/TypeScript/wiki/Performance).

## Gate vs typecheck (agents)

| Command | What runs |
| --- | --- |
| `pnpm gate -- <paths>` | ESLint only |
| `pnpm gate:typecheck` | Full `pnpm typecheck` |
| `pnpm gate -- <paths> --typecheck` | ESLint + slice `tsc -b` (see ADR-0042) |
| `pnpm lint:typed -- <paths>` | L2 ESLint + `projectService` |

## Test/scripts graph optimizations

**`.config/tsconfig.test.json`**

- **`plugins: []`** — Next.js / Workflow language-service plugins are not needed to type-check `tests/`.
- **Exclude `.next/**`** — Generated route types belong in the **app** graph only.

**`.config/tsconfig.scripts.json`**

- Same: `plugins: []`, `assumeChangesOnlyAffectDirectDependencies: true`.

## Type-level patterns (cheap at compile time)

Prefer these over heavy conditional/mapped types in hot paths:

```ts
const STATES = ["draft", "posted"] as const
export type PayrollState = (typeof STATES)[number]
```

| Pattern | Compile cost | Use when |
| --- | --- | --- |
| `as const` + indexed access | Low | Enums, status unions, audit verbs |
| Zod `z.infer<typeof schema>` | Medium | Boundary validation |
| Recursive `Deep*` utility types | High | Avoid in `lib/features/*/index.ts` |
| `satisfies` + `as const` | Low | Fixtures (AGENTS.md fixture rule) |

## Import graph = typecheck graph

Unit tests that `import { X } from "#features/hrm"` load the **server barrel** type graph. Prefer `#features/<module>/client` or `schemas/` in tests (ADR-0030).

## Diagnostics

```bash
pnpm typecheck:diagnostics
pnpm typecheck:profile
```

## Cache hygiene

Phantom errors after route deletes:

```powershell
Remove-Item -Recurse -Force .next\types -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .artifacts\.tsbuildinfo -ErrorAction SilentlyContinue
pnpm typecheck
```

## Related

- [ADR-0042](../decisions/0042-typescript-gate-performance.md) — gate ladder + slices
- [ADR-0008](../decisions/0008-vitest-nextjs-unit-test-configuration.md) — Vitest config types
- `.cursor/rules/targeted-verification.mdc` — L0 close condition
