#!/usr/bin/env node
/**
 * Wires a newly scaffolded governed renderer into shared registries (ADR-0026).
 *
 * Usage:
 *   node scripts/wire-governed-renderer.mjs \
 *     --id activity-log --pascal ActivityLog --camel activityLog \
 *     --natures audit-trail --min-container-px 360
 *
 * Idempotent: skips inserts that already exist.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function parseArgs(argv) {
  const out = {
    id: "",
    pascal: "",
    camel: "",
    natures: [],
    minContainerPx: 320,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--id") out.id = argv[++i] ?? ""
    else if (a === "--pascal") out.pascal = argv[++i] ?? ""
    else if (a === "--camel") out.camel = argv[++i] ?? ""
    else if (a === "--natures")
      out.natures = (argv[++i] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    else if (a === "--min-container-px")
      out.minContainerPx = Number(argv[++i] ?? 320)
  }
  if (!out.id || !out.pascal || !out.camel || out.natures.length === 0) {
    console.error(
      "Required: --id --pascal --camel --natures (comma-separated) [--min-container-px]"
    )
    process.exit(1)
  }
  return out
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8")
}

function write(rel, content) {
  fs.writeFileSync(path.join(ROOT, rel), content, "utf8")
}

const { id, pascal, camel, natures, minContainerPx } = parseArgs(
  process.argv.slice(2)
)
const governedType = `governed:${id}`
const schemaFile = `${id}.schema.ts`
const configSchema = `${camel}ConfigurationSchema`
const parseFn = `parse${pascal}Configuration`
const stabilityConst = `GOVERNED_${id.toUpperCase().replace(/-/g, "_")}_CONFIGURATION_SCHEMA_STABILITY`

// --- registry.ts ---
let registry = read("components2/metadata/registry.ts")
const regEntry = `  "${governedType}": "${id}",`
if (!registry.includes(regEntry)) {
  registry = registry.replace(
    `"governed:detail-tabs": "detail-tabs",`,
    `"governed:detail-tabs": "detail-tabs",\n${regEntry}`
  )
}
const unionEntry = `  | "${id}"`
if (!registry.includes(unionEntry)) {
  registry = registry.replace(
    `  | "detail-tabs"`,
    `  | "detail-tabs"\n${unionEntry}`
  )
}
const contractBlock = `  "${id}": {\n    acceptedNatures: [${natures.map((n) => `"${n}"`).join(", ")}],\n    minContainerPx: ${minContainerPx},\n  },`
if (!registry.includes(`"${id}": {\n    acceptedNatures:`)) {
  registry = registry.replace(
    `  "detail-tabs": {
    acceptedNatures: ["tabbed-detail"],
    minContainerPx: 480,
  },`,
    `  "detail-tabs": {
    acceptedNatures: ["tabbed-detail"],
    minContainerPx: 480,
  },
${contractBlock}`
  )
}
write("components2/metadata/registry.ts", registry)

// --- governed-renderer-dispatch.tsx ---
let dispatch = read("components2/metadata/governed-renderer-dispatch.tsx")
const importLine = `import { ${pascal}Renderer } from "./renderers/${id}.renderer"`
if (!dispatch.includes(importLine)) {
  dispatch = dispatch.replace(
    `import { DetailTabsRenderer } from "./renderers/detail-tabs.renderer"`,
    `import { DetailTabsRenderer } from "./renderers/detail-tabs.renderer"\n${importLine}`
  )
}
const dispatchEntry = `  "${id}": ${pascal}Renderer,`
if (!dispatch.includes(dispatchEntry)) {
  dispatch = dispatch.replace(
    `  "detail-tabs": DetailTabsRenderer,`,
    `  "detail-tabs": DetailTabsRenderer,\n${dispatchEntry}`
  )
}
write("components2/metadata/governed-renderer-dispatch.tsx", dispatch)

// --- governed-component-skeleton.tsx (shares audit-panel / detail-tabs block) ---
let skeleton = read("components2/metadata/governed-component-skeleton.tsx")
if (!skeleton.includes(`case "${id}":`)) {
  skeleton = skeleton.replace(
    `    case "audit-panel":
    case "detail-tabs":`,
    `    case "audit-panel":
    case "detail-tabs":
    case "${id}":`
  )
}
write("components2/metadata/governed-component-skeleton.tsx", skeleton)

// --- component.schema.ts ---
let componentSchema = read(
  "lib/features/governed-surface/schemas/component.schema.ts"
)
const schemaImportLine = `import { ${configSchema} } from "./${schemaFile}"`
if (!componentSchema.includes(schemaImportLine)) {
  componentSchema = componentSchema.replace(
    `import { governedDetailTabsSchema } from "./detail-tabs.schema"`,
    `import { governedDetailTabsSchema } from "./detail-tabs.schema"\n${schemaImportLine}`
  )
}
const enumLit = `  "${governedType}",`
if (!componentSchema.includes(enumLit)) {
  componentSchema = componentSchema.replace(
    `  "governed:detail-tabs",`,
    `  "governed:detail-tabs",\n${enumLit}`
  )
}
const variantBlock = `    z
      .object({
        type: z.literal("${governedType}"),
        serverType: z.string().trim().min(1),
        configuration: ${configSchema},
      })
      .strict(),`
if (!componentSchema.includes(`type: z.literal("${governedType}")`)) {
  componentSchema = componentSchema.replace(
    `    z
      .object({
        type: z.literal("governed:detail-tabs"),`,
    `${variantBlock}
    z
      .object({
        type: z.literal("governed:detail-tabs"),`
  )
}
write("lib/features/governed-surface/schemas/component.schema.ts", componentSchema)

// --- governed-surface index.ts ---
let barrel = read("lib/features/governed-surface/index.ts")
const exportBlock = `export {
  ${stabilityConst},
  ${configSchema},
  ${parseFn},
  type ${pascal}Configuration,
  type ${pascal}ConfigurationInput,
} from "./schemas/${schemaFile}"`
if (!barrel.includes(configSchema)) {
  barrel = barrel.replace(
    `export {
  ModulePageHeader,`,
    `${exportBlock}

export {
  ModulePageHeader,`
  )
}

// --- check-renderer-contracts.mjs ---
let contracts = read("scripts/check-renderer-contracts.mjs")
const rendererSchemaEntry = `  "${id}": "${schemaFile}",`
if (!contracts.includes(rendererSchemaEntry)) {
  contracts = contracts.replace(
    `  "detail-tabs": "detail-tabs.schema.ts",`,
    `  "detail-tabs": "detail-tabs.schema.ts",\n${rendererSchemaEntry}`
  )
}
write("scripts/check-renderer-contracts.mjs", contracts)

// --- governed-renderer-contract.mdc table row ---
const rulePath = ".cursor/rules/governed-renderer-contract.mdc"
if (fs.existsSync(path.join(ROOT, rulePath))) {
  let rule = read(rulePath)
  const row = `| \`${governedType}\` | ${natures.join(", ")} | ${minContainerPx} |`
  if (!rule.includes(governedType)) {
    rule = rule.replace(
      `| \`governed:detail-tabs\` | tabbed-detail | 480 |`,
      `| \`governed:detail-tabs\` | tabbed-detail | 480 |\n${row}`
    )
    write(rulePath, rule)
  }
}

console.log(
  `Wired ${governedType}. Run: pnpm lint:renderer-contracts && pnpm lint:components2-renderers`
)
