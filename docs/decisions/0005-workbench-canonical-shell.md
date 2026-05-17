# ADR-0005 — Workbench: canonical shell name; Nexus narrows to a product surface

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-11 |
| **Supersedes** | The implicit naming convention in **ADR-0001 §3** that placed every layer of operational chrome under `components/nexus/` and labelled the org-root surface "Nexus Field." This ADR does **not** revoke ADR-0001's L1–L4 spatial model — only the directory and naming convention used to implement it. |
| **Does not supersede** | **ADR-0001 §3** four-layer model (L1 utility / L2 workspace / L3 command / L4 dock). **ADR-0001 §13** material semantics. **ADR-0003** post-login loading bay (`/console`) and `/o/{orgSlug}/nexus` URL stability. **AGENTS.md** stable-identifier rule (§2): route slugs, audit prefixes, i18n namespace keys are immutable here. |
| **Implements in code** | `components/workbench/` (canonical shell), `components/nexus/` (narrowed to one product surface), rename of `nexus-utility-*`, `nexus-dock`, `nexus-command-*`, `nexus-skip-to-main`, `nexus-global-shortcuts*` files, deletion of `nexus-shell.tsx`, `nexus-surface-chrome.tsx`, `account-operating-shell.tsx`, `account-surface.tsx`, and per-feature shell wrappers. |
| **Related rules** | `.cursor/rules/shell-directory.mdc` (Workbench shell + Nexus product surface in `components/workbench/**`, `components/nexus/**`) · Updated: `AGENTS.md` quickstart + Nexus runtime section, `frontend-quality-contract.mdc` §11 (geometry ownership). |

---

## 1. Context

ADR-0001 introduced **Nexus** as the org-scoped operating runtime — the chrome that wraps every authenticated org surface. The decision was sound; the *name* has since accumulated three distinct meanings:

