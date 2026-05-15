# ADR-0001 — Afenda Spatial OS: operational shell architecture


| Field                  | Value                                                                                                                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**             | Accepted                                                                                                                                                                                                                                                                                           |
| **Date**               | 2026-05-10                                                                                                                                                                                                                                                                                         |
| **Amended**            | 2026-05-10 — tightened reference hierarchy, stable-identifier rule, L1 non-authority, L3 module location (`lib/features/command/`), L4 dock-order stability + token contract, layer rendering contract, conformance criteria (§12) · **Renumbered ADR-0005 → ADR-0001** (decisions ledger cleanup) · **2026-05-10** — added §13 *Material semantics — adoption layer* (4-phase model, runtime state machine, surface adoption table, Lynx state vocabulary) + extended §12 conformance criteria #11 · **2026-05-11** — **ADR-0005**: canonical post-login chrome implements in **`components/workbench/`** (`WorkbenchShell`, etc.); **`components/nexus/`** narrows to Nexus page surface + Lynx summon |
| **Supersedes**         | Prior **product semantics** for dashboard chrome: “sidebar ERP”, “module website”, “dashboard portal”, and “SaaS admin panel” as the defining metaphor. Prior OSS-oriented shell guidance is **demoted** to non-authoritative synthesis where this ADR conflicts (see §11).                        |
| **Does not supersede** | **§ Locale-first routing**, **tenant/session authority**, `**proxy.ts` narrow gate**, **Server Actions mutation boundary**, **IAM audit policy**, or **module import boundaries** in `**AGENTS.md`** — this ADR governs **shell UX architecture and composition intent**, not stack security.      |
| **Implements in code** | **`components/workbench/`** (Workbench shell — L1/L3/L4 wiring), **`components/nexus/`** (Nexus page at `/o/{slug}/nexus` + Lynx summon), dashboard **route** layouts under `app/[locale]/o/[orgSlug]/dashboard/**`, nav registries adjacent to **`lib/dashboard-module-paths.ts`**, `workbench-command.tsx`, and (target) **`lib/features/command/`** for the L3 registry + intent pipeline                         |
| **Related rules**      | `**.cursor/rules/shell-directory.mdc**` (Workbench shell `components/workbench/**` + Nexus product surface `components/nexus/**`) · `**.cursor/rules/frontend-quality-contract.mdc**` §11 (geometry ownership)                                                                                |


---

## 1. Context

Traditional ERP interaction optimizes **hierarchical discovery**:

```txt
navigation → module → page → form
```

Afenda intentionally targets an **operational cognition environment**. Reference systems contribute to that target on **different axes** — they must not be composed naïvely, because their motion and density philosophies contradict each other. This ADR adopts a **dominant axis** and treats the rest as **aspect borrowings**:


| Role         | Source                                   | What we borrow                                                                      | What we explicitly reject                           |
| ------------ | ---------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Dominant** | **Palantir sobriety + Linear precision** | Calm chrome, evidence-first density, monochrome restraint, keyboard-first execution | —                                                   |
| Aspect       | macOS                                    | **Spatial consistency** of dock and command surfaces                                | Bouncing icons, playful motion, generous whitespace |
| Aspect       | Bloomberg Terminal                       | **Information density** without toy UI                                              | Color-coded chromatics, simultaneous-window chaos   |
| Aspect       | visionOS                                 | **Subtle depth** for layer separation                                               | Parallax, gestural showmanship                      |


This ADR records the **authoritative shell philosophy** that replaces “portal/sidebar ERP” as the organizing metaphor for **all dashboard chrome work**.

---

## 2. Decision

Afenda’s dashboard shell is an **Operational Spatial Operating System** composed of **four fixed layers** (§3). User movement optimizes **repeated operational navigation** (spatial memory, dock position, command intent) rather than **deep tree discovery**.

**Canonical interaction spine:**

```txt
intent → operational surface → execution → truth resolution
```

**Naming discipline (product copy and shell labeling):** prefer **surfaces / systems / domains / operations / execution spaces / truth surfaces** over **modules / apps / sections / menus** where it does not violate stable route slugs or registry keys.

**Stable identifier hierarchy (authoritative when copy and code disagree):**

