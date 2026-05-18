import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  AskDocsManifestError,
  checkMetaJsonSidebar,
  findDuplicateKeys,
  parseManifestFile,
  validateManifest,
  validateManifestEntry,
} from "../../../scripts/lib/ask-docs-scaffold-manifest.shared.mjs"

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

function makeTempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ask-docs-manifest-"))
  tempDirs.push(dir)
  fs.mkdirSync(path.join(dir, "content", "ask-docs", "hrm"), { recursive: true })
  return dir
}

const validEntry = {
  section: "hrm",
  slug: "sample-topic",
  title: "Sample topic",
  description: "At least eight characters here.",
  audience: "admin",
  status: "draft",
  archetype: "workflow",
} as const

describe("ask-docs scaffold manifest", () => {
  it("parseManifestFile includes path in JSON errors", () => {
    const root = makeTempRoot()
    const manifestPath = path.join(root, "bad.json")
    fs.writeFileSync(manifestPath, "{ not-json", "utf8")

    expect(() => parseManifestFile(manifestPath)).toThrow(AskDocsManifestError)
    expect(() => parseManifestFile(manifestPath)).toThrow(manifestPath)
  })

  it("validateManifestEntry accepts a valid entry", () => {
    const root = makeTempRoot()
    const entry = validateManifestEntry(validEntry, 0, root)
    expect(entry.slug).toBe("sample-topic")
  })

  it("validateManifestEntry rejects short descriptions", () => {
    const root = makeTempRoot()
    expect(() =>
      validateManifestEntry({ ...validEntry, description: "short" }, 0, root)
    ).toThrow(/description must be 8/)
  })

  it("findDuplicateKeys rejects duplicate section/slug pairs", () => {
    const root = makeTempRoot()
    const entries = [
      validateManifestEntry(validEntry, 0, root),
      validateManifestEntry({ ...validEntry, title: "Other title" }, 1, root),
    ]
    expect(() => findDuplicateKeys(entries)).toThrow(/duplicate manifest entries/)
  })

  it("checkMetaJsonSidebar warns when slug is missing from meta.json pages", () => {
    const root = makeTempRoot()
    const sectionDir = path.join(root, "content", "ask-docs", "hrm")
    fs.writeFileSync(
      path.join(sectionDir, "meta.json"),
      JSON.stringify({ pages: ["employees"] }),
      "utf8"
    )

    const entry = validateManifestEntry(validEntry, 0, root)
    const result = checkMetaJsonSidebar(entry, root)
    expect(result.warning).toMatch(/will append on scaffold/)
  })

  it("validateManifest validates a manifest file end-to-end", () => {
    const root = makeTempRoot()
    const manifestPath = path.join(root, "manifest.json")
    fs.writeFileSync(manifestPath, JSON.stringify([validEntry]), "utf8")

    const entries = validateManifest(parseManifestFile(manifestPath), root)
    expect(entries).toHaveLength(1)
  })
})
