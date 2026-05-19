# SEAL — Layer 3 · `components2/console/`

**Authority:** client UI + loading skeleton for post-login console bay. Domain truth stays in `#features/console`.

## Entry components

| Component | Role |
| --- | --- |
| `console-bootstrap-form.client.tsx` | Create first organization (Neon Auth org plugin) |
| `console-loading.tsx` | Suspense fallback skeleton for org list page |

## Import rules

- Actions: `#features/org-admin/client` for slug prep types; org create via `#lib/auth-client`
- Never `#features/console` server barrel from client files
- Never `#lib/auth` server barrel

## Forbidden

- DB queries, session guards, redirect logic — Layer 2 only
- Server orchestrators (`console-org-list-page`, pending invites section)