```txt
route slug  >  audit action prefix  >  i18n key  >  user-visible label
```

Renaming reaches **only** the user-visible label. Route slugs (`/dashboard/contacts`, `/dashboard/sale`, …), audit prefixes (`erp.<module>.<object>.<verb>`, `org.<object>.<verb>`, …), and i18n namespace keys are **immutable** under this ADR — changing any of them requires a separate migration ADR with a documented data-plane plan (`messages/*.json`, `iam_audit_event` reporting, route redirects).

---

## 3. The four-layer spatial model

Layers are **ordinal** (L1 outermost → L4 anchoring). Lower layers must not visually or behaviorally contradict higher-layer contracts.

```txt
┌──────────────────────────────────────┐
│ L1 — Utility / Status Layer          │  ← system consciousness (thin, persistent)
├──────────────────────────────────────┤
│ L2 — Workspace Surface               │  ← immersive execution (main operational field)
│                                      │
│        (immersive execution)         │
│                                      │
├──────────────────────────────────────┤
│ L3 — Command / Intent Layer          │  ← Cmd+K, semantic routing, NL → intent (not authority)
├──────────────────────────────────────┤
│ L4 — Spatial Dock                    │  ← operational movement memory (not module tree)
└──────────────────────────────────────┘
```

### 3.1 L1 — Utility / Status Layer

**Purpose:** **Not navigation.** This layer is **system consciousness**: operational and environmental awareness, org context, sync, AI *state* (not AI control surface), operator identity.


| Property     | Direction                                                 |
| ------------ | --------------------------------------------------------- |
| Height       | ~40–48px (target band; exact px is implementation detail) |
| Tone         | calm                                                      |
| Density      | minimal                                                   |
| Presence     | persistent                                                |
| Visual style | translucent glass (semantic tokens — no raw palette)      |
| Behavior     | stable                                                    |


**Allowed (conceptual zones)**


| Zone   | Elements                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------- |
| Left   | Lynx identity; organization; environment; workspace mode                                                         |
| Center | Command search; truth search; **Cmd/Ctrl+K** entry                                                               |
| Right  | Sync state; notifications; AI **state** indicator (display-only); operator profile; restrained operational pulse |


**Non-authority constraint (right zone):** L1 displays **state only**. It must never host verbs that mutate ERP truth (`Apply`, `Run`, `Approve`, `Post`, `Confirm`, `Submit`, …) or AI control surfaces (prompt input, result acceptance, tool invocation). Mutation verbs live in L2 surface forms or L3 confirmation steps where the registry → permission → policy → audit pipeline runs.

**Forbidden**

- Module navigation trees, mega menus, or “app launcher” grids in L1
- Giant buttons, colorful launchers, workflow ribbons
- Crowded controls and large decorative action clusters
- ERP mutation verbs anywhere in L1
- AI control surfaces (prompt input, accept/reject of LLM proposals, tool buttons) — those belong in L2/L3

### 3.2 L2 — Workspace Surface

**Purpose:** The **immersive execution environment** — not a generic webpage or marketing dashboard. This is where operators **execute**, review evidence, and resolve truth.

**Examples of intentional renaming** (user-facing labels / dock titles — routing slugs and audit prefixes remain stable per §2):


| Legacy ERP framing | Spatial framing (examples) |
| ------------------ | -------------------------- |
| Accounting         | Cashflow                   |
| CRM                | Pipeline                   |
| Inventory          | Stock Integrity            |
| HR                 | Workforce                  |
| Reports            | Operational Intelligence   |
| Search             | Truth Search               |


Exact strings ship via `**messages/*.json`** and product governance; this table is **directional**.

**Concurrency:** **one L2 surface at a time per route segment.** Multi-surface stacking (split views, in-app tabs, side-by-side workspaces) is **out of scope** for this ADR — defer to a follow-up ADR if the operational case is proven (see §10).

### 3.3 L3 — Command / Intent Layer

**Purpose:** **Intent resolution infrastructure**, not “simple search.”

**Responsibilities**

- Command execution (deterministic, registry-backed)
- Natural language interpretation (**candidate** intent only)
- Truth traversal (navigation to authoritative records/views)
- Operational routing (open surface, focus inspector, prepare execution)
- Workflow initiation (hand-off to governed execution paths)
- Evidence resolution (jump to artifacts where policy allows)
- Execution preparation (validated payloads before commit)

