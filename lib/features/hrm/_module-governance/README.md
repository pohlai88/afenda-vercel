# `_module-governance/`

HRM-wide **mutation infrastructure** shared by every pillar’s Server Actions.

| Owns | Does not own |
|------|----------------|
| `requireHrmOrgTenantFromForm`, `requireHrmPermission`, `requireHrmAdmin` | Rail badges, Nexus pressure, snapshot UI |
| `hrmActionFailure` / coded action failures | Domain-specific `*-action-guard.server.ts` wrappers (stay in each submodule) |
| `isoDateOnlyToUtcDate` and related calendar helpers | Feature components and business queries |
| `buildGovernedHrmWorkbenchHeader` | |

**Import rule:** Pillar `actions/` and `data/*-action-guard.server.ts` import relatively. External surfaces use `#features/hrm/server`.

**Adding files:** Only for cross-pillar mutation/auth/calendar/header helpers with no single domain owner.
