/**
 * Turborepo generators (`@turbo/gen`).
 *
 * Canonical birth mechanism for new architectural surfaces — see
 * `docs/decisions/0009-capability-generators-canonical-birth-mechanism.md`.
 *
 * Five Phase-1 generators:
 *
 *   - `capability`     — full ERP module slice under `lib/features/<slug>/`
 *                        plus locale-prefixed route and tenant-isolation test
 *   - `action`         — Server Action in an existing module
 *   - `adr`            — auto-numbered `docs/decisions/NNNN-*.md`
 *   - `audit-contract` — `<module>.contract.ts` with stable audit strings
 *   - `workflow-job`   — Workflow DevKit durable run + sibling contract
 *   - `ask-doc`        — scaffold MDX under `content/ask-docs/<section>/` + update `meta.json`
 *
 * Each generator finishes with a post-gen action that runs
 * `pnpm lint:agent-contract` + `pnpm lint:eslint --fix` scoped to the
 * touched paths so output passes the contract on day one.
 *
 * Invoke via **`pnpm gen <generator>`** (`package.json` → **`scripts/turbo-gen.mjs`**
 * → **`pnpm exec turbo gen`**). For **`action`**, **`pnpm gen action --module <slug>`**
 * supplies **four positional `--args`** (prompt order: slug, object, verb, tierKey);
 * for **`ask-doc`**, **`pnpm gen ask-doc --section <dir> --slug <stem> --title "…" --description "…" --audience <role> --status <draft|beta|stable>`**
 * supplies **six positional `--args`** matching prompt order.
 * see **AGENTS.md §3**.
 *
 * @see https://turborepo.dev/docs/guides/generating-code
 */
import path from "node:path"
import fs from "node:fs"

import type { PlopTypes } from "@turbo/gen"

import { getNextAdrNumber } from "./lib/adr-next-number"
import {
  CRUD_SAP_VERB_CHOICES,
  buildErpAuditActionString,
  pascalVerb,
} from "./lib/audit-action"
import {
  adrFile,
  contractFile,
  dashboardRouteDir,
  moduleFile,
  unitTestFile,
} from "./lib/paths"
import { runPostGenLint } from "./lib/post-gen-lint"
import {
  validateAuditObject,
  validateAskDocSection,
  validateAskDocSlug,
  validateExistingModuleSlug,
  validateModuleSlug,
  validateShortDescription,
  validateTitle,
} from "./lib/validators"