**Correct pipeline (non-negotiable ordering conceptually)**

```txt
Input
→ Intent classification
→ Truth resolution
→ Permission validation
→ Policy validation
→ Execution surface
→ Audit evidence
```

**Module location (canonical):** L3 belongs at `**lib/features/command/`** as a first-class feature module per `AGENTS.md` §6 (`actions/`, `data/`, `schemas/`, `components/`, `index.ts`). The palette UI (`nexus-command-layer.tsx` + context) is a **thin client island** that calls `command.*` Server Actions. The NL classifier is supplied by `**#features/lynx`** as **one input**; Lynx never bypasses the registry and never owns the commit path.

**Truth Search composition (one capability, three surfaces):**


| Surface                  | Role                                              | Owner                                            |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------ |
| L1 center input          | Entry control + status                            | `components/nexus/` (chrome)                 |
| L3 pipeline              | Intent → results, ranking, permission gating      | `lib/features/command/`                          |
| Retrieval implementation | Embedding query, source-blind retrieval, evidence | `lib/features/lynx/` (via `#features/knowledge`) |


No parallel “truth search” implementation may exist in `components/nexus/**`.

**Phased rollout note:** today’s `command-palette.tsx` ships as **navigation-only** (modules / orgs / admin per `shell-directory.mdc`). The pipeline above is the **target shape**; intermediate increments must add capabilities in pipeline order — they may not bypass intent classification, permission validation, or audit once those steps exist.

### 3.4 L4 — Spatial Dock

**Purpose:** The **operational movement system** — spatial operational memory (“Cashflow is left of Pipeline”), **not** a sidebar taxonomy, mega menu, or nested module tree.

**Dock position is preference-based**, not free-form UI chaos:


| Position | Psychological mode (product intent) |
| -------- | ----------------------------------- |
| Bottom   | Creator / operator                  |
| Left     | Enterprise workstation              |
| Right    | Analyst mode                        |
| Top      | Compact operations                  |


**Authoritative setting:** **Settings → Dock position** (or equivalent org/user preference store). Dock geometry respects **layout ownership** (shell owns viewport partitioning; features do not renegotiate — `**.cursor/rules/frontend-quality-contract.mdc`** §11).

#### Dock order stability — non-negotiable

- Dock order is **stable per (user, org)** preference; never auto-reordered by recency, AI, frequency, or analytics.
- **Tier A primary anchors** (e.g. Truth Search, Cashflow, Pipeline, Stock Integrity, Workforce, Operations, Evidence, iThink) are **fixed in registry order** — defined in `lib/dashboard-module-paths.ts` + nav registry, not by client heuristics.
- **Tier B utilities** are user-pinnable but **never auto-shuffled**.
- If recency or recommendations are needed, surface them inside L3 (palette suggestions), not by reordering L4.

This stability is what makes “spatial memory” a real claim rather than marketing copy.

#### Dock icon tiers


| Tier                         | Size target | Role                                                                                                                                           |
| ---------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary operational surfaces | ~33px       | **Gravitational anchors** — stronger focus, higher priority (Truth Search, Cashflow, Stock Integrity, Workforce, Operations, Evidence, iThink) |
| Secondary utilities          | ~28px       | Quieter utilities (backup, monitoring, settings, documents, storage)                                                                           |


Pixel literals are **defaults**, not contracts — both tiers consume a `--shell-density` token (`compact | comfortable`) so user/org density preferences scale the dock coherently.

#### Dock visual states (token contract — no raw palette)


| State  | Token mapping                                                                         |
| ------ | ------------------------------------------------------------------------------------- |
| Idle   | `bg-card text-muted-foreground` — monochrome, glass calm                              |
| Hover  | `bg-muted/60 ring-1 ring-border` — subtle illumination (no `hover:bg-primary/…`)      |
| Active | `ring-primary shadow-elevation-2` (or a dedicated `--ring-operational` if introduced) |
| Alert  | restrained pulse keyframe **wrapped in** `motion-reduce:animate-none`                 |


