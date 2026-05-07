# CNA nextjs-saas-ai-starter → afenda-vercel IAM mapping

**Purpose:** Concept-only bridge between the Create-Node-App template’s IAM/PBAC **documentation** and this repo’s **Better Auth + Next.js 16** implementation. Use this as the checklist when resuming **WP-05** ([auth-iam-roadmap-final.plan.md](auth-iam-roadmap-final.plan.md)). **Do not** port CNA source trees (`src/shared`, `src/features`) or swap Auth.js for Better Auth.

---

## Pinned reference (immutable)

| Field | Value |
|--------|--------|
| **SHA** | `ccbb30f6a4d79f0b9d37de9df0a17e7ac8b567f7` |
| **Template root** | [nextjs-saas-ai-starter](https://github.com/Create-Node-App/cna-templates/tree/ccbb30f6a4d79f0b9d37de9df0a17e7ac8b567f7/templates/nextjs-saas-ai-starter) |

**Read at this pin:**

- [README.md](https://github.com/Create-Node-App/cna-templates/blob/ccbb30f6a4d79f0b9d37de9df0a17e7ac8b567f7/templates/nextjs-saas-ai-starter/README.md)
- [docs/AUTHENTICATION.md](https://github.com/Create-Node-App/cna-templates/blob/ccbb30f6a4d79f0b9d37de9df0a17e7ac8b567f7/templates/nextjs-saas-ai-starter/docs/AUTHENTICATION.md)
- [docs/ROLES_AND_PERMISSIONS.md](https://github.com/Create-Node-App/cna-templates/blob/ccbb30f6a4d79f0b9d37de9df0a17e7ac8b567f7/templates/nextjs-saas-ai-starter/docs/ROLES_AND_PERMISSIONS.md)

---

## Concept mapping

| CNA concept | In CNA (idea) | afenda equivalent | Gap / note |
|-------------|----------------|-------------------|------------|
| Tenant in URL | `/t/[tenant]` segment | Session **`activeOrganizationId`** + guards in [`lib/tenant.ts`](../../lib/tenant.ts) | No host/slug routing in this repo yet; tenant is **session-selected org**. |
| Session | Auth.js `auth()` | Better Auth via [`getAuthSession`](../../lib/session-cache.ts) / `auth.api.*` in [`lib/auth/`](../../lib/auth/) | Different APIs; same layer (server-validated session). |
| Edge/middleware auth | Auth.js middleware callbacks | [`proxy.ts`](../../proxy.ts) — **`getSessionCookie`** presence only → `/sign-in?callbackUrl=` | Aligns with Next.js guidance: **no DB/auth logic** in proxy; real checks in RSC / Server Actions ([Next.js authentication guide](https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/02-guides/authentication.mdx)). |
| PBAC / `hasPermission` | DB-backed checks | [`canActInOrganization`](../../lib/auth/permission.server.ts), [`getOrgMemberRole`](../../lib/auth/permission.server.ts), **member/admin/owner** ladder | CNA may use arbitrary permission keys; here **org roles** + global admin bypass — extend only with schema/product need. |
| Session permission hints for UI | Allowed for UX only | Same rule: nav/UI hints **never** sole authorization | Server Actions must call `requireOrgSession` / `canActInOrganization`. |
| Invitations & membership UX | Tenant invitations, roles | Better Auth org plugin + [`app/[locale]/account/organization/`](../../app/[locale]/account/organization/), [`app/[locale]/accept-invitation/`](../../app/[locale]/accept-invitation/), [`invitation-guard.server.ts`](../../lib/auth/invitation-guard.server.ts), `org.*` audit | **Shipped:** invites + membership management; org audit UI + CSV export ([`organization-audit-csv/route.ts`](../../app/api/integrations/organization-audit-csv/route.ts)); CSV footer verify [`verifyOrganizationIamAuditExportCsv`](../../lib/auth/org-audit.server.ts); rate limits [`org-invite-rate.server.ts`](../../lib/auth/org-invite-rate.server.ts). **E2E (optional):** [`org-admin-audit.spec.ts`](../../tests/e2e/org-admin-audit.spec.ts) (`E2E_ORG_ADMIN_*`), [`org-invite-optional.spec.ts`](../../tests/e2e/org-invite-optional.spec.ts) (`E2E_ORG_INVITE_*`). **Infra:** env-gated `@better-auth/infra` — [AGENTS.md](../../AGENTS.md) §5. **Deferred:** afenda-node URL tenancy. |

---

## Better Auth (MCP / official docs)

- **Organization plugin:** [better-auth.com/docs/plugins/organization](https://www.better-auth.com/docs/plugins/organization) — `organization()`, client `organizationClient()`, server `auth.api.*` with `headers: await headers()` for cookie-bound calls.
- **Active organization:** Session carries `activeOrganizationId`; OAuth provider notes when org plugin is used ([OAuth provider orgs](https://www.better-auth.com/docs/plugins/oauth-provider#organizations)).
- **This repo:** `organization()` is registered in [`lib/auth/config.server.ts`](../../lib/auth/config.server.ts); ERP and account surfaces use [`requireOrgSession()`](../../lib/tenant.ts) for tenant scope.

---

## Next.js 16 (Context7 — `/vercel/next.js` v16.1.x)

- **Authorization in Server Actions:** Verify session/role **inside** each `'use server'` action; optional [`forbidden()`](https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/03-api-reference/04-functions/forbidden.mdx) / [`unauthorized()`](https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/03-api-reference/04-functions/unauthorized.mdx) when appropriate — client-only UI is insufficient ([authentication.mdx](https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/02-guides/authentication.mdx)).
- **RSC / `cookies` / `headers`:** Using them opts into dynamic rendering where applicable; acceptable for session-backed pages.

Repository contract mirrors this in [AGENTS.md](../../AGENTS.md) (Server Action checklist, `proxy.ts` narrow matcher).

---

## WP-05 resume checklist (when prioritized)

1. **Product flows:** Invites, accept/reject, member list management, role changes — prefer **Server Actions** calling `auth.api.*` with validated headers, not ad-hoc route handlers (dashboard CRUD policy in AGENTS).
2. **Guards:** Start mutations with [`requireOrgSession`](../../lib/tenant.ts); enforce role with [`canActInOrganization`](../../lib/auth/permission.server.ts) (`member` / `admin` / `owner` as required).
3. **Audit:** After successful DB writes, emit **`org.<object>.<verb>`** via [`writeIamAuditEvent`](../../lib/auth/audit.server.ts) from `#lib/auth`, per [IAM audit policy (ERP)](../../AGENTS.md#iam-audit-policy-erp).
4. **Naming:** Stable action strings (e.g. `org.member.invite`, `org.member.role.update`) for reporting.

---

## Out of scope (this document)

- Migrating to Auth.js / Auth0.
- Copying CNA directory layout or Vitest/Jest/Storybook choices.
- New API families outside [AGENTS.md](../../AGENTS.md) allowed `app/api/*` trees.
