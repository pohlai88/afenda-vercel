# MCP-backed login / auth triage

Use this runbook when sign-in fails locally, on Vercel preview, or in production. It pairs **Next.js devtools MCP** (running app) with **Vercel MCP** (deployments + logs).

## Preconditions

- Cursor MCP servers enabled: `next-devtools` (Next.js MCP), `vercel`.
- Linked project: see [`.vercel/project.json`](../../.vercel/project.json) (`projectId`, `orgId` / team).

## A. Local development (`pnpm dev`)

1. **Discover the dev server**
   - MCP: `nextjs_index` (optionally `port` if auto-discovery fails).
2. **Errors and logs**
   - MCP: `nextjs_call` → `get_errors`
   - MCP: `nextjs_call` → `get_logs` → open the returned `next-development.log` path.
3. **Routes**
   - MCP: `nextjs_call` → `get_routes` — confirm `/[locale]/sign-in` and `/api/auth/[...path]`.
4. **Docs**
   - MCP: `nextjs_docs` with paths from `nextjs-docs://llms-index` (e.g. `/docs/app/guides/mcp`, `/docs/app/api-reference/config/next-config-js/allowedDevOrigins`).

**Common fixes**

- Missing Neon Auth env: set `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` (see `.env.config.example` §I); run `pnpm env:sync`.
- Playwright or browser using `127.0.0.1` while dev binds `localhost`: `next.config.ts` sets `allowedDevOrigins` in development for `127.0.0.1` and `localhost`.
- Dev shortcuts: [DevSignInPanel](../../components/dev/dev-signin-panel.tsx) prefills `email` and preserves `callbackUrl` when present.

## B. Vercel build failures (e.g. `cookies.secret`)

1. **Project + deployments**
   - MCP: `get_project` (`projectId`, `teamId` from `.vercel/project.json`).
   - MCP: `list_deployments` — note latest `state` / `target`.
2. **Build logs**
   - MCP: `get_deployment_build_logs` with failing `deploymentId`.
3. **Docs**
   - MCP: `search_vercel_documentation` — topics: environment variables build vs runtime, `vercel env run`.

**Common fixes**

- Ensure `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` exist for **Production** and **Preview** (and **Development** if used) in Vercel project settings so runtime lambdas receive them.
- The app uses **lazy Neon Auth initialization** with an internal placeholder only during `NEXT_PHASE=phase-production-build` when env is missing, so local `pnpm build` without secrets can still compile; **deployed auth always requires real secrets at runtime**.

## C. Vercel runtime (500s after deploy)

1. **Runtime logs**
   - MCP: `get_runtime_logs` (`projectId`, `teamId`, optional `deploymentId`, `environment`, `level`, `query`).
2. Reproduce with a single request to **`GET /api/auth/health`** — expect `ok: true`, **`checks.runtimeNeonAuthEnv`: true** when `NEON_AUTH_*` is present, **`checks.authHttpProxyPath`: `/api/auth`**, **`version`: 1** — or hit `/en/sign-in` and correlate timestamps.

## D. Automated checks

- Smoke redirect + sign-in prefill: [`tests/e2e/smoke.spec.ts`](../../tests/e2e/smoke.spec.ts).
- Repo gates: `pnpm verify` (see `AGENTS.md` §2).

## E. Neon Postgres + Neon Auth (Neon MCP)

**Project IDs:** `.vercel/project.json` stores a **Vercel** project id (`prj_*`). Neon MCP tools expect the **Neon** project id from the Neon Console or MCP **`list_projects`** (for example a `snowy-dawn-*` style id), not the Vercel id.

1. MCP: **`describe_project`** — list branches (`production`, `vercel-*` previews).
2. MCP: **`run_sql`** — on each branch behind **`DATABASE_URL`**: confirm **`neon_auth`** exists (`pg_namespace`) and the **`vector`** extension where Knowledge/pgvector is required (`SELECT extname FROM pg_extension WHERE extname = 'vector'`).
3. MCP: **`compare_database_schema`** — preview branches often lag **`production`** until **`pnpm db:migrate:local`** (or **`pnpm db:migrate:vercel`**) is run against that branch's URL.

## Related implementation

- Neon Auth server wrapper: [`lib/auth/neon.server.ts`](../../lib/auth/neon.server.ts)
- Auth route: [`app/api/auth/[...path]/route.ts`](../../app/api/auth/[...path]/route.ts)
- Callback safety: [`lib/auth/callback-path.ts`](../../lib/auth/callback-path.ts)