**Forbidden dock theatrics:** rainbow effects, oversized badges, notification spam, “gaming launcher” motion, parallax on hover, recency-driven reordering.

---

## 4. Visual and motion doctrine

**Afenda reads as:** industrial precision, calm density, seriousness. **Palantir sobriety + Linear precision** dominate; macOS / Bloomberg / visionOS contribute single aspects only (§1).

**Motion**

- Allowed: subtle, weighted, intentional, spatial, calm — **always wrapped in `motion-reduce:` variants**
- Forbidden: bouncing icons, playful delight spam, chaotic floating chrome, parallax showmanship, “gaming launcher” effects

---

## 5. AI / LLM role (Gemini or any provider)

**LLM is an interpreter, never operational authority.**

**Forbidden pattern**

```txt
LLM → direct mutation
```

For finance, payroll, approvals, procurement, inventory, compliance, or any Tier A/B ERP write (`**AGENTS.md**` — IAM audit policy), natural language may propose **candidates** only. Commits require:

1. **Static command registry** — authoritative commands, schemas, permissions, bindings
2. **NL → candidate intent** (LLM or deterministic parsing)
3. **Validation layers** — Zod, permission engine, policy engine, truth checks, execution verification
4. **Human/automation gate** per product policy — then Server Actions / workflows write truth + audit

**L1 non-authority (explicit):** the L1 AI state indicator displays **state only** (`idle | thinking | proposed | awaiting confirmation`). It must **not** host:

- mutation verbs (`Apply`, `Run`, `Approve`, …)
- prompt input or chat surfaces
- result acceptance / rejection controls

These belong in L2 surface forms or L3 confirmation steps where the §3.3 pipeline runs end-to-end.

---

## 6. State architecture (aligned with this repo)

This ADR’s **conceptual stores** map to `**AGENTS.md`** / Next.js doctrine as follows:


| Conceptual store | Allowed implementation                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **System**       | Server authority (`requireOrgSession`, layouts); minimal client mirrors only for UI chrome                                                                                           |
| **Spatial**      | Persisted preferences (cookies / DB / user settings) + thin client sync; **no** client-owned tenant truth                                                                            |
| **Command**      | Ephemeral UI (palette open state, pending intent); registry and execution remain server-validated                                                                                    |
| **Workspace**    | Server Components + Server Actions for truth; TanStack Query **only** for genuine client-interactive async surfaces; Zustand only for shell/UI globals that are not tenant authority |


**Hard rule:** Do not duplicate server ERP truth into client stores “for convenience.” **TanStack Query is not a replacement for RSC** for initial page truth.

**Layer rendering contract** (maps Spatial OS layers onto the App Router runtime contract — `nextjs-best-practices.mdc` §2 Tier A blocking / Tier B streamable):


| Layer        | Render mode                                                                                                               | Notes                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| L1 Utility   | **Synchronous from layout authority** (Tier A only — `requireOrgSession`, locale, identity)                               | No streaming gaps; identity must not flicker                          |
| L2 Workspace | **Streamed via Suspense** (Tier B enrichment streams beneath Tier A skeleton)                                             | Skeletons match real geometry, not generic gray boxes                 |
| L3 Command   | Palette **opens in <16ms** — registry data ships in initial bundle; NL classifier and remote retrieval are **async-only** | Never block the open animation on network                             |
| L4 Dock      | **Synchronous from static registry**                                                                                      | No client-side recompute; presence/absence per role is server-decided |


Recommended animation tooling (**Framer Motion** or CSS-first motion) must stay **secondary** to calm defaults and respect **reduced-motion**.

---

## 7. Spatial cognition model


| Tradition                        | Afenda Spatial OS                                                    |
| -------------------------------- | -------------------------------------------------------------------- |
| Optimizes hierarchical discovery | Optimizes **repeated operational movement**                          |
| User recalls folder paths        | User recalls **relative spatial positions** and **intent shortcuts** |


---

## 8. Engineering principles

**Prefer**

- Server-first architecture, React Server Components, thin client islands
- Deterministic command registry, keyboard-first execution
- Calm interfaces, spatial consistency, truthful loading/error boundaries

**Avoid**

- Giant sidebars as primary mental model, mega ribbons, deep nested trees as the default
- Dashboard card spam used as a substitute for operational surfaces
- Consumer gamification and decorative AI chrome
- Any architecture where **AI overrides validation or owns commits**

