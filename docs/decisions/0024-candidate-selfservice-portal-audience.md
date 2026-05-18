# ADR-0024 - Candidate Self-Service Portal Audience

| Field                  | Value                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**             | Accepted                                                                                                                                                                   |
| **Date**               | 2026-05-17                                                                                                                                                                 |
| **Supersedes**         | Nothing                                                                                                                                                                    |
| **Does not supersede** | ADR-0020 portal boundary; ESS (`employee-selfservice-portal`) remains the authenticated employee audience                                                                  |
| **Implements in code** | `lib/features/hrm/talent-management/candidate-selfservice-portal/`, `lib/portal/public-portal.server.ts`, `app/[locale]/p/[portalSlug]/(portal-public)/candidate/**`       |

---

## 1. Context

Recruitment needs an external candidate boundary separate from the internal
Workbench ATS (`recruitment-onboarding/`). Employee self-service already
uses a dedicated portal feature slice under `/p/{portalSlug}/employee/*` with
session-backed guards.

Candidates are not Workbench org members. They need anonymous job browsing,
structured applications, and magic-link status access without inheriting the
employee portal auth layout.

---

## 2. Decision

Add a **`candidate`** portal audience mirroring the ESS slice pattern:

| Concern            | Module / contract                                                                 |
| ------------------ | --------------------------------------------------------------------------------- |
| Portal feature     | `candidate-selfservice-portal/`                                                   |
| Portal audit       | `cssp.contract.ts` → `erp.hrm.cssp.*`                                             |
| Workbench ATS      | `recruitment-onboarding/` → `erp.hrm.recruitment.*`                       |
| Public careers     | `/{locale}/p/{portalSlug}/candidate/careers/*` — no signed-in session             |
| Application status | `/{locale}/p/{portalSlug}/candidate/applications/[token]/*` — magic-link gated    |

Route groups:

- `(portal-public)` — pass-through layout; `requirePublicCandidatePortal` only
- `(portal-auth)` — `requirePortalContext` + `PortalShell` for `/employee/*`

`proxy.ts` remains a coarse cookie gate. Anonymous candidate careers do not
receive ERP session requirements beyond locale normalization.

---

## 3. Consequences

- Portal home (`/p/{portalSlug}`) branches on audience: candidate → careers,
  employee → leave (existing).
- Shared recruitment mutations stay in recruitment data/actions; CSSP actions
  call them after portal-specific validation.
- No AI resume parsing in v1: structured profile + optional document attachment
  only.
- Governed renderers for careers/apply are deferred; hand-built RSC pages ship
  first (ADR-0021 follow-up).
