/**
 * Shared ask-docs scaffold manifest validation and planning.
 * Used by scripts/ask-docs-scaffold-from-manifest.mjs and unit tests.
 */
import fs from "node:fs"
import path from "node:path"

const KEBAB = /^[a-z][a-z0-9-]*$/
const AUDIENCES = new Set(["admin", "employee", "developer"])
const STATUSES = new Set(["draft", "beta", "stable"])
const ARCHETYPES = new Set(["workflow", "readonly", "stepup"])

export class AskDocsManifestError extends Error {
  constructor(message) {
    super(message)
    this.name = "AskDocsManifestError"
  }
}

/**
 * @param {string} manifestPath
 * @returns {unknown[]}
 */
export function parseManifestFile(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new AskDocsManifestError(`missing ${manifestPath}`)
  }

  let raw
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new AskDocsManifestError(`invalid JSON in ${manifestPath}: ${detail}`)
  }

  if (!Array.isArray(raw)) {
    throw new AskDocsManifestError(`${manifestPath} must be a JSON array.`)
  }

  return raw
}

/**
 * @param {unknown} entry
 * @param {number} index
 * @param {string} root
 */
export function validateManifestEntry(entry, index, root) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new AskDocsManifestError(`manifest[${index}] must be an object.`)
  }

  const { section, slug, title, description, audience, status, archetype } =
    /** @type {Record<string, unknown>} */ (entry)
  const label = `manifest[${index}]`

  if (typeof section !== "string" || !KEBAB.test(section)) {
    throw new AskDocsManifestError(
      `${label}.section must be lowercase kebab-case (e.g. hrm, getting-started).`
    )
  }

  const sectionDir = path.join(root, "content", "ask-docs", section)
  if (!fs.existsSync(sectionDir) || !fs.statSync(sectionDir).isDirectory()) {
    throw new AskDocsManifestError(
      `${label}: no directory at content/ask-docs/${section}/ — create section and meta.json first.`
    )
  }

  if (typeof slug !== "string" || !KEBAB.test(slug)) {
    throw new AskDocsManifestError(
      `${label}.slug must be lowercase kebab-case (filename without .mdx).`
    )
  }

  if (typeof title !== "string" || title.length < 4 || title.length > 120) {
    throw new AskDocsManifestError(`${label}.title must be 4–120 characters.`)
  }

  if (
    typeof description !== "string" ||
    description.length < 8 ||
    description.length > 200
  ) {
    throw new AskDocsManifestError(
      `${label}.description must be 8–200 characters.`
    )
  }

  if (typeof audience !== "string" || !AUDIENCES.has(audience)) {
    throw new AskDocsManifestError(
      `${label}.audience must be admin | employee | developer.`
    )
  }

  if (typeof status !== "string" || !STATUSES.has(status)) {
    throw new AskDocsManifestError(
      `${label}.status must be draft | beta | stable.`
    )
  }

  const arch = archetype ?? "workflow"
  if (typeof arch !== "string" || !ARCHETYPES.has(arch)) {
    throw new AskDocsManifestError(
      `${label}.archetype must be workflow | readonly | stepup.`
    )
  }

  return {
    section,
    slug,
    title,
    description,
    audience,
    status,
    archetype: arch,
  }
}

/**
 * @param {ReturnType<typeof validateManifestEntry>[]} entries
 */
export function findDuplicateKeys(entries) {
  const seen = new Map()
  /** @type {string[]} */
  const duplicates = []

  for (const entry of entries) {
    const key = `${entry.section}/${entry.slug}`
    if (seen.has(key)) {
      duplicates.push(key)
    } else {
      seen.set(key, true)
    }
  }

  if (duplicates.length > 0) {
    throw new AskDocsManifestError(
      `duplicate manifest entries: ${[...new Set(duplicates)].join(", ")}`
    )
  }
}

/**
 * @param {ReturnType<typeof validateManifestEntry>} entry
 * @param {string} root
 */
export function checkMetaJsonSidebar(entry, root) {
  const metaPath = path.join(
    root,
    "content",
    "ask-docs",
    entry.section,
    "meta.json"
  )

  if (!fs.existsSync(metaPath)) {
    return {
      ok: true,
      warning: `content/ask-docs/${entry.section}/meta.json is missing — generator may skip sidebar append.`,
    }
  }

  let pages
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"))
    pages = Array.isArray(meta.pages) ? meta.pages : []
  } catch {
    return {
      ok: true,
      warning: `content/ask-docs/${entry.section}/meta.json is invalid JSON — verify sidebar order manually.`,
    }
  }

  if (!pages.includes(entry.slug)) {
    return {
      ok: true,
      warning: `slug "${entry.slug}" is not in content/ask-docs/${entry.section}/meta.json pages — generator will append on scaffold.`,
    }
  }

  return { ok: true }
}

/**
 * @param {ReturnType<typeof validateManifestEntry>} entry
 */
export function formatGenCommand(entry) {
  return [
    "pnpm",
    "gen",
    "ask-doc",
    `--section ${entry.section}`,
    `--slug ${entry.slug}`,
    `--title ${JSON.stringify(entry.title)}`,
    `--description ${JSON.stringify(entry.description)}`,
    `--audience ${entry.audience}`,
    `--status ${entry.status}`,
    `--archetype ${entry.archetype}`,
  ].join(" ")
}

/**
 * @param {unknown[]} raw
 * @param {string} root
 */
export function validateManifest(raw, root) {
  const entries = raw.map((entry, index) =>
    validateManifestEntry(entry, index, root)
  )
  findDuplicateKeys(entries)
  return entries
}

/**
 * @param {ReturnType<typeof validateManifestEntry>[]} entries
 * @param {string} root
 */
export function planScaffoldActions(entries, root) {
  return entries.map((entry) => {
    const mdxPath = path.join(
      root,
      "content",
      "ask-docs",
      entry.section,
      `${entry.slug}.mdx`
    )
    const meta = checkMetaJsonSidebar(entry, root)
    const genCommand = formatGenCommand(entry)

    if (fs.existsSync(mdxPath)) {
      return {
        kind: "skipExists",
        entry,
        mdxPath,
        genCommand,
        warning: meta.warning,
      }
    }

    return {
      kind: "wouldCreate",
      entry,
      mdxPath,
      genCommand,
      warning: meta.warning,
    }
  })
}

/**
 * @param {ReturnType<typeof planScaffoldActions>} plan
 */
export function summarizePlan(plan) {
  let wouldCreate = 0
  let skipped = 0
  /** @type {string[]} */
  const warnings = []

  for (const action of plan) {
    if (action.kind === "wouldCreate") wouldCreate++
    if (action.kind === "skipExists") skipped++
    if (action.warning) warnings.push(action.warning)
  }

  return { wouldCreate, skipped, warnings }
}
