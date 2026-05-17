# ADR-0027: Ask-Docs Quality Standard (ADQS)

**Status:** Accepted  
**Date:** 2026-05-18  
**Rule:** `.cursor/rules/ask-docs-directory.mdc` § ADQS  
**Agent skill:** `.agents/skills/adqs/SKILL.md`

---

## Context

`content/ask-docs/` grew to 68+ MDX pages across HRM, Orbit, Lynx, portals, and getting-started. Generator stubs, relative-only Related links, and unaudited prose produced uneven quality for humans, search (Orama), and Public Lynx (`app/api/chat`).

Mechanical gates existed for links (`lint:ask-docs-links`) and prose (`lint:ask-docs-prose`) but not for page skeleton, stub strings, or corpus tier visibility.

## Decision

Adopt **ADQS — Ask-Docs Quality Standard** with target **≥47.5/50 (95%)** per page before merge.

### Six dimensions (/10 each)

| # | Dimension | 95% requires |
| --- | --- | --- |
| 1 | Frontmatter | `title`, `description` (≥8 chars), `audience`, `status`, Lucide `icon`; `lastReviewedAt` when `status: stable` |
| 2 | Structure | `## Overview` → `## Before you start` → workflow → optional `## Troubleshooting` → `## Related` |
| 3 | Fumadocs components | Non-placeholder `<Steps>` (≥3 when workflow exists); ≥1 `<Callout>`; `<Cards>` in Related; `<Accordions>` / `<Tabs>` when multi-path or FAQ |
| 4 | Code-verified accuracy | Paths match App Router; read-only vs mutate correct; step-up and audit match implementation |
| 5 | Link graph | ≥2 `/ask-docs/…` links in Related; passes `lint:ask-docs-links` |
| 6 | LLM / search | No stub comments; clear `##` headings; no Workbench jargon on `audience: employee` portal pages |

**Archetypes:** `workflow` · `readonly` · `stepup` · `hub` — `pnpm gen ask-doc --archetype …`.

**Gold patterns:** `getting-started/quick-start.mdx`, `hrm/documents.mdx`, `portals/employee.mdx`.

### Mechanical enforcement

| Gate | Script | CI |
| --- | --- | --- |
| Stub / Related / frontmatter | `pnpm lint:ask-docs-quality` | `pnpm lint` / `pnpm verify` |
| Corpus tier report | `pnpm audit:ask-docs-quality` | local / PR review (output → `.artifacts/ask-docs-quality-audit.txt`) |
| Internal links | `pnpm lint:ask-docs-links` | yes |
| Prose style | `pnpm lint:ask-docs-prose` | yes |

Locale index pages (`index.{locale}.mdx`) are **partial-exempt** in the heuristic audit (floor 40/50).

### Agent workflow (embedded — not opt-in)

Agents editing `content/ask-docs/**` must apply `.agents/skills/adqs/SKILL.md` without separate skill invocation. ADQS composes:

1. **documentation-audit** — grep routes, permissions, audit strings
2. **technical-writing** — internal-guide prose (`mode: internal-guide`)
3. **Fumadocs MDX** — component shelf (`<Steps>`, `<Callout>`, `<Cards>`)

Repo-local skill copies live under `.agents/skills/{adqs,documentation-audit,technical-writing}/`.

## Consequences

- **Positive:** Predictable page shape; Public Lynx and Orama ingest higher-signal markdown; PRs can cite tier A/B/C from audit artifact.
- **Negative:** Hub and index pages need explicit Related graphs with `/ask-docs/…` paths (relative `./` alone does not score).
- **Follow-up:** Locale index parity (9 Tier B partial-exempt pages) optional; not blocking merge when English corpus is Tier A.

## References

- `.cursor/rules/ask-docs-directory.mdc`
- `scripts/lint-ask-docs-quality.mjs`
- `scripts/audit-ask-docs-quality.mjs`
- `turbo/generators/config.ts` (`ask-doc` generator + archetype templates)
