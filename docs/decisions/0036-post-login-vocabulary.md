# ADR-0036 — Post-login product vocabulary (bootstrap, not console)

**Status:** Accepted  
**Date:** 2026-05-19  
**Supersedes (product naming):** Post-login URL/product **`console`** in ADR-0003 (amended 2026-05-19)  
**Relates to:** [ADR-0003](0003-post-login-loading-bay-nexus.md) · [ADR-0035](0035-three-layer-surface-ide-anti-drift.md) · `.cursor/rules/bootstrap-directory.mdc`

---

## Context

The post-login **`/console`** segment collided with unrelated “console” language (operator console, coordination console, `console.log`, vendor URLs). Agents and humans could not tell **org bootstrap** from **platform admin** or ERP coordination surfaces.

---

## Decision

### Product names (locale-internal paths)

| Concern | URL | Module | Retired |
| --- | --- | --- | --- |
| First-run setup (0 orgs) | `/bootstrap` | `#features/bootstrap` | `/console` |
| Org resolution + multi-org picker | `/o` | `#features/bootstrap` (`resolvePostLoginOrgDispatch`) | picker-only `/console` |
| Session reverify | `/o/{slug}/iam-profile/reverify`, `/platform/reverify` | `#features/iam-profile`, `#features/platform-admin` + `#lib/auth` | `session-expired?step_up` as primary UX |
| Operational home | `/o/{slug}/nexus` | `#features/nexus` | — |

### Hard delete policy

- **No** `next.config` redirect from `/console` to `/bootstrap` or `/o`.
- **No** `COMPAT:` shims or `_SEAL.md` preserving the old product name.
- Delete in the same PR: `app/.../console/`, `lib/features/console/`, `components2/console/`, `buildAppShellConsoleUtilityBarSlots`.

### Keep using “console” elsewhere

Unrelated product or vendor uses stay unchanged: platform **operator console**, coordination **console**, `Common.loadingConsole` (legacy key id), Neon/Upstash **console** URLs, payroll operator copy.

### Three-layer shape

One product name **`bootstrap`** across `app/.../bootstrap/`, `lib/features/bootstrap/`, `components2/bootstrap/`. Org dispatcher lives on **`/o`** but remains owned by the bootstrap feature module (see ADR-0035).

---

## Consequences

- Grep for post-login product uses `features/console`, `components2/console`, `href="/…/console"` in app code — not vendor/docs-only hits.
- `ORG_REQUIRED` and sign-in defaults target **`/o`**, not `/console`.
- `revalidatePath` targets `/bootstrap` or org patterns — never `/console`.

---

## References

- [ADR-0003 — Post-login loading bay and Nexus routing](0003-post-login-loading-bay-nexus.md)
- [ADR-0035 — Three-layer surface IDE anti-drift](0035-three-layer-surface-ide-anti-drift.md)
