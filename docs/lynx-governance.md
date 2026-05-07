# Lynx governance (draft for `.cursor/rules`)

**Status:** This document mirrors the intended Cursor rule until `.cursor/rules/lynx-directory.mdc` is added and `scripts/check-agent-contract.mjs` lists it in `REQUIRED_FILES`. Apply those repo changes in Agent mode (or manually).

## Product framing

- **Lynx** is Afenda’s **machine layer** for resolving truth, preparing work, and recommending controlled action — an **ERP module** (`lib/features/lynx`), not an “AI feature.”
- **The Machine** — UI eyebrow / companion line; also the engineering name for the inference stack. **Vercel AI SDK** = implementation detail only.

**Canonical line:**

```txt
Lynx is Afenda’s machine layer for resolving truth, preparing work, and recommending controlled action.
```

**Banned in user-visible copy:** `AI assistant`, `chatbot`, `copilot`, and generic standalone “AI” where Lynx applies.

## Knowledge vs Lynx

| Concern | Owner |
|--------|--------|
| pgvector, `knowledge_chunk`, chunk CRUD, embeddings | `#features/knowledge` (substrate) |
| Product UX, truth stream, future briefs / intake / operator | `#features/lynx` |

Lynx **composes** `#features/knowledge` via the barrel only. Do **not** keep “Knowledge” as the long-term primary dashboard brand once `/dashboard/lynx` exists.

## Canonical contract file

Add **`lib/features/lynx/lynx.contract.ts`** (requires agent-contract allowlist for `*.contract.ts` at module root — see patch below).

```ts
export const LYNX_MODULE_ID = "lynx"

export const LYNX_LAYERS = [
  "truth",
  "briefs",
  "structured",
  "operator",
] as const

export const LYNX_AUDIT_ACTIONS = {
  truthQuery: "erp.lynx.truth.query",
  briefGenerate: "erp.lynx.brief.generate",
  intakeCommit: "erp.lynx.intake.commit",
  operatorRecommend: "erp.lynx.operator.recommend",
} as const
```

Derive labels, audits, and tests from this file.

## Four layers (official product names)

1. Truth Retrieval  
2. Operating Briefs  
3. **Canonical Intake** (UI/i18n; code slug `structured` / `structured-*.ts` until refactored)  
4. Decision Operator  

## Phase 1 truth UX (required blocks)

Every truth response UI must include:

1. Answer  
2. Evidence used  
3. Limitations  
4. Next safe action  

## Phase 1 scope (only)

- `/dashboard/lynx`
- `/api/erp/lynx/truth-search`
- `lib/features/lynx/*` + `lynx.contract.ts`
- `messages` → `Dashboard.Lynx.*`
- `AGENTS.md` contract update
- E2E smoke + unit tests for retrieval assembly  

**Do not** ship Briefs, Canonical Intake, or Operator in Phase 1.

## Cursor rule file (copy to `.cursor/rules/lynx-directory.mdc`)

Use the same frontmatter pattern as `.cursor/rules/iam-directory.mdc` (`description`, `alwaysApply: true`), then paste the sections from this doc into rule form.

## `check-agent-contract.mjs` patches

1. Add `.cursor/rules/lynx-directory.mdc` to `REQUIRED_FILES`.
2. In `assertModuleRootShape`, allow module root files matching `^[a-z0-9][a-z0-9-]*\.contract\.ts$`.

## `AGENTS.md` patches

- §4.2: add `.cursor/rules/lynx-directory.mdc` to required files list.
- §1 mechanical alignment: include `lynx-directory.mdc` in the sentence that lists mandatory rules.
- §5 or §6: short **Lynx** subsection — machine layer module, knowledge = substrate, pointer to `lynx-directory.mdc`.
