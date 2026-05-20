# Shift Scheduling — follow-up plan (`sft_follow.md`)

**Authority:** `ARCHITECTURE.md` (product spec) · this file (implementation ledger vs disk).  
**Route:** `/{locale}/o/{orgSlug}/apps/hrm/shift-scheduling`  
**Module:** `lib/features/hrm/time-attendance/shift-scheduling/`

---

## Purpose

Close gaps between the six-slice delivery plan, enterprise AC table (HRM-SFT-001–030), and the running codebase. Maximize **metadata-driven UI** (Pattern B/C via `*-surface-builders.server.ts` + `GovernedPatternCListSection`). Keep **DRY / KISS / YAGNI**: one authoring surface, no LAM duplicate UI, no notification platform until a named org delivery channel exists.

---

## v1 scope boundary (explicit deferrals)

| ID          | Requirement                         | v1 decision                                                    |
| ----------- | ----------------------------------- | -------------------------------------------------------------- |
| HRM-SFT-004 | Roster by dept/team/location/entity | Assign by employee + date range only                           |
| HRM-SFT-009 | Dedicated rest/off assignment UX    | `rest`/`off` categories on templates; no separate rest planner |
| HRM-SFT-011 | Availability validation gate        | Conflict engine only (leave, overlap, rest, weekly cap)        |
| HRM-SFT-018 | Skill/role coverage                 | Deferred                                                       |
| HRM-SFT-022 | Swap return/override                | Approve/reject only                                            |
| HRM-SFT-025 | Publish/change notifications        | Publication row + audit; no email/push in this pass            |
| HRM-SFT-028 | Multi-dimensional reports           | Roster CSV export only                                         |

---

## Execution phases (this follow-up)

### Phase A — Documentation sync

- [x] Create `sft_follow.md` (this file)
- [x] Align `ARCHITECTURE.md` implementation notes + surface table with disk
- [x] Completeness matrix below reflects follow-up pass

### Phase B — Server gaps (actions + data)

| Work item                                           | Status |
| --------------------------------------------------- | ------ |
| Audit on recurrence rule create                     | Done   |
| Create coverage requirement                         | Done   |
| Create rotation cycle (+ step 0)                    | Done   |
| List my swap requests                               | Done   |
| Swap assignment choices                             | Done   |
| List roster publications                            | Done   |
| Normalize `db.query` → `db.select` in swap commands | Done   |

### Phase C — Metadata-driven UI

All eight `surfaceKey` values wired with `buildSft*ListSurfaceConfiguration` where applicable.

### Phase D — Page composition

`ShiftSchedulingPage` composes org lane + self-service `SftMySwapsSection`.

### Phase E — Verification

```bash
pnpm gate -- lib/features/hrm/time-attendance/shift-scheduling
pnpm gate:typecheck
pnpm lint:fixtures-parity
```

---

## Metadata-driven UI checklist

- [x] List sections use `buildSft*ListSurfaceConfiguration` + `SFT_LIST_SURFACE_IDS`
- [x] `data-testid="governed-list-section:{surfaceKey}"` on production lists
- [x] Client forms import `#features/hrm/client` only
- [x] Server sections: `Promise.all` for independent queries
- [x] Expected errors = action return values

---

## Completeness matrix (plan ↔ codebase)

Legend: **Done** · **Partial** · **Deferred**

| #   | Capability                 | Server   | Metadata UI | Notes                                       |
| --- | -------------------------- | -------- | ----------- | ------------------------------------------- |
| 1   | Shift template catalog     | Done     | Done        | List + create form                          |
| 2   | Assign / bulk assign       | Done     | Done        | Manage section                              |
| 3   | Recurrence create/apply    | Done     | Done        | Audit on create                             |
| 4   | Rotation create/apply      | Done     | Done        | Step 0 on create; multi-step admin deferred |
| 5   | Policy read/update         | Done     | Done        | Edit form                                   |
| 6   | Coverage req + compare     | Done     | Done        | Create + Pattern B                          |
| 7   | Swap submit (employee)     | Done     | Done        | My-swaps section                            |
| 8   | Swap approve/reject        | Done     | Done        | Pattern C inbox                             |
| 9   | Publish roster             | Done     | Done        | + publications list                         |
| 10  | Attendance compare         | Done     | Done        |                                             |
| 11  | CSV export                 | Done     | Done        |                                             |
| 12  | Conflict on assign         | Done     | N/A         | Server-side                                 |
| 13  | Self-service entry         | Done     | Done        | My-swaps lane                               |
| 14  | Notifications              | Deferred | N/A         | Publication stamp only                      |
| 15  | Skill/role coverage        | Deferred | N/A         |                                             |
| 16  | Dept/team roster filters   | Deferred | N/A         |                                             |
| 17  | Swap return/override       | Partial  | Partial     | Reject with reason only                     |
| 18  | Multi-step rotation admin  | Partial  | Deferred    | Single step on create                       |
| 19  | Rest/off dedicated planner | Partial  | N/A         | Template categories only                    |
| 20  | Availability gate          | Partial  | N/A         | Conflicts only                              |

---

## Related files

| Layer       | Path                                                 |
| ----------- | ---------------------------------------------------- |
| Page        | `components/shift-scheduling-page.tsx`               |
| Builders    | `data/sft-surface-builders.server.ts`                |
| Surface IDs | `data/sft-surface-metadata.shared.ts`                |
| Contract    | `sft.contract.ts`                                    |
| i18n        | `messages/en.json` → `Dashboard.Hrm.shiftScheduling` |
