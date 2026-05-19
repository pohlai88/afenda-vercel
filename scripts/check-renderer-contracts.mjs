#!/usr/bin/env node
/**
 * Governed renderer contract parity gate (ADR-0025).
 *
 * Verifies that the `dataNature` and registry surfaces stay in sync across
 * four hand-maintained artifacts:
 *
 *   1. Zod source — `*DataNatureSchema = z.enum([...])` inside
 *      `lib/features/governed-surface/schemas/<renderer>.schema.ts`.
 *   2. Registry contract map — `AFENDA_GOVERNED_RENDERER_CONTRACTS` in
 *      `components2/metadata/registry.ts` (`acceptedNatures: [...]`).
 *   3. Renderer id union — `AfendaGovernedRendererId` in the same registry file.
 *   4. Cursor rule table — `.cursor/rules/governed-renderer-contract.mdc`
 *      ("Accepted data natures per renderer").
 *
 * It also checks that every literal in `governedComponentTypeSchema`
 * (`lib/features/governed-surface/schemas/component.schema.ts`) either has a
 * registry entry in `AFENDA_GOVERNED_COMPONENT_REGISTRY` or is allow-listed
 * as a design-reserve below.
 *
 * Fast, regex-based, zero deps — same shape as `check-components2-renderers.mjs`.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const COMPONENT_SCHEMA = path.join(
  ROOT,
  "lib/features/governed-surface/schemas/component.schema.ts"
)
const REGISTRY = path.join(ROOT, "components2/metadata/registry.ts")
const CURSOR_RULE = path.join(
  ROOT,
  ".cursor/rules/governed-renderer-contract.mdc"
)
const SCHEMAS_DIR = path.join(ROOT, "lib/features/governed-surface/schemas")

/**
 * Renderer ids that are allowed to have a contract entry without yet being
 * mapped from a `governed:*` discriminator in
 * `AFENDA_GOVERNED_COMPONENT_REGISTRY`. Each design-reserve must also appear
 * in `governedComponentTypeSchema` so builders can declare the discriminator.
 */
const DESIGN_RESERVE_RENDERER_IDS = new Set([
  "multi-step-form",
  "scorecard-form",
])

/** Renderer ids that are pure containers and never declare a dataNature. */
const CONTAINER_RENDERER_IDS = new Set(["section", "stack", "empty"])

/**
 * Maps `rendererId` → schema file name. Each non-container renderer that
 * declares a `*DataNatureSchema` enum is listed here so the script can resolve
 * "stat-card" → `stat-card.schema.ts`. Add new entries alongside new renderers.
 */
const RENDERER_SCHEMA_FILES = {
  "stat-card": "stat-card.schema.ts",
  "list-surface": "list-surface-renderer.schema.ts",
  "action-bar": "action-bar.schema.ts",
  "audit-panel": "audit-panel.schema.ts",
  "detail-tabs": "detail-tabs.schema.ts",
  "approval-timeline": "approval-timeline.schema.ts",
  chart: "chart.schema.ts",
  "kanban-board": "kanban-board.schema.ts",
}

const errors = []
const warnings = []

function reportError(msg) {
  errors.push(msg)
}

function reportWarning(msg) {
  warnings.push(msg)
}

function readFile(p) {
  return fs.readFileSync(p, "utf8")
}

// ---------------------------------------------------------------------------
// Parse: governedComponentTypeSchema literals
// ---------------------------------------------------------------------------
const componentSchemaSrc = readFile(COMPONENT_SCHEMA)
const typeEnumMatch = componentSchemaSrc.match(
  /governedComponentTypeSchema\s*=\s*z\.enum\(\[([\s\S]*?)\]\)/
)
if (!typeEnumMatch) {
  reportError(
    "component.schema.ts: governedComponentTypeSchema = z.enum([...]) not found"
  )
}
const componentTypeLiterals = typeEnumMatch
  ? [...typeEnumMatch[1].matchAll(/"(governed:[^"]+)"/g)].map((m) => m[1])
  : []

// ---------------------------------------------------------------------------
// Parse: registry.ts
// ---------------------------------------------------------------------------
const registrySrc = readFile(REGISTRY)

