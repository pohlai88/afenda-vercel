# Vercel + Lynx — stability checklist (anti-drift)

Use this when pausing feature work on Lynx: confirm **Vercel project health**, **buildability**, and **Lynx env** so the machine layer does not rot.

## Project (from repo + Vercel MCP)

- Linked project: read `.vercel/project.json` (`projectId`, `orgId` / team).
- **MCP:** `get_project` and `list_deployments` (team + project from that file) to see whether **Production** latest is `READY` or `ERROR`.
- **Inspector:** each deployment includes `inspectorUrl` for full logs in the Vercel dashboard.

## Build failures (observed pattern)

If Production deployment shows **ERROR**, fetch **`get_deployment_build_logs`** for the failing deployment id.

A common failure during **`next build` → Collecting page data** is Neon Auth rejecting missing **`cookies.secret`**. Build workers may not inherit **`NEXT_PHASE`**, so **`lib/auth/neon.server.ts`** treats **`next build`** (argv + `NODE_ENV=production`) as build-like and applies **placeholder** Neon env only for compilation — runtime still requires real **`NEON_AUTH_*`** (see `.env.config.example` §I).

## Lynx-specific runtime env (see `.env.config.example`)

Minimum for retrieval + generation after sign-in:

- **`AI_GATEWAY_API_KEY`** locally (or **`VERCEL_OIDC_TOKEN`** auto-injected on Vercel) for embeddings and models.
- Org-level hybrid/rerank/BYOK follows **`#features/knowledge`** settings + optional **`KNOWLEDGE_BYOK_KEY`**.

Optional tuning (documented in `.env.config.example`):

- **`LYNX_RETRIEVAL_HYBRID`**, **`EMBEDDING_MODEL`**, **`RERANK_MODEL`**, **`LYNX_GENERATION_MODEL`**, **`LYNX_MAX_OUTPUT_TOKENS`**, **`LYNX_OPERATOR_MAX_OUTPUT_TOKENS`**.

## Code drift guards (repo)

- **`lib/features/lynx/lynx.contract.ts`** — audit strings and **`LYNX_LAYERS`** (extend only when behavior ships).
- **`tests/unit/lynx/**`** — contract + operator registry parity.
- **`pnpm verify`** before merging anything that touches Lynx or auth.

## Pause protocol

1. `pnpm verify` green locally.
2. Vercel MCP: latest Production deployment **`READY`** (or fix env/build before pausing).
3. Optional smoke: signed-in **`/{locale}/o/{orgSlug}/dashboard/lynx`** — Truth search + Operator + NL demos.
