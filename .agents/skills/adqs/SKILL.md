---
name: adqs
description: >
  Afenda Ask-Docs Quality Standard workflow. Use automatically when authoring,
  reviewing, or improving content/ask-docs MDX. Composes documentation-audit
  (code-verified accuracy) and technical-writing (internal-guide prose) with the
  six-dimension ADQS rubric. Do not invoke sibling skills separately.
allowed-tools: Read Write Edit Glob Grep Bash
---

# ADQS — Ask-Docs Quality Standard

**Target:** ≥47.5/50 (95%) per page before merge.

**Announce at start:** "Applying ADQS workflow to [page path]."

This skill is **embedded in** `.cursor/rules/ask-docs-directory.mdc`. Agents editing `content/ask-docs/**` must follow this workflow without a separate skill invocation.

## Embedded skills (repo-local)

| Skill | Path | Role in ADQS |
| --- | --- | --- |
| `documentation-audit` | `.agents/skills/documentation-audit/SKILL.md` | Phase 1 — verify paths, permissions, audit strings against code |
| `technical-writing` | `.agents/skills/technical-writing/SKILL.md` | Phase 2 — internal-guide prose, headings, operator clarity |
| `fumadocs-mdx-structure` | user skill (Claude) | MDX frontmatter + section skeleton |
| `fumadocs-component-docs` | user skill (Claude) | `<Steps>`, `<Callout>`, `<Cards>`, `<Accordions>` |

## Six dimensions (/10 each)

| # | Dimension | 95% requires |
| --- | --- | --- |
| 1 | Frontmatter | `title`, `description` (≥8 chars, not duplicate of first paragraph), `audience`, `status`, contextual Lucide `icon`; `lastReviewedAt` when `status: stable` |
| 2 | Structure | `## Overview` → `## Before you start` → workflow → optional `## Troubleshooting` → `## Related` |
| 3 | Fumadocs components | Non-placeholder `<Steps>` (≥3 when workflow exists); ≥1 `<Callout>`; `<Cards>` in Related; `<Tabs>` / `<Accordions>` when multi-path or FAQ |
| 4 | Code-verified accuracy | Paths match App Router; read-only vs mutate correct; step-up and audit match implementation |
| 5 | Link graph | ≥2 `/ask-docs/…` links; hub + module doc where applicable; passes `lint:ask-docs-links` |
| 6 | LLM / search | No stub comments; clear `##` headings; no "relevant workspace" on `audience: employee` portal pages |

**Gold patterns:** `content/ask-docs/getting-started/quick-start.mdx`, `content/ask-docs/hrm/documents.mdx`, `content/ask-docs/portals/employee.mdx`.

**Archetypes:** `workflow` · `readonly` · `stepup` · `hub` — scaffold with `pnpm gen ask-doc --archetype …`.

## Phase 1 — Accuracy audit (from documentation-audit)

Before rewriting prose, verify against the codebase:

1. **Route paths** — grep `organization*Path`, `app/[locale]/o/**`, `app/[locale]/p/**` for the documented surface.
2. **Permissions** — grep `requireErpPermission` / portal guards for the module; document read vs create vs update.
3. **Audit strings** — grep `<module>.contract.ts` or `buildCrudSapAuditAction` for canonical action names.
4. **Mutation boundary** — Server Actions for ERP; no invented REST endpoints.
5. **Stub detection** — remove "coming soon", "will appear here", `Replace with concrete` placeholders.

Do not ship documentation that contradicts implementation.

## Phase 2 — Prose and structure (from technical-writing)

Mode: `internal-guide` for admin/developer pages; route employee portal pages to operator-facing clarity without Workbench jargon.

Apply [technical-writing quality checklist](../technical-writing/references/quality-checklists.md) — Internal guide checklist:

- Ownership / boundary / when-to-use stated early
- Local workflow is concrete
- Common pitfalls called out
- Avoid end-user tutorial language on admin docs

Section order (mandatory unless archetype exempts):

```mdx
## Overview
## Before you start
<!-- workflow: <Steps> with ≥3 <Step> when actions exist -->
## Troubleshooting   <!-- optional; use <Accordions> for FAQ -->
## Related
<Cards>...</Cards>
```

## Phase 3 — Mechanical gates

```bash
pnpm lint:ask-docs-links
pnpm lint:ask-docs-prose
pnpm lint:ask-docs-quality
node scripts/audit-ask-docs-quality.mjs
```

Tier target: **A** (≥47.5/50). Locale index pages (`index.{locale}.mdx`) are partial-exempt.

## Phase 4 — Score and report

After edits, state estimated score per dimension and new tier. If still below A, name the smallest missing element (e.g. "add Related Cards with 2 internal links").

## Forbidden

- Generator stubs or "coming soon" placeholders on `status: stable` pages
- Locale-prefixed links in MDX (`/en/ask-docs/…`)
- `#features/*` imports in docs pages (accuracy via grep only)
- Bare `/o/…` or `/sign-in` in user-facing copy — use `/{locale}/o/{orgSlug}/…` form
