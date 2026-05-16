/**
 * Generator input validators.
 *
 * Plop prompts return strings; these helpers fail fast on inputs that would
 * cause downstream contract violations (kebab-case slugs, banned module
 * names, etc.). All validators return `true` on success or an error string
 * that Plop will display to the user.
 *
 * Keep the rules aligned with AGENTS.md §6 and lib/erp/crud-sap.shared.ts.
 */

import fs from "node:fs"
import path from "node:path"

/** Ask-docs section folder under `content/ask-docs/<section>/`. */
export function validateAskDocSection(input: string): true | string {
  if (!input) return "Section folder is required (e.g. hrm, getting-started)."
  if (!/^[a-z][a-z0-9-]*$/.test(input)) {
    return "Section must be lowercase alphanumeric with optional hyphens (e.g. getting-started)."
  }
  const dir = path.join(process.cwd(), "content", "ask-docs", input)
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return `No directory at content/ask-docs/${input}/ — create the section and meta.json first.`
  }
  return true
}

/** Ask-docs page file stem (e.g. attendance-corrections → attendance-corrections.mdx). */
export function validateAskDocSlug(input: string): true | string {
  if (!input) return "Page slug is required (filename without .mdx)."
  if (!/^[a-z][a-z0-9-]*$/.test(input)) {
    return "Slug must be lowercase kebab-case (e.g. attendance-corrections)."
  }
  return true
}

/** Lowercase kebab-case (e.g. "sales-orders"). Used for module slugs + adapters. */
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

/** Snake_case (e.g. "customer_record"). Used for audit object segments. */
const SNAKE_CASE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/

/**
 * Reserved or already-occupied module slugs we never want to generate over.
 * Keep aligned with existing folders under lib/features/.
 */
const RESERVED_MODULE_SLUGS = new Set<string>([
  "auth",
  "contacts",
  "execution",
  "hrm",
  "knowledge",
  "lynx",
  "nexus",
  "org-admin",
  "org-feedback",
  "org-notifications",
  "planner",
  "platform-admin",
  "simulation",
])

/** Validate a feature-module slug (lib/features/<slug>/). */
export function validateModuleSlug(input: string): true | string {
  if (!input) return "Module slug is required."
  if (!KEBAB_CASE.test(input)) {
    return "Module slug must be lowercase kebab-case (e.g. sales-orders)."
  }
  if (RESERVED_MODULE_SLUGS.has(input)) {
    return `Module "${input}" already exists or is reserved — open the existing module or pick a different slug.`
  }
  return true
}

/**
 * Validate a slug that may reference an existing module (action / audit-contract
 * generators target existing modules, so reserved slugs are valid here).
 */
export function validateExistingModuleSlug(input: string): true | string {
  if (!input) return "Module slug is required."
  if (!KEBAB_CASE.test(input)) {
    return "Module slug must be lowercase kebab-case (e.g. sales-orders)."
  }
  return true
}

/** Validate an audit `object` segment (snake_case noun, e.g. "customer_record"). */
export function validateAuditObject(input: string): true | string {
  if (!input)
    return "Audit object is required (snake_case noun, e.g. customer_record)."
  if (!SNAKE_CASE.test(input)) {
    return "Audit object must be lowercase snake_case (e.g. customer_record)."
  }
  return true
}

/** Validate a free-form human title (used in ADRs, page headers). */
export function validateTitle(input: string): true | string {
  if (!input) return "Title is required."
  if (input.length < 4) return "Title must be at least 4 characters."
  if (input.length > 120) return "Title must be 120 characters or fewer."
  return true
}

/** Validate a short imperative description (used in audit messages, etc.). */
export function validateShortDescription(input: string): true | string {
  if (!input) return "Description is required."
  if (input.length < 8) return "Description must be at least 8 characters."
  if (input.length > 200) return "Description must be 200 characters or fewer."
  return true
}
