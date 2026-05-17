# `_internal-cross-cutting/`

HRM **built-in integration and projection** code — not product domains (`employee-management`, `payroll-compensation`, …).

| Owns | Does not own |
|------|----------------|
| Workbench left-rail mapping + rail pressure badges | Server Action guards, ERP permission gates, calendar/FK helpers → `_module-governance/` |
| HRM snapshot board + delivery cron inputs | Domain mutations, feature pages under pillars |
| Nexus Field pressure export (`listHrmHighPressureForNexus`) | Org placement FK checks → `employee-management/organizational-chart-hierarchy/` |

**Import rule:** Other HRM pillars may import via relative path. Cross-module callers use `#features/hrm` / `#features/hrm/server` only — no deep imports from `app/`.

**Adding files:** Only when the concern is a shell/nexus/snapshot contract with no single domain owner. Prefer a named pillar submodule over dropping files here.