---

## 9. Consequences for implementation

1. `**components/nexus/**`** must be composed so that **L1–L4** can be identified in code (split across files as ownership stabilizes — `**.cursor/rules/shell-directory.mdc`**).
2. **Primary navigation** migrates from “expand tree → module” to **dock anchors + command intent + workspace surface**; **registry data** (`nav-data`, `**lib/dashboard-module-paths.ts`**) encodes **primary vs secondary** dock tiers and stable route targets.
3. **L3 module** lives at `**lib/features/command/`** (per `AGENTS.md` §6); palette UI in `components/nexus/` is a thin client island only and must not duplicate registry data.
4. **Stable identifier hierarchy** (route slug > audit prefix > i18n key > label, §2) is enforced by review; renaming work touches the user-visible label layer only.
5. **Command palette** remains **navigation and intent preparation**, not an unconstrained “AI workspace” mutator.
6. **Geometry:** shell owns viewport partitioning; modules consume `**SidebarInset`** / layout slots — no nested competing sidebars (**frontend-quality-contract**).
7. **Dock visual states** resolve to design tokens (no raw palette utilities; see §3.4 token contract). All chrome motion wraps in `motion-reduce:` variants.
8. **i18n:** user-visible surface names ship through `**messages/*.json`**; ADR terminology guides copy, not URL segments or audit strings.

---

## 10. Non-goals

- Replacing locale-first URLs, org slug binding, or `**proxy.ts**` semantics
- Introducing AI-direct writes to ERP tables without validation and audit
- Mandating a specific dock pixel position in code without user/org preference
- Prescribing duplicate parallel nav registries outside the established dashboard path + capability patterns
- **Multi-surface concurrency** (split views, in-app tabs, side-by-side L2 workspaces) — single L2 surface per route segment until a follow-up ADR proves the operational case
- Auto-reordering, recency-sorting, or AI-driven dock layout
- Renaming route slugs, audit action prefixes, or i18n namespace keys to match user-visible relabeling (§2 hierarchy)

---

## 11. Relationship to third-party shell patterns

- Public dashboard templates and OSS write-ups (including generic shadcn admin shells) may illustrate composition tactics — they are **not** the product metaphor for Afenda.
- Where external patterns imply “dashboard portal” or “sidebar ERP” as the **defining metaphor**, **ADR-0001 wins**.
- `**.cursor/rules/shell-directory.mdc`** remains the **technical directory boundary** for `components/nexus/**` (forbidden imports, registry discipline) alongside Workbench shell ownership.

---

## 12. Conformance criteria

A surface conforms to Spatial OS when **all** of the following hold:

1. **L1 non-authority** — zero navigation-tree elements, zero ERP mutation verbs, zero AI control surfaces in L1.
2. **L4 stability** — dock order is preference-stable per (user, org); never recency-, AI-, or frequency-sorted.
3. **L3 pipeline integrity** — command resolution never bypasses `Input → Intent classification → Truth resolution → Permission validation → Policy validation → Execution surface → Audit evidence` (§3.3). NL classifier produces candidates only.
4. **Stable identifier hierarchy** — route slug > audit prefix > i18n key > user-visible label (§2). Diffs that rename slugs, audit strings, or namespace keys to match labels are out of contract.
5. **Truth Search composition** — wired through `#features/lynx` retrieval + `lib/features/command/` pipeline; no parallel implementation in `components/nexus/**`.
6. **Token-bound visuals** — dock and L1 states resolve to design tokens; no raw palette utilities (`hover:bg-primary/…`, hex literals, arbitrary `rounded-[…]` outside the allowlist).
7. **Reduced-motion respected** — every L1 / L4 animation wraps in `motion-reduce:` variants.
8. **Layer rendering contract honored** (§6) — L1 / L4 synchronous; L2 streamed via Suspense; L3 palette opens in <16ms with no network on the open path.
9. **No client-owned tenant truth** — no Client Component in `components/nexus/**` imports server-only modules, feature server barrels, or duplicates server-resolved tenant identity.
10. **Single L2 surface** — per route segment until §10 is amended.
11. **M3 hybrid material adoption** (§13) — `data-phase` values are restricted to the canonical state machine (§13.3); surface ↔ material assignments respect §13.5; dense reading surfaces use `.af-material-opaque`; Lynx state expresses via `.af-material[data-lynx]` only; retired tokens from §13.6 do not appear in TSX or CSS modules; visual intent flows through `--md-sys-*` (surface, elevation, motion, state) rather than legacy `--af-cognition-*` / `--af-glass-*` / `--af-blur-*` / `--af-depth-*` tokens.

