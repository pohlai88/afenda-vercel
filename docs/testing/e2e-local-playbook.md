# E2E local playbook (Playwright)

**Authority:** [ADR-0033](../decisions/0033-verify-gate-ladder-naming.md) (gate ladder) · `.cursor/rules/testing.mdc` · **AGENTS.md §2** (Testing / E2E).

## Prime directive

```txt
One failure → one narrow rerun. Never replay the full E2E tree after every edit.
```

| Tier | When | Command | Typical cost |
| --- | --- | --- | --- |
| **E0** | Before any Playwright run | Feature preflight script (see below) | ~20–60s |
| **E1** | After each E2E fix | `playwright test <spec> -g "<title fragment>" --workers=1` | ~1–2 min warm |
| **E2** | Pre-PR / CI parity | `pnpm test:e2e` or `pnpm test:e2e:smoke` | build + full suite |

**Forbidden edit-loop habit:** `pnpm test:e2e` after every selector or auth tweak (~8–15+ min with cold build).

---

## Base URL and ports

| Port | Role |
| --- | --- |
| **3000** | `pnpm dev` / `dev:ui` (`.next-ui`) — use only when **healthy** |
| **3001** | Playwright `webServer` / `next start` harness (default in `.config/playwright.config.ts`) |
| **3002** | Workflow DevKit — **not** for App Router E2E |

**Auto-resolve:** `tests/e2e/utils/e2e-base-url.ts` probes port 3000 (TCP + `/api/auth/get-session`). A process listening on 3000 that never returns HTTP is treated as **unhealthy** → falls back to **3001**.

**Env alignment (required when overriding):**

```env
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001
BETTER_AUTH_URL=http://127.0.0.1:3001
NEXT_PUBLIC_BETTER_AUTH_URL=http://127.0.0.1:3001/api/auth
```

Use the **same host** for `PLAYWRIGHT_BASE_URL` and `BETTER_AUTH_URL` (`localhost` vs `127.0.0.1` mismatch breaks cookies).

Playwright `webServer` sets `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` from resolved base URL (`.config/playwright.config.ts`).

---

## Auth fixture (`tests/e2e/fixtures/auth.ts`)

- Worker-scoped storage state: `.artifacts/playwright/.auth/worker-{id}.json`
- Sign-in: `tests/e2e/utils/org-admin-auth.ts` — API sign-in, DB `activeOrganizationId` for demo-org, clears `__Secure-neon-auth.local.session_data`, nexus warmup
- Credentials: `E2E_ORG_ADMIN_EMAIL` / `E2E_ORG_ADMIN_PASSWORD` (defaults match `pnpm dev:seed`)

**Org session on route handlers:** use `getOrgSessionFromRequestTrusted` from `#lib/auth` when the handler must see DB `activeOrganizationId` (E2E activates org via SQL). Cookie `session_data` cache alone can return `null` org → **401 Unauthorized**.

---

## Cookie-authenticated API from Playwright

`page.request.post(...)` does **not** reliably carry the live browser cookie jar after mid-test navigation.

**Prefer in-page fetch for session-cookie APIs:**

```ts
const result = await page.evaluate(async (body) => {
  const res = await fetch("/api/erp/.../ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, text: await res.text() }
}, payload)
```

Bearer / API-key paths may still use `page.request` with explicit headers.

---

## Demo-org ERP + HRM seeds

| Step | Command |
| --- | --- |
| Users + org | `pnpm dev:seed` |
| Portal + `hrm_employee` | `pnpm dev:seed:demo-erp` |
| Time-clock ERP grants + employee (idempotent) | `test.beforeAll` → `ensureTimeClockE2ePermissions` in `tests/e2e/utils/ensure-time-clock-e2e-permissions.ts` |

Specs that need employees in mapping selects must not `test.skip` silently — seed in `beforeAll` or fail preflight.

---

## HRM time clock (reference spec)

**Preflight (no browser):**

```bash
pnpm e2e:preflight:time-clock
# or: node scripts/with-env.mjs node scripts/e2e-preflight-time-clock.mjs
```

Checks: health · sign-in · session · `activeOrganizationId` · ERP `time_clock*` grants · `hrm_employee` · route HTTP 200 · ingest session POST.

**Single tests (warm dev on 3001):**

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3001'
pnpm exec playwright test tests/e2e/hrm-time-clock-flow.spec.ts --config .config/playwright.config.ts -g "governed sections" --workers=1
pnpm exec playwright test ... -g "ingests a punch" --workers=1
pnpm exec playwright test ... -g "not-found" --workers=1
```

**Full spec file only when E0 + E1 pass:** same command without `-g` (~1 min warm for three tests).

Optional ingest key branch: `HRM_TIME_CLOCK_INGEST_API_KEY` + `HRM_TIME_CLOCK_INGEST_ACTOR_USER_ID` in `.env.local`.

---

## Adding a new ERP E2E spec

1. Copy auth import from `tests/e2e/fixtures/auth.ts` (not raw `@playwright/test`) when signed-in.
2. Add a `scripts/e2e-preflight-<feature>.mjs` if the spec needs DB seeds beyond `dev:seed`.
3. Document the preflight command in this file and **AGENTS.md §2**.
4. Tag stable smoke with `@smoke`; keep `test.describe.configure({ timeout: 180_000 })` for cold compiles.
5. Use `getByLabel` / `data-testid` scoped to sections — avoid unscoped `getByText` on nav + content duplicates.
