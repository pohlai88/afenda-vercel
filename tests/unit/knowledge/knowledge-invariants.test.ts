import { promises as fs } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const KNOWLEDGE_DATA_DIR = path.join(
  ROOT,
  "lib",
  "features",
  "knowledge",
  "data"
)

async function readKnowledgeDataFiles() {
  const entries = await fs.readdir(KNOWLEDGE_DATA_DIR, { withFileTypes: true })
  const out: Array<{ name: string; content: string }> = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const filePath = path.join(KNOWLEDGE_DATA_DIR, entry.name)
    const content = await fs.readFile(filePath, "utf8")
    out.push({ name: entry.name, content })
  }
  return out
}

async function readLynxFiles() {
  const lynxDir = path.join(ROOT, "lib", "features", "lynx")
  const out: Array<{ relativePath: string; content: string }> = []
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const filePath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(filePath)
        continue
      }
      if (!entry.isFile() || !filePath.endsWith(".ts")) continue
      out.push({
        relativePath: path.relative(lynxDir, filePath),
        content: await fs.readFile(filePath, "utf8"),
      })
    }
  }
  await walk(lynxDir)
  return out
}

describe("knowledge invariants", () => {
  it("Invariant A: source adapters stay pure", async () => {
    const files = await readKnowledgeDataFiles()
    const adapters = files.filter(
      (f) => f.name.startsWith("source-") && f.name.includes(".adapter.")
    )
    expect(adapters.length).toBeGreaterThan(0)
    for (const adapter of adapters) {
      expect(adapter.content.includes("knowledgeChunk")).toBe(false)
      expect(adapter.content.includes("commitKnowledgeDocument")).toBe(false)
      expect(adapter.content.includes("embedKnowledge")).toBe(false)
    }
  })

  it("Invariant B: retrieval files are source-blind", async () => {
    const files = await readKnowledgeDataFiles()
    const retrievalFiles = files.filter((f) => f.name.startsWith("retrieve-"))
    expect(retrievalFiles.length).toBeGreaterThan(0)
    for (const file of retrievalFiles) {
      expect(file.content.includes("knowledgeSource")).toBe(false)
      expect(file.content.includes("sourceId:")).toBe(false)
      expect(file.content.includes("sourceKind")).toBe(false)
      expect(file.content.includes("bot-link")).toBe(false)
      expect(file.content.includes("credential.queries.server")).toBe(false)
      expect(file.content.includes("credential-cipher.server")).toBe(false)
    }
  })

  it("only pipeline commit writes knowledge chunks", async () => {
    const files = await readKnowledgeDataFiles()
    const writers = files
      .filter((f) => f.content.includes(".insert(knowledgeChunk)"))
      .map((f) => f.name)
    expect(writers).toEqual(["pipeline-commit-document.server.ts"])
  })

  it("credential encryption primitives are centralized", async () => {
    const files = await readKnowledgeDataFiles()
    const aesUsers = files
      .filter(
        (f) =>
          f.content.includes("createCipheriv") ||
          f.content.includes("createDecipheriv")
      )
      .map((f) => f.name)
    expect(aesUsers).toEqual(["credential-cipher.server.ts"])
  })

  it("source sync workflow does not import retrieval-rerank", async () => {
    const files = await readKnowledgeDataFiles()
    const sourceSync = files.find((f) => f.name === "source-sync.workflow.ts")
    expect(sourceSync).toBeDefined()
    expect(sourceSync?.content.includes("retrieve-rerank.server")).toBe(false)
  })

  it("metadata writers import metadata contracts", async () => {
    const files = await readKnowledgeDataFiles()
    const mustImport = files.filter(
      (f) =>
        f.content.includes("metadata: {") &&
        (f.name.includes(".workflow") ||
          f.name.includes(".mutations") ||
          f.name.includes(".actions") ||
          f.name.includes("eval-run"))
    )
    expect(mustImport.length).toBeGreaterThan(0)
    for (const file of mustImport) {
      expect(file.content.includes("metadata-contracts.shared")).toBe(true)
    }
  })
})

describe("lynx/knowledge boundary invariants", () => {
  it("lynx files do not deep-import knowledge internals", async () => {
    const files = await readLynxFiles()
    for (const file of files) {
      expect(file.content.includes("#features/knowledge/data/")).toBe(false)
      expect(file.content.includes("#features/knowledge/actions/")).toBe(false)
    }
  })
})