// AfendaGovernedRendererId union literals
const rendererIdUnionMatch = registrySrc.match(
  /export type AfendaGovernedRendererId\s*=([\s\S]*?)\n\n/
)
if (!rendererIdUnionMatch) {
  reportError(
    'registry.ts: AfendaGovernedRendererId union not found (expected `export type AfendaGovernedRendererId = | "..." | ...`)'
  )
}
const rendererIdUnion = rendererIdUnionMatch
  ? [...rendererIdUnionMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : []

// AFENDA_GOVERNED_COMPONENT_REGISTRY map: "governed:x": "x"
const componentRegistryEntries = [
  ...registrySrc.matchAll(/"(governed:[^"]+)":\s*"([^"]+)"/g),
].map(([, key, value]) => ({ componentType: key, rendererId: value }))

// AFENDA_GOVERNED_RENDERER_CONTRACTS entries
// Match each `"<id>": { acceptedNatures: [...], minContainerPx: <n> }` or bare-key form
const contractsBlockMatch = registrySrc.match(
  /AFENDA_GOVERNED_RENDERER_CONTRACTS\s*=\s*\{([\s\S]*?)\}\s*as const satisfies/
)
if (!contractsBlockMatch) {
  reportError("registry.ts: AFENDA_GOVERNED_RENDERER_CONTRACTS block not found")
}
const contractEntries = {}
if (contractsBlockMatch) {
  // Capture both "stat-card": { ... } and section: { ... } forms (bare ident allowed for container ids).
  const entryRegex =
    /(?:"([^"]+)"|([a-zA-Z][\w-]*))\s*:\s*\{\s*acceptedNatures\s*:\s*\[([^\]]*)\]\s*,\s*minContainerPx\s*:\s*(\d+)[^}]*\}/g
  for (const match of contractsBlockMatch[1].matchAll(entryRegex)) {
    const id = match[1] ?? match[2]
    const naturesRaw = match[3]
    const minPx = Number(match[4])
    const natures = [...naturesRaw.matchAll(/"([^"]+)"/g)].map((m) => m[1])
    contractEntries[id] = { natures, minContainerPx: minPx }
  }
}

// ---------------------------------------------------------------------------
// Parse: per-schema *DataNatureSchema enums
// ---------------------------------------------------------------------------
const schemaDataNatures = {}
for (const [rendererId, fileName] of Object.entries(RENDERER_SCHEMA_FILES)) {
  const schemaPath = path.join(SCHEMAS_DIR, fileName)
  if (!fs.existsSync(schemaPath)) {
    reportError(
      `RENDERER_SCHEMA_FILES["${rendererId}"] → ${fileName} does not exist`
    )
    continue
  }
  const src = readFile(schemaPath)
  // Find `xxxDataNatureSchema = z.enum([...])` or `z.literal("...")`.
  const dataNatureEnumMatch = src.match(
    /[A-Za-z]+DataNatureSchema\s*=\s*z\.enum\(\[([\s\S]*?)\]\)/
  )
  const dataNatureLiteralMatch = src.match(
    /[A-Za-z]+DataNatureSchema\s*=\s*z\.literal\("([^"]+)"\)/
  )
  if (dataNatureEnumMatch) {
    schemaDataNatures[rendererId] = [
      ...dataNatureEnumMatch[1].matchAll(/"([^"]+)"/g),
    ].map((m) => m[1])
    continue
  }
  if (dataNatureLiteralMatch) {
    schemaDataNatures[rendererId] = [dataNatureLiteralMatch[1]]
    continue
  }
  reportError(
    `${fileName}: no *DataNatureSchema = z.enum([...]) or z.literal("...") declaration (expected per ADR-0025 §2)`
  )
}

// ---------------------------------------------------------------------------
// Parse: cursor rule "Accepted data natures per renderer" table
// ---------------------------------------------------------------------------
const cursorRuleSrc = readFile(CURSOR_RULE)
// Capture the table heading then collect | `id` | `"a"` · `"b"` | rows that follow.
const ruleTableMatch = cursorRuleSrc.match(
  /Accepted data natures per renderer[\s\S]*?\|\s*Renderer\s*\|[\s\S]*?\n((?:\|[\s\S]*?\n)+)/
)
const ruleTableRows = {}
if (ruleTableMatch) {
  const rowRegex = /\|\s*`([^`]+)`\s*\|\s*([^|]+)\|/g
  for (const match of ruleTableMatch[1].matchAll(rowRegex)) {
    const id = match[1].trim()
    const naturesCell = match[2]
    const natures = [...naturesCell.matchAll(/`"([^"]+)"`/g)].map((m) => m[1])
    if (natures.length > 0) {
      ruleTableRows[id] = natures
    }
  }
}

// ---------------------------------------------------------------------------
// Cross-check 1: every component type literal has a registry entry
//                OR maps to a design-reserve renderer id
// ---------------------------------------------------------------------------
const registeredComponentTypes = new Set(
  componentRegistryEntries.map((e) => e.componentType)
)
for (const literal of componentTypeLiterals) {
  if (registeredComponentTypes.has(literal)) continue
  const rendererId = literal.replace(/^governed:/, "")
  if (DESIGN_RESERVE_RENDERER_IDS.has(rendererId)) continue
  reportError(
    `component.schema.ts: governedComponentTypeSchema includes "${literal}" but neither AFENDA_GOVERNED_COMPONENT_REGISTRY nor DESIGN_RESERVE_RENDERER_IDS covers it`
  )
}

// Reverse direction — every registry entry is a recognised discriminator
const componentTypeSet = new Set(componentTypeLiterals)
for (const { componentType } of componentRegistryEntries) {
  if (!componentTypeSet.has(componentType)) {
    reportError(
      `registry.ts: AFENDA_GOVERNED_COMPONENT_REGISTRY references "${componentType}" but it is not in governedComponentTypeSchema`
    )
  }
}