/** Date helper — locked to YYYY-MM-DD for ADRs / template "generated on" lines. */
function isoDate(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

/** Kebab-case a title for ADR filenames. */
function kebabTitle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Custom Plop action factory — runs the post-generation lint suite.
 * Returns a Plop ActionType callable (matches `CustomActionFunction` shape
 * loosely; Plop accepts a function returning a status string).
 */
function postGenLintAction(
  resolveTouched: (answers: Record<string, unknown>) => string[],
  options: { runAgentContract?: boolean } = {}
): PlopTypes.CustomActionFunction {
  return async (answers) => {
    const touchedFiles = resolveTouched(answers as Record<string, unknown>)
    return runPostGenLint({
      touchedFiles,
      runAgentContract: options.runAgentContract,
    })
  }
}

/**
 * Print a checklist of remaining wires after `pnpm gen governed-renderer`.
 *
 * The generator scaffolds the renderer + schema + test deterministically.
 * The remaining wires touch four shared registries whose anchor positions
 * shift over time; running `pnpm lint:renderer-contracts` after pasting these
 * snippets will surface anything still missing.
 */
function printGovernedRendererNextStepsAction(args: {
  readonly kebabId: string
  readonly pascalId: string
  readonly camelId: string
  readonly natures: readonly string[]
  readonly minContainerPx: number
}): PlopTypes.CustomActionFunction {
  return async () => {
    const { kebabId, pascalId, camelId, natures, minContainerPx } = args
    const naturesLiteralUnion = natures.map((n) => `"${n}"`).join(" | ")
    const naturesArray = natures.map((n) => `"${n}"`).join(", ")
    const lines: readonly string[] = [
      "",
      `Next steps to wire "governed:${kebabId}" (parity script will block on each):`,
      "",
      `  1. components2/metadata/registry.ts — AFENDA_GOVERNED_COMPONENT_REGISTRY:`,
      `       "governed:${kebabId}": "${kebabId}",`,
      "",
      "  2. components2/metadata/registry.ts — add to AfendaGovernedRendererId union:",
      `       | "${kebabId}"`,
      "",
      "  3. components2/metadata/registry.ts — AFENDA_GOVERNED_RENDERER_CONTRACTS entry:",
      `       "${kebabId}": { acceptedNatures: [${naturesArray}], minContainerPx: ${minContainerPx} },`,
      "",
      "  4. components2/metadata/governed-renderer-dispatch.tsx — import + dispatch arm:",
      `       import { ${pascalId}Renderer } from "./renderers/${kebabId}.renderer"`,
      `       case "${kebabId}":`,
      `         return <${pascalId}Renderer configuration={input.configuration} diagnostics={diagnostics} />`,
      "",
      `  5. components2/metadata/governed-component-skeleton.tsx — skeleton case:`,
      `       case "${kebabId}":`,
      "         return (/* match renderer @container layout */)",
      "",
      "  6. lib/features/governed-surface/schemas/component.schema.ts —",
      "     governedComponentTypeSchema literal + discriminated variant:",
      `       "governed:${kebabId}",`,
      `       z.object({ type: z.literal("governed:${kebabId}"), configuration: ${camelId}ConfigurationSchema }).strict(),`,
      "",
      "  7. lib/features/governed-surface/index.ts — export the new schema + types.",
      "",
      "  8. .cursor/rules/governed-renderer-contract.mdc — append the table row:",
      `       | \`governed:${kebabId}\` | ${naturesLiteralUnion} | ${minContainerPx} |`,
      "",
      "  9. scripts/check-renderer-contracts.mjs — add to RENDERER_SCHEMA_FILES:",
      `       "${kebabId}": "${kebabId}.schema.ts",`,
      "",
      "Then run:  pnpm lint:renderer-contracts && pnpm lint:renderer-container-queries",
      "",
    ]
    console.log(lines.join("\n"))
    return "next-steps checklist printed above"
  }
}

/** Append `slug` to `pages` in `content/ask-docs/<section>/meta.json` when missing. */
function appendAskDocMetaJsonAction(): PlopTypes.CustomActionFunction {
  return async (answers) => {
    const a = answers as Record<string, unknown>
    const section = String(a.section)
    const slug = String(a.slug)
    const metaPath = path.join(
      process.cwd(),
      "content",
      "ask-docs",
      section,
      "meta.json"
    )
    if (!fs.existsSync(metaPath)) {
      return `Skipped meta.json (missing): ${metaPath}`
    }
    const raw = fs.readFileSync(metaPath, "utf8")
    const j = JSON.parse(raw) as { pages?: string[] }
    if (!Array.isArray(j.pages)) j.pages = []
    if (!j.pages.includes(slug)) {
      j.pages.push(slug)
      fs.writeFileSync(metaPath, `${JSON.stringify(j, null, 2)}\n`, "utf8")
    }
    return `meta.json updated for section "${section}"`
  }
}

const generator: PlopTypes.PlopGeneratorConfig | undefined = undefined
void generator // appease unused-import paranoia during early iteration; real exports below.

export default function plop(p: PlopTypes.NodePlopAPI): void {
  // -------------------------------------------------------------------------
  // Handlebars helpers
  // -------------------------------------------------------------------------

  /** Insert today's date (YYYY-MM-DD) into templates. */
  p.setHelper("date", isoDate)

  /** Title-case a kebab-slug for human-friendly headings ("foo-bar" → "Foo Bar"). */
  p.setHelper("titleCase", (input: string) =>
    input
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  )

  /** Build a canonical erp.<module>.<object>.<verb> audit string at template time. */
  p.setHelper(
    "auditAction",
    (
      moduleSlug: string,
      object: string,
      verb: Parameters<typeof buildErpAuditActionString>[0]["verb"]
    ) => buildErpAuditActionString({ module: moduleSlug, object, verb })
  )

  /** PascalCase a verb (e.g. `create` → `Create`). */
  p.setHelper("pascalVerb", (verb: string) => pascalVerb(verb))

  // -------------------------------------------------------------------------
  // GENERATOR 1 — capability
  //
  // Scaffolds a minimum-compliant ERP feature module per AGENTS.md §6 and
  // the canonical contacts shape: actions/, data/, components/, schemas/,
  // constants.ts, types.ts, index.ts — plus a locale-prefixed route page
  // and a tenant-isolation Vitest spec.
  // -------------------------------------------------------------------------

  p.setGenerator("capability", {
    description:
      "Scaffold a full ERP module slice (lib/features/<slug>/) + route + tenant-isolation test.",
    prompts: [
      {
        type: "input",
        name: "slug",
        message: "Module slug (lowercase kebab-case, e.g. sales-orders):",
        validate: validateModuleSlug,
      },
      {
        type: "input",
        name: "object",
        message: "Audit object (snake_case noun, e.g. order_record):",
        default: "record",
        validate: validateAuditObject,
      },
      {
        type: "list",
        name: "verb",
        message: "Primary CRUD-SAP verb for the seed Server Action:",
        choices: CRUD_SAP_VERB_CHOICES,
        default: "create",
      },
    ],
    actions: (answers) => {
      const slug = String((answers ?? {}).slug)
      const verb = String((answers ?? {}).verb)
      const enrichedAnswers = {
        ...(answers ?? {}),
        tier: "Tier B (standard CRUD)",
        isTierAOrS: false,
        requiredRole: "member",
        generatorName: "capability",
      }
      Object.assign(answers ?? {}, enrichedAnswers)

      const moduleRoot = `lib/features/${slug}`
      const routeRoot = dashboardRouteDir(slug)
      const touched = [
        `${moduleRoot}/index.ts`,
        `${moduleRoot}/types.ts`,
        `${moduleRoot}/constants.ts`,
        `${moduleRoot}/schemas/${slug}.schema.ts`,
        `${moduleRoot}/data/${slug}.queries.ts`,
        `${moduleRoot}/actions/${verb}-${slug}.ts`,
        `${moduleRoot}/components/${slug}-page.tsx`,
        `${moduleRoot}/${slug}.contract.ts`,
        `${routeRoot}/page.tsx`,
        `tests/unit/${slug}-org-scope.test.ts`,
      ]

      return [
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", `${moduleRoot}/index.ts`),
          templateFile: "templates/capability/index.ts.hbs",
        },
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", `${moduleRoot}/types.ts`),
          templateFile: "templates/capability/types.ts.hbs",
        },
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", `${moduleRoot}/constants.ts`),
          templateFile: "templates/capability/constants.ts.hbs",
        },
        {
          type: "add",
          path: path.join(
            "{{turbo.paths.root}}",
            `${moduleRoot}/schemas/${slug}.schema.ts`
          ),
          templateFile: "templates/capability/schema.ts.hbs",
        },
        {
          type: "add",
          path: path.join(
            "{{turbo.paths.root}}",
            `${moduleRoot}/data/${slug}.queries.ts`
          ),
          templateFile: "templates/capability/queries.ts.hbs",
        },
        {
          type: "add",
          path: path.join(
            "{{turbo.paths.root}}",
            `${moduleRoot}/actions/${verb}-${slug}.ts`
          ),
          templateFile: "templates/action/action.ts.hbs",
        },
        {
          type: "add",
          path: path.join(
            "{{turbo.paths.root}}",
            `${moduleRoot}/components/${slug}-page.tsx`
          ),
          templateFile: "templates/capability/page.tsx.hbs",
        },
        {
          type: "add",
          path: path.join(
            "{{turbo.paths.root}}",
            `${moduleRoot}/${slug}.contract.ts`
          ),
          templateFile: "templates/capability/contract.ts.hbs",
        },
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", `${routeRoot}/page.tsx`),
          templateFile: "templates/capability/route.tsx.hbs",
        },
        {
          type: "add",
          path: path.join(
            "{{turbo.paths.root}}",
            `tests/unit/${slug}-org-scope.test.ts`
          ),
          templateFile: "templates/capability/test.ts.hbs",
        },
        postGenLintAction(() => touched),
      ]
    },
  })

  // -------------------------------------------------------------------------
  // GENERATOR 2 — action
  //
  // Adds a tier-correct Server Action to an existing module. Uses the same
  // action.ts.hbs template as the capability generator's seed action so the
  // tier-flag branches stay aligned.
  // -------------------------------------------------------------------------

  p.setGenerator("action", {
    description:
      "Add a Server Action to an existing module (lib/features/<slug>/actions/<verb>-<slug>.ts).",
    prompts: [
      {
        type: "input",
        name: "slug",
        message: "Existing module slug (lowercase kebab-case):",
        validate: validateExistingModuleSlug,
      },
      {
        type: "input",
        name: "object",
        message: "Audit object (snake_case noun, e.g. order_record):",
        default: "record",
        validate: validateAuditObject,
      },
      {
        type: "list",
        name: "verb",
        message: "CRUD-SAP verb:",
        choices: CRUD_SAP_VERB_CHOICES,
        default: "create",
      },
      {
        type: "list",
        name: "tierKey",
        message: "Tier (drives gate + role check) — see AGENTS.md §5:",
        choices: [
          { name: "B — standard CRUD (requireOrgSession only)", value: "B" },
          {
            name: "A — irreversible/compliance (canActInOrganization admin)",
            value: "A",
          },
          {
            name: "S — destructive/ownership (canActInOrganization owner)",
            value: "S",
          },
        ],
        default: "B",
      },
    ],
    actions: (answers) => {
      const a = answers ?? {}
      const slug = String(a.slug)
      const verb = String(a.verb)
      const tierKey = String(a.tierKey)
      const tier =
        tierKey === "A"
          ? "Tier A (irreversible / compliance-sensitive)"
          : tierKey === "S"
            ? "Tier S (destructive / ownership)"
            : "Tier B (standard CRUD)"
      const requiredRole = tierKey === "S" ? "owner" : "admin"
      Object.assign(a, {
        tier,
        isTierAOrS: tierKey !== "B",
        requiredRole,
        generatorName: "action",
      })

      const actionPath = `lib/features/${slug}/actions/${verb}-${slug}.ts`

      return [
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", actionPath),
          templateFile: "templates/action/action.ts.hbs",
        },
        postGenLintAction(() => [actionPath]),
      ]
    },
  })

  // -------------------------------------------------------------------------
  // GENERATOR 3 — adr
  //
  // Auto-numbered ADR under docs/decisions/. Number is resolved against the
  // existing directory listing; user only supplies the title and a one-line
  // context. Skips agent-contract lint (no source files changed).
  // -------------------------------------------------------------------------

  p.setGenerator("adr", {
    description:
      "Author a new auto-numbered ADR (docs/decisions/NNNN-<kebab-title>.md).",
    prompts: [
      {
        type: "input",
        name: "title",
        message: 'ADR title (human-readable, e.g. "Adopt Sentry for routing"):',
        validate: validateTitle,
      },
    ],
    actions: (answers) => {
      const a = answers ?? {}
      const title = String(a.title)
      const adrNumber = getNextAdrNumber()
      const slug = kebabTitle(title)
      Object.assign(a, { adrNumber, slug })

      const outFile = adrFile(adrNumber, slug)

      return [
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", outFile),
          templateFile: "templates/adr/adr.md.hbs",
        },
        postGenLintAction(() => [outFile], { runAgentContract: false }),
      ]
    },
  })

  // -------------------------------------------------------------------------
  // GENERATOR 4 — audit-contract
  //
  // Emits `<module>.contract.ts` for a module that doesn't have one yet
  // (e.g. you scaffolded with a lower-tier generator). Same template as the
  // capability generator's contract output to avoid drift.
  // -------------------------------------------------------------------------

  p.setGenerator("audit-contract", {
    description:
      "Author a module-level audit contract (lib/features/<slug>/<slug>.contract.ts).",
    prompts: [
      {
        type: "input",
        name: "slug",
        message: "Existing module slug (lowercase kebab-case):",
        validate: validateExistingModuleSlug,
      },
      {
        type: "input",
        name: "object",
        message: "Seed audit object (snake_case, e.g. order_record):",
        default: "record",
        validate: validateAuditObject,
      },
      {
        type: "list",
        name: "verb",
        message: "Seed CRUD-SAP verb:",
        choices: CRUD_SAP_VERB_CHOICES,
        default: "create",
      },
    ],
    actions: (answers) => {
      const slug = String((answers ?? {}).slug)
      const outFile = contractFile(slug)

      return [
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", outFile),
          templateFile: "templates/audit-contract/contract.ts.hbs",
        },
        postGenLintAction(() => [outFile]),
      ]
    },
  })

  // -------------------------------------------------------------------------
  // GENERATOR 5 — workflow-job
  //
  // Workflow DevKit durable run + sibling contract under
  // lib/features/<slug>/data/. Tier classification stays in the caller —
  // the workflow itself just takes a trusted payload.
  // -------------------------------------------------------------------------

  p.setGenerator("workflow-job", {
    description:
      "Scaffold a Workflow DevKit durable run + sibling contract under lib/features/<slug>/data/.",
    prompts: [
      {
        type: "input",
        name: "slug",
        message: "Module slug that owns the workflow (kebab-case):",
        validate: validateExistingModuleSlug,
      },
      {
        type: "input",
        name: "jobName",
        message:
          "Workflow job name (kebab-case, e.g. bulk-sync, payroll-finalize):",
        validate: validateExistingModuleSlug,
      },
      {
        type: "input",
        name: "auditObject",
        message: "Audit object for lifecycle rows (snake_case noun):",
        default: "job",
        validate: validateAuditObject,
      },
    ],
    actions: (answers) => {
      const a = answers ?? {}
      const slug = String(a.slug)
      const jobName = String(a.jobName)
      const workflowFile = `lib/features/${slug}/data/${jobName}.workflow.ts`
      const contractFilePath = `lib/features/${slug}/data/${jobName}.workflow.contract.ts`

      return [
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", contractFilePath),
          templateFile: "templates/workflow-job/workflow.contract.ts.hbs",
        },
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", workflowFile),
          templateFile: "templates/workflow-job/job.workflow.ts.hbs",
        },
        postGenLintAction(() => [contractFilePath, workflowFile]),
      ]
    },
  })

  // -------------------------------------------------------------------------
  // GENERATOR 6 — ask-doc
  //
  // Scaffolds `content/ask-docs/<section>/<slug>.mdx` with canonical frontmatter
  // and appends `slug` to `meta.json` `pages` when missing.
  // -------------------------------------------------------------------------

  p.setGenerator("ask-doc", {
    description:
      "Scaffold an ask-docs MDX page under content/ask-docs/<section>/ and update meta.json.",
    prompts: [
      {
        type: "input",
        name: "section",
        message:
          "Section folder under content/ask-docs/ (must exist, e.g. hrm, getting-started):",
        validate: validateAskDocSection,
      },
      {
        type: "input",
        name: "slug",
        message: "Page slug / filename stem without .mdx (kebab-case):",
        validate: validateAskDocSlug,
      },
      {
        type: "input",
        name: "title",
        message: "Page title (frontmatter `title`):",
        validate: validateTitle,
      },
      {
        type: "input",
        name: "description",
        message: "Short description (frontmatter `description`, ≥8 chars):",
        validate: validateShortDescription,
      },
      {
        type: "list",
        name: "audience",
        message: "Primary audience:",
        choices: ["admin", "employee", "developer"],
        default: "admin",
      },
      {
        type: "list",
        name: "status",
        message: "Doc maturity:",
        choices: ["draft", "beta", "stable"],
        default: "draft",
      },
    ],
    actions: (answers) => {
      const a = answers ?? {}
      const section = String(a.section)
      const slug = String(a.slug)
      const mdxPath = `content/ask-docs/${section}/${slug}.mdx`
      const metaPath = `content/ask-docs/${section}/meta.json`

      return [
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", mdxPath),
          templateFile: "templates/ask-doc/page.mdx.hbs",
        },
        appendAskDocMetaJsonAction(),
        postGenLintAction(() => [mdxPath, metaPath], {
          runAgentContract: false,
        }),
      ]
    },
  })

  // -------------------------------------------------------------------------
  // GENERATOR 7 — governed-renderer (ADR-0025)
  //
  // Scaffolds the renderer + its Zod schema + a unit test, prints the
  // remaining wires the parity script will require. The remaining manual
  // steps are intentional — they touch shared registries / cursor rules /
  // discriminated unions whose anchor patterns shift over time, and the
  // parity script (`pnpm lint:renderer-contracts`) names each missing slot.
  // -------------------------------------------------------------------------

  p.setGenerator("governed-renderer", {
    description:
      "Scaffold a governed metadata renderer (ADR-0025) — schema + renderer + test.",
    prompts: [
      {
        type: "input",
        name: "id",
        message:
          "Renderer id without governed: prefix (kebab-case, e.g. activity-log):",
        validate: validateModuleSlug,
      },
      {
        type: "input",
        name: "title",
        message: "Human title (used for aria-label, docs, fallback empty):",
        validate: validateTitle,
      },
      {
        type: "input",
        name: "naturesRaw",
        message:
          "Accepted dataNature values (comma-separated, e.g. 'audit-trail,change-log'):",
        default: "default",
        validate: (input: string) => {
          const parts = String(input)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
          if (parts.length === 0) return "At least one dataNature is required."
          for (const p of parts) {
            if (!/^[a-z][a-z0-9-]*$/.test(p)) {
              return `Invalid dataNature "${p}" — kebab-case, lowercase only.`
            }
          }
          return true
        },
      },
      {
        type: "input",
        name: "minContainerPx",
        message: "minContainerPx for the registry contract (numeric, e.g. 320):",
        default: "320",
        validate: (input: string) => {
          const n = Number(input)
          return Number.isFinite(n) && n >= 0
            ? true
            : "minContainerPx must be a non-negative number."
        },
      },
    ],
    actions: (answers) => {
      const a = answers ?? {}
      const kebabId = String(a.id)
      const pascalId = kebabId
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("")
      const camelId = pascalId.charAt(0).toLowerCase() + pascalId.slice(1)
      const constantId = kebabId.toUpperCase().replace(/-/g, "_")
      const natures = String(a.naturesRaw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      const defaultNature = natures[0]
      const minContainerPx = Number(a.minContainerPx)
      const title = String(a.title)

      const rendererFile = `components2/metadata/renderers/${kebabId}.renderer.tsx`
      const schemaFile = `lib/features/governed-surface/schemas/${kebabId}.schema.ts`
      const testFile = `tests/unit/components2/metadata/renderers/${kebabId}.test.tsx`

      const templateData = {
        kebabId,
        pascalId,
        camelId,
        constantId,
        title,
        natures,
        defaultNature,
        minContainerPx,
      }

      return [
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", schemaFile),
          templateFile: "templates/governed-renderer/schema.ts.hbs",
          data: templateData,
        },
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", rendererFile),
          templateFile: "templates/governed-renderer/renderer.tsx.hbs",
          data: templateData,
        },
        {
          type: "add",
          path: path.join("{{turbo.paths.root}}", testFile),
          templateFile: "templates/governed-renderer/renderer.test.tsx.hbs",
          data: templateData,
        },
        printGovernedRendererNextStepsAction({
          kebabId,
          pascalId,
          camelId,
          natures,
          minContainerPx,
        }),
        postGenLintAction(() => [rendererFile, schemaFile, testFile]),
      ]
    },
  })

  // Reference helpers to ensure the imports stay tree-shake-friendly when
  // Turbo's TypeScript pipeline compiles this config to CommonJS.
  void moduleFile
  void unitTestFile
  void validateShortDescription
}
