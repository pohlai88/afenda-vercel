---
name: Lynx machine layer
overview: "Lynx = ERP product surface; The Machine = inference companion; Vercel AI SDK = implementation only. Knowledge = substrate. Canonical Intake replaces 'Structured Intake'. Phase 1 = /dashboard/lynx + /api/erp/lynx/truth-search + evidence UX (Answer, Evidence, Limitations, Next safe action). Governance in docs/lynx-governance.md and (when applied) .cursor/rules/lynx-directory.mdc."
todos:
  - id: apply-cursor-rule
    content: "Agent mode — add `.cursor/rules/lynx-directory.mdc` from docs/lynx-governance.md; extend check-agent-contract REQUIRED_FILES + `*.contract.ts` allowlist; update AGENTS.md §4.2 + §1 + Lynx subsection."
    status: pending
  - id: lynx-contract-ts
    content: "Add `lib/features/lynx/lynx.contract.ts` with LYNX_MODULE_ID, LYNX_LAYERS, LYNX_AUDIT_ACTIONS; export types; wire audits and tests from it."
    status: pending
  - id: phase-1-scope-only
    content: "Ship only lynx truth route + dashboard + messages + tests; no Briefs / Canonical Intake / Operator yet."
    status: pending
isProject: false
---

# Lynx plan (consolidated)

See **[docs/lynx-governance.md](../docs/lynx-governance.md)** for full vocabulary, Phase 1 UX pillars, contract snippet, and mechanical patches for `check-agent-contract.mjs` + `AGENTS.md`.

**Framing:**

```txt
Lynx is Afenda’s machine layer for resolving truth, preparing work, and recommending controlled action.
```

**Layers:** Truth Retrieval · Operating Briefs · **Canonical Intake** · Decision Operator.

**Lockup:** title **Lynx**, eyebrow **The Machine**.

**Note:** Plan mode could not write `.mdc` / `check-agent-contract.mjs`; complete **apply-cursor-rule** todo in Agent mode.