A diff failing any of the above must either (a) bring the surface into conformance, or (b) amend this ADR in the same change.

---

## 13. Material semantics — Material 3 hybrid foundation

The Spatial OS shell is rendered on a **Material 3 hybrid token system** that lives in `app/globals.css`. Mirror rule: **`.cursor/rules/design-system.mdc`** (§ Material semantics). Mechanical enforcement: **`scripts/check-design-contract.mjs`** (CI-gated via `pnpm lint`).

> **2026 promotion note** — the cognition / glass / 3-tier blur foundation described in earlier revisions of this section is retired. Visual intent now flows through M3 surface roles, M3 elevation levels, M3 motion tokens, and M3 state-layer opacities. The Lynx vocabulary is preserved verbatim and re-mapped onto M3 surfaces. No new tokens were introduced in the promotion. See §13.5 / §13.6 for the retired token list.

### 13.1 Token chain (authoritative)

```txt
--af-brand-seed (oklch(0.36 0.048 305))
  -> --md-ref-palette-* (M3 reference palette: primary, secondary, tertiary, error, neutral, neutral-variant)
    -> --md-sys-color-* (M3 system roles: primary, surface-container-{lowest..highest}, on-*, outline, outline-variant, inverse-*)
       --md-sys-shape-corner-{xs..xl} / --md-sys-elevation-level{0..5} / --md-sys-motion-{easing|duration}-* / --md-sys-state-*-opacity / --md-sys-typescale-*
      -> shadcn aliases (--background, --primary, --card, --popover, --accent, --sidebar-*, --chart-*)
        -> Tailwind v4 @theme inline (text-display-large..text-label-small, bg-card, text-primary, …)
      -> --erp-{density|surface|control|field|table|menu}-* (ERP density contracts)
        -> --af-{control|field|table|menu}-* (back-compat aliases for existing TS components)
```

`--af-brand-hue` (305) and `--af-tertiary-hue` (238) parameterize the brand and information hues; every reference palette derives from them.

### 13.2 Phase model (4 phases — class names preserved)

```txt
shell        -> idle / settled        (surface-container + elevation-level1)
transition   -> hover / focus / typing (surface-container-high + elevation-level2)
cognition    -> resolving / execution  (surface-container-highest + primary-tinted border + elevation-level3)
opaque       -> dense reading surfaces (--card flat, no elevation)
```

The `cognition` class name is preserved for consumer compatibility; semantically it now reads as "highest opaque surface with primary-tinted border at elevation-level3" — no glass, no gradient, no blur. Phase mutation is driven by `data-phase` attributes; class names are stable.

### 13.3 Runtime state machine (canonical)

```txt
idle -> hover -> focus -> typing -> resolving -> execution -> settled
```

Forbidden runtime labels: `active`, `selected`, `open`, `loading`, `processing`, `ai`, `aiActive`. Components map their internal state into one of the canonical values above.

### 13.4 Lynx-on-M3 vocabulary (5 states, M3 tokens only)

`.af-material[data-lynx="…"]` rules express Lynx machine state through pure M3 surface roles. **No new tokens. No animations.** Each state is a static M3 surface + state-layer composition.

| `data-lynx` | M3 surface role | M3 elevation / border | Meaning |
| ---- | ---- | ---- | ---- |
| `listening` | `mix(tertiary-container 55%, surface-container)` | tinted `outline-variant` | Awaiting input / passive intelligence |
| `resolving` | `tertiary-container` | `elevation-level2`, `tertiary` border | Active truth retrieval |
| `high-confidence` | `primary-container` | `elevation-level2`, `primary` border | Resolved with confidence |
| `warning` | (inherit) | `error` border + 1px error ring | Low confidence / data conflict |
| `mismatch` | `error-container` | `error` border | Hard mismatch / contradiction |