1. **Nexus runtime / chrome** — the L1 utility bar, L4 dock, L3 command layer, global shortcuts, and surrounding wiring (`components/nexus/`)
2. **Nexus Field** — the org-root product surface at `/o/{orgSlug}/nexus` (orientation band, pressure, truth map, priority lanes, recent resolution)
3. **Nexus snapshot / lib/features/nexus/** — the data layer that backs the Field

The same word answers three different questions:

```txt
"What chrome is mounted on this page?"   -> Nexus runtime (a layout primitive)
"What page am I looking at?"             -> Nexus Field (a product surface)
"Where does that data come from?"        -> #features/nexus (a data module)
```

This collision worsened as the codebase added:

- `components/workbench-rail/` — a left rail component, named "workbench" because rails are ERP/account chrome
- `AccountOperatingShell` — its own bespoke shell composing Nexus utility bar + WorkbenchRail
- `OrgAdminWorkbenchShell` and `HrmShell` — feature-specific shells that re-implemented portions of the Nexus runtime
- `PlatformAdminShell` — operator-side shell with its own sidebar primitive

By 2026-05, four post-login surfaces (account, console, operator, org) each had their own near-duplicate chrome composition, and "Nexus" simultaneously labelled the runtime they all overlapped with **and** one specific product page they all linked to.

Operators, designers, and engineers writing PR descriptions could not tell which "Nexus" was meant from the prose alone. ESLint rules, knip suppressions, and rule globs all targeted `components/nexus/**` even when the intent was "the chrome layer," not "the org-root surface."

---

## 2. Decision

Adopt **Workbench** as the single canonical name for all post-login **layout chrome**. Narrow **Nexus** to a single canonical meaning: the **Nexus product surface** at `/o/{orgSlug}/nexus`.

### 2.1 The canonical name table

```txt
Workbench  = layout primitive (chrome)
Nexus      = product surface at /o/{orgSlug}/nexus
Lynx       = cognition / AI product (mounts inside Workbench)
iThink     = consequence-resolution product (renders inside WorkbenchSurface.children)
OneThing   = operational document product (renders inside WorkbenchSurface.children)
```

A Workbench page is a **page that uses Workbench chrome**. The **Nexus** is the specific page you see at `/o/{orgSlug}/nexus`. They no longer share a word.

### 2.2 "Nexus Field" is retired as a term

The phrase "Nexus Field" was an attempt to disambiguate "Nexus runtime" from "Nexus the page." Once "Nexus" has only one meaning (the page), "Field" adds nothing.

Use **Nexus** as the noun for the surface (e.g. "the Nexus", "the org's Nexus"). Drop "Nexus Field" from product copy, ADRs, code comments, and rule files. Where ambiguity could exist, prefer the URL: `/o/{slug}/nexus`.

### 2.3 Directory contract

| Directory | Owns | Examples |
|---|---|---|
| `components/workbench/` | All post-login layout chrome | `WorkbenchShell`, `WorkbenchUtilityBar`, `WorkbenchRail`, `WorkbenchSurface`, `WorkbenchDock`, `WorkbenchCommandLayer`, `WorkbenchSkipToMain`, `WorkbenchGlobalShortcuts`, all `workbench-utility-*` widgets |
| `components/nexus/` | The Nexus product surface, only | `NexusField` (renamed to `NexusPage` or kept as `NexusField` purely as the React component name — see §3.2), orientation band, truth map, pressure items, surface cards, nav panel |
| `lib/features/nexus/` | Nexus snapshot data layer | `getNexusSnapshot`, `NexusSnapshot` type — unchanged |

`Lynx*` components stay in `components/nexus/lynx-summon*.tsx` for now (Lynx is a product layer, not chrome). A future ADR may relocate Lynx to its own root directory if the surface area grows.

### 2.4 What stays stable (ADR-0001 §2 stable-identifier rule)

```txt
route slug  >  audit action prefix  >  i18n key  >  user-visible label
```

Renaming reaches **only** the user-visible label and component file paths. Specifically:

- **URL stays:** `/{locale}/o/{orgSlug}/nexus` — unchanged
- **Audit prefixes stay:** `erp.<module>.<object>.<verb>`, `org.<object>.<verb>`, `iam.*` — unchanged
- **i18n namespaces stay:** `Dashboard.*`, `OrgAdmin.*`, `PlatformAdmin.*`, `AccountSurface.*`, etc. — unchanged
- **Path builders stay:** `organizationNexusPath(orgSlug)` keeps its name — `nexus` here refers to the URL slug, which is stable

Component file paths and exported symbols change; route, audit, and i18n contracts do not.

### 2.5 ADR-0001 §3 layer names remain L1–L4

The four-layer Spatial OS model from ADR-0001 is unchanged. L1 / L2 / L3 / L4 are the right level of abstraction for *what each region does*. Workbench is the right name for *the directory and components that implement it*. The two are orthogonal.

| ADR-0001 layer | Implementation under Workbench |
|---|---|
| L1 — Utility / Status Layer | `WorkbenchUtilityBar` + child `workbench-utility-*` widgets |
| L2 — Workspace Surface | `WorkbenchSurface` (sticky header + scrollable main); page content rendered as `children` |
| L3 — Command / Intent Layer | `WorkbenchCommandLayer` + `WorkbenchCommandProvider` + `WorkbenchCommandContext` |
| L4 — Spatial Dock | `WorkbenchDock` |

---

## 3. Consequences

### 3.1 Code

A single PR ("Workbench Layout Canonical Shell") performs:

- **Move + rename** `components/nexus/nexus-utility-*.tsx` → `components/workbench/utility-bar/workbench-utility-*.tsx`
- **Move + rename** `nexus-dock`, `nexus-command-layer`, `nexus-command-context`, `nexus-skip-to-main`, `nexus-global-shortcuts.client` → `components/workbench/workbench-*`
- **Move + redesign** `components/workbench-rail/` → `components/workbench/left-nav-rail/` (slot contract v2: nav sections, polymorphic identity, badges, open `LucideIcon` props, footer ReactNode)
- **Delete** `nexus-shell.tsx`, `nexus-surface-chrome.tsx`, `account-operating-shell.tsx`, `account-surface.tsx`, `account-command-layer.tsx`, `console-top-nav-bar.tsx`, `org-admin-workbench-shell.tsx`, `org-admin-sidebar.tsx`, `hrm-shell.tsx`, `hrm-nav-sidebar.tsx`, `platform-admin-shell.tsx`, `platform-admin-sidebar.tsx`
- **New** `components/workbench/workbench-shell.tsx`, `workbench-surface.tsx`, `workbench-mobile-rail.tsx`
- **Migrate** every post-login `layout.tsx` to mount `WorkbenchShell`: account, console, operator, org root, org admin, dashboard envelope, HRM
- **Update** `data-nexus-capture-root` HTML attributes → `data-workbench-capture-root`

### 3.2 The Nexus Field component

The React component currently named `NexusField` is renamed to `NexusPage`. The directory name `nexus/` already conveys what it is, and a `Page` suffix matches the App Router page-level convention. No "Field" suffix survives in code or copy.

Migration PR action: rename `NexusField` → `NexusPage` in `components/nexus/nexus-field.tsx` (file rename optional but recommended for parity: `nexus-field.tsx` → `nexus-page.tsx`); update the single `app/[locale]/o/[orgSlug]/nexus/page.tsx` consumer.

### 3.3 Documentation

- **AGENTS.md** quickstart `Nexus runtime` row → `Workbench runtime` row; section header "Nexus runtime (org root)" remains because it describes the org-root *experience*, but the runtime ownership sentence reads `Workbench owns the OS.`
- **ADR-0001** receives an amendment note at the top: "Implementation directory renamed `components/nexus/` → `components/workbench/` per ADR-0005. Layer names L1–L4 unchanged."
- **ADR-0003** receives an amendment note: "Nexus Field" terminology retired; the surface is now simply "the Nexus" or `/o/{slug}/nexus`.
- **`.cursor/rules/app-shell-directory.mdc`** and **`.cursor/rules/workbench-directory.mdc`** are merged into **`.cursor/rules/shell-directory.mdc`** (same enforcement intent, combined directory globs).

### 3.4 Product copy

- "Nexus runtime" → "Workbench" (in engineering and design docs)
- "Nexus Field" → "the Nexus" (in product copy) or `/o/{slug}/nexus` (in technical writing)
- "Nexus shell" → "Workbench shell"
- "Nexus chrome" → "Workbench chrome"

User-facing strings already say things like "Open the Nexus" — these stay correct. Strings that say "Nexus runtime" or "Nexus shell" are engineering jargon that did not appear in product copy and need not be revised externally.

### 3.5 Tests and rules

- `tests/unit/account-operating-shell.dom.test.tsx` → `tests/unit/workbench-shell.dom.test.tsx`
- `tests/e2e/nexus-screenshot-utility.spec.ts` and similar files keep their names where they target the Nexus product page; spec descriptions and selectors update to match new component names where they target chrome
- `.cursor/rules/app-shell-directory.mdc` / `.cursor/rules/workbench-directory.mdc` → `.cursor/rules/shell-directory.mdc`
- `scripts/check-agent-contract.mjs` REQUIRED_FILES updated
- `knip.json` ignore globs updated

### 3.6 Cost and reversibility

- **Cost:** ~30 file moves, ~hundreds of import rewrites (mechanical), one PR, one round of E2E + visual verification. Single-author single-commit work avoids merge-conflict surface. Roughly equivalent in size to the ADR-0001 ratification PR.
- **Reversibility:** the rename is mechanical and round-trippable. Reverting would mean another mass-rename PR. The decision is reversible but not cheaply.

---

## 4. Alternatives considered

### 4.1 Keep `Nexus` everywhere; never introduce `Workbench`

- **Pro:** zero code churn, no rename PR.
- **Con:** preserves the three-meaning collision indefinitely. New engineers continue to ask "which Nexus?" for every PR. WorkbenchRail has to be renamed *back* to `NexusRail`, requiring its own churn.
- **Rejected:** the collision is structural, not stylistic; ignoring it pays compounding costs in every future PR description, ADR amendment, and code review.

### 4.2 Keep `Nexus` for chrome; rename only `Nexus Field` → "Nexus"

- **Pro:** smaller rename surface; preserves ADR-0001's "Nexus owns the OS" doctrine verbatim.
- **Con:** "Nexus" as a term still refers to both the chrome and the page. Users hear "go to Nexus" and don't know if it means "open the org-root page" or "go into the operating shell."
- **Rejected:** does not actually resolve the ambiguity it claims to fix.

### 4.3 Rename everything (chosen — this ADR)

- **Pro:** full coherence; one canonical name per concept; rules, knip, ESLint, ADR text all align.
- **Con:** the largest rename PR; brief period where ADR-0001 has an amendment header.
- **Accepted.**

---

## 5. Open questions

1. Does Lynx eventually need its own root directory (`components/lynx/`) once it grows beyond `LynxSummon`? Defer to a future ADR.
2. Should `lib/features/nexus/` remain at that path, or follow the renaming convention to `lib/features/nexus-page/` for symmetry? The data module backs the Nexus *surface* and stays — the surface name is "Nexus," so `lib/features/nexus/` is consistent. **No change.**
3. Should the `data-workbench-capture-root` attributes also include `data-surface="nexus"` on the Nexus surface for screenshot tooling? Implementation detail in the migration PR; no ADR-level decision needed.

**Resolved during review (2026-05-11):**

- Acceptance timing: ADR-0005 stays **Proposed** until the migration PR merges; the merge commit flips status to **Accepted**.
- React component name: `NexusField` → `NexusPage` (ADR §3.2 Option A) is binding for the migration PR.

---

## 6. Conformance criteria

A PR claiming to implement this ADR must:

1. Add `components/workbench/` containing the canonical shell components
2. Move and rename every chrome file from `components/nexus/` per §2.3
3. Leave only the Nexus product surface (and its data adapters) in `components/nexus/`
4. Migrate every post-login `layout.tsx` to mount `WorkbenchShell`
5. Delete every shell wrapper listed in §3.1
6. Ship `.cursor/rules/shell-directory.mdc` (successor to `app-shell-directory.mdc` + `workbench-directory.mdc`)
7. Add the ADR-0001 and ADR-0003 amendment notes per §3.3
8. Pass `pnpm verify` (lint, typecheck, knip, test:ci, format) and `pnpm test:e2e`
9. Result in zero `nexus-utility-`, `nexus-dock`, `nexus-command-`, `nexus-shell`, `nexus-surface-chrome`, or `nexus-skip-to-main` references in `app/`, `components/`, `lib/`, `tests/`, or `.cursor/rules/`

**App vs source (2026-05):** Post-login layouts import production shell from `#app-shell` (`components2/app-shell/workbench/`). Repo-root `components/` is hard-deleted — see AGENTS.md §6 *App vs source* and `.cursor/rules/never-restore-deleted-components.mdc`.
