# Governed-surface Zod schema contract — implementation handbook

> **Authority chain:** [ADR-0011](../decisions/0011-governed-surface-metadata-kernel.md) is canonical.
> This document is derived from ADR-0011 § Schema Design Principles.
> If this document and ADR-0011 diverge, **ADR-0011 governs**. Fix this document in the same PR.

This handbook provides the concrete template and a worked checklist for every
schema authored under `lib/features/governed-surface/schemas/`.

---

## Template

```ts
import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

export const FEATURE_SCHEMA_ID = "governed.feature.configuration" as const

export const FEATURE_SCHEMA_STABILITY: SchemaStability = "beta"

/**
 * Purpose:
 * - Explain what this schema governs.
 *
 * Boundary:
 * - This schema validates metadata/configuration only.
 * - Renderers own presentation.
 * - Server Actions / policies own execution and authorization.
 *
 * Reserved:
 * - Add future fields here only when a real consumer exists.
 */
export const featureKindSchema = z.enum(["default", "advanced"])

export const featureItemSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    kind: featureKindSchema.default("default"),
  })
  .strict()

export const featureConfigurationSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    items: z.array(featureItemSchema).min(1),
  })
  .strict()
  .superRefine((config, ctx) => {
    const seen = new Set<string>()

    for (const [index, item] of config.items.entries()) {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Item ids must be unique.",
          path: ["items", index, "id"],
        })
      }

      seen.add(item.id)
    }
  })

export type FeatureKind = z.infer<typeof featureKindSchema>
export type FeatureItem = z.infer<typeof featureItemSchema>
export type FeatureConfiguration = z.infer<typeof featureConfigurationSchema>
export type FeatureConfigurationInput = z.input<
  typeof featureConfigurationSchema
>

export function parseFeatureConfiguration(raw: unknown) {
  return featureConfigurationSchema.safeParse(raw)
}
```

---

## Worked checklist

Each item maps to the corresponding principle in ADR-0011 § Schema Design Principles.

| # | Principle | Check |
|---|---|---|
| 1 | Named `XXX_SCHEMA_ID` + `XXX_SCHEMA_STABILITY` exported — no bare `SCHEMA_STABILITY` | |
| 2 | Display strings: `z.string().trim().min(1)` unless empty is documented historical data | |
| 3 | Every object uses `.strict()` | |
| 4 | Defaults on Zod fields, not duplicated inside renderers or builders | |
| 5 | Sub-schemas and enum types exported by name with `z.infer<>` types | |
| 6 | Timestamps: `z.string().datetime({ offset: true })` | |
| 7 | Floats: `.finite()` · Integers: `.int().finite()` | |
| 8 | ID arrays: `.superRefine()` uniqueness check with index in error path | |
| 9 | Cross-field invariants expressed in `.superRefine()` on the schema, not in UI | |
| 10 | No Tailwind helpers, CSS logic, or execution code inside the schema module | |
| 11 | Non-container renderers export `<name>DataNatureSchema = z.enum([...])` and include `dataNature` in config — ADR-0025 §2 | |
| 12 | Renderer geometry uses container-query breakpoints (`@sm:`) not viewport breakpoints (`sm:`) — ADR-0025 §1 | |
| 13 | No raw `<div>` at tile/leaf level — compose shadcn primitives from `#components2/ui/*` with `Record<SchemaEnum, string>` variant maps — ADR-0025 §4 | |

---

## Naming reference

| Artifact | Pattern |
|---|---|
| Schema ID | `FEATURE_SCHEMA_ID` |
| Stability | `FEATURE_SCHEMA_STABILITY` |
| Zod validators | `featureSchema`, `featureItemSchema`, `featureKindSchema` |
| Output type | `Feature`, `FeatureConfiguration` |
| Input type | `FeatureInput`, `FeatureConfigurationInput` |
| Parser (renderer config) | `parseGovernedFeatureConfiguration(raw: unknown)` |
| Parser (generic model) | `parseFeatureData(raw: unknown)` |

---

## Stability tiers

| Value | When to use |
|---|---|
| `experimental` | Contract still moving; breaking changes expected |
| `beta` | Consumed by shipped renderers; breaking changes need a migration note |
| `stable` | Migration cost accepted; breaking changes require a new ADR |

---

## Circular composition

When a container (`section`, `stack`) would need to import
`component.schema.ts` — creating a cycle — accept `z.array(z.unknown()).min(1)`
at the container and document it:

```ts
/**
 * Kept unknown to avoid circular imports.
 * component.schema.ts owns final child validation.
 */
children: z.array(z.unknown()).min(1),
```

Or expose a factory that `component.schema.ts` calls with the discriminated union:

```ts
export function createGovernedSectionConfigurationSchema(
  childSchema: z.ZodTypeAny
) {
  return z.object({ ..., children: z.array(childSchema).min(1) }).strict()
}
```