Mirrors `.cursor/rules/lynx-knowledge.mdc`. Banned user-facing labels: *AI mode*, *Thinking*, *Processing*, *Generating*.

### 13.5 Surface adoption table (authoritative)

| Surface | Allowed material |
| ---- | ---- |
| Utility bar (L1) | `shell` only (paired with `.af-nexus-l1-chrome-backplate`) |
| Dock (L4) | `shell` |
| Command palette (L3) | `shell` -> `transition` -> `cognition` (palette overlay blur is owned by shadcn `CommandDialog`, not by `.af-nexus-popover-panel`) |
| Lynx resolution surfaces | `.af-material[data-lynx]` (5 states above) |
| Modals | `shell` or `transition` |
| Toasts | `shell` only |
| Evidence cards | restrained `cognition` (no high-confidence default) |
| Workspace container | `shell` only |
| Dense tables / ledgers / inventory grids | `opaque` only |
| ERP forms | `opaque` or light `shell` |
| Audit logs / evidence timelines | `opaque` only |

Violations require an ADR amendment in the same change.

### 13.6 Retired tokens (drift detectors enforced in CI)

The 2026 M3 promotion retired the following identifiers. They are forbidden anywhere outside `app/globals.css` and most are forbidden in `app/globals.css` as well — express the intent through the M3 chain in §13.1.

```txt
--af-water-*                   (legacy rename, never re-add)
--af-cognition-*               (use --md-sys-color-surface-container-highest + --md-sys-color-primary border)
--af-glass-*                   (use --md-sys-color-surface-container)
--af-resolution-*              (use --md-sys-color-tertiary-container or --md-sys-color-primary-container)
--af-blur-{shell|command|resolution}   (no blur tier — M3 surfaces are opaque)
--af-sat-*                     (color saturation lives inside M3 tonal palette tones)
--af-depth-*                   (use --md-sys-elevation-level{0..5})
--af-current-strength, --af-ripple-strength, --af-flow-angle  (no flow vector — Lynx state is static)
--af-material-edge, --af-material-highlight                   (use --md-sys-color-outline-variant)

.af-material-water             (use .af-material-shell + data-phase or .af-material[data-lynx])
.af-material-transitioning     (renamed to .af-material-transition)
af-pressure-pulse              (express via .af-material[data-lynx="warning"] static border)
af-unstable-refraction         (express via .af-material[data-lynx="mismatch"] static surface)

data-layout-density="compact|relaxed"   (CSS toggle removed; re-add :root[data-layout-density] block first)
```

The `cognition` / `glass` / `water` words may still appear in product copy, ADR narrative, or marketing language. They no longer have engineering tokens behind them.

### 13.7 Forbidden patterns (mechanical, outside `app/globals.css`)

- inline `style={{ backdropFilter: ... }}` and `style={{ willChange: ... }}`
- Tailwind arbitrary blur (`backdrop-blur-[…]`, `blur-[…]`)
- Tailwind scaled `backdrop-blur-{sm..3xl}` inside `components/nexus/**`
- `animation: … infinite` (continuous motion lives only in `app/globals.css` and must settle)
- any retired identifier from §13.6

### 13.8 Animation discipline

Pulses fire **3 iterations on entry, then settle**. Persistent state is communicated by static styling (`outline`, `border-color`, M3 surface role swap). All animations respect `prefers-reduced-motion: reduce`. Motion duration / easing must reference `--md-sys-motion-duration-*` / `--md-sys-motion-easing-*` (or their `--motion-*` aliases).

### 13.9 Performance discipline

`.af-material` carries `contain: paint`; `.af-material-opaque` carries `contain: layout paint`. `will-change` is no longer scoped (M3 surfaces are flat — there is no compositor-heavy blur to hint). It must never be applied via JSX inline style.

---

## 14. Summary

Afenda is not shipping **ERP software** as a traditional portal. It ships an **operational cognition environment** where **truth is spatial**, **movement is intentional**, **execution is immersive**, **command is semantic**, and **chrome stays calm**. All future shell work **implements L1–L4** and the **intent → surface → execution → truth** spine — incrementally, without breaking tenant security or server-first truth.