// ---------------------------------------------------------------------------
// Cross-check 2: contract map keys ↔ renderer-id union ↔ component registry
// ---------------------------------------------------------------------------
const rendererIdUnionSet = new Set(rendererIdUnion)
const componentRegistryRendererIds = new Set(
  componentRegistryEntries.map((e) => e.rendererId)
)

for (const id of Object.keys(contractEntries)) {
  if (!rendererIdUnionSet.has(id)) {
    reportError(
      `registry.ts: AFENDA_GOVERNED_RENDERER_CONTRACTS has key "${id}" not present in AfendaGovernedRendererId union`
    )
  }
}

for (const id of rendererIdUnion) {
  if (!Object.prototype.hasOwnProperty.call(contractEntries, id)) {
    reportError(
      `registry.ts: AfendaGovernedRendererId "${id}" missing from AFENDA_GOVERNED_RENDERER_CONTRACTS`
    )
  }
}

// Container renderers must declare empty acceptedNatures.
for (const id of CONTAINER_RENDERER_IDS) {
  const entry = contractEntries[id]
  if (entry && entry.natures.length > 0) {
    reportError(
      `registry.ts: container renderer "${id}" must have acceptedNatures: [] (currently [${entry.natures.join(", ")}])`
    )
  }
}

// Non-container, non-design-reserve, non-shipped renderers without a registry entry
// are warnings (not errors) — they may be in flight.
for (const id of rendererIdUnion) {
  if (CONTAINER_RENDERER_IDS.has(id)) continue
  if (componentRegistryRendererIds.has(id)) continue
  if (DESIGN_RESERVE_RENDERER_IDS.has(id)) continue
  reportWarning(
    `registry.ts: renderer "${id}" is in the union but has neither a component-registry mapping nor a design-reserve status`
  )
}

// ---------------------------------------------------------------------------
// Cross-check 3: schema dataNature ↔ registry acceptedNatures
// ---------------------------------------------------------------------------
function sortedJoin(values) {
  return [...values].sort().join(",")
}

for (const [rendererId, schemaNatures] of Object.entries(schemaDataNatures)) {
  const contract = contractEntries[rendererId]
  if (!contract) {
    reportError(
      `Schema declares dataNature for "${rendererId}" but registry has no contract entry`
    )
    continue
  }
  if (sortedJoin(schemaNatures) !== sortedJoin(contract.natures)) {
    reportError(
      `dataNature mismatch for "${rendererId}":\n` +
        `  schema enum:        [${schemaNatures.join(", ")}]\n` +
        `  registry contract:  [${contract.natures.join(", ")}]`
    )
  }
}

// ---------------------------------------------------------------------------
// Cross-check 4: cursor rule table ↔ registry acceptedNatures
// ---------------------------------------------------------------------------
for (const [rendererId, ruleNatures] of Object.entries(ruleTableRows)) {
  const contract = contractEntries[rendererId]
  if (!contract) {
    reportError(
      `Cursor rule lists renderer "${rendererId}" but registry has no contract entry`
    )
    continue
  }
  if (sortedJoin(ruleNatures) !== sortedJoin(contract.natures)) {
    reportError(
      `Cursor rule mismatch for "${rendererId}":\n` +
        `  rule table:         [${ruleNatures.join(", ")}]\n` +
        `  registry contract:  [${contract.natures.join(", ")}]`
    )
  }
}

// Every non-container renderer with a registry contract should appear in the cursor rule table.
for (const id of rendererIdUnion) {
  if (CONTAINER_RENDERER_IDS.has(id)) continue
  if (DESIGN_RESERVE_RENDERER_IDS.has(id)) continue
  if (!componentRegistryRendererIds.has(id)) continue
  if (!Object.prototype.hasOwnProperty.call(ruleTableRows, id)) {
    reportWarning(
      `Cursor rule "Accepted data natures per renderer" table is missing a row for "${id}"`
    )
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (warnings.length > 0) {
  for (const w of warnings) {
    console.warn(`warn  ${w}`)
  }
}

if (errors.length > 0) {
  console.error("\ncheck-renderer-contracts: FAIL")
  for (const e of errors) {
    console.error(`error ${e}`)
  }
  console.error(
    `\n${errors.length} contract drift error(s). See ADR-0025 and ` +
      `.cursor/rules/governed-renderer-contract.mdc.`
  )
  process.exit(1)
}

const summary = [
  `${componentTypeLiterals.length} governed component type literal(s)`,
  `${componentRegistryEntries.length} component registry entry(ies)`,
  `${Object.keys(contractEntries).length} renderer contract(s)`,
  `${Object.keys(schemaDataNatures).length} dataNature enum(s) checked`,
  `${Object.keys(ruleTableRows).length} cursor-rule row(s) checked`,
]
console.log(`check-renderer-contracts: OK (${summary.join(" · ")})`)
