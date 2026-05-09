import { describe, expect, it } from "vitest"

import {
  declarationDocuments,
  declarationFooterLinks,
  subprocessorsLink,
} from "#features/legal-declarations"
import {
  publicTrustIndexableRoutes,
  trustSurfaceDefinition,
} from "#features/public-trust"

const document = declarationDocuments.subprocessors
const documentCopy = document.sections
  .flatMap((section) => [...section.body, ...(section.bullets ?? [])])
  .join(" ")

describe("subprocessor public trust contract", () => {
  it("exposes a standalone subprocessor declaration at /subprocessors", () => {
    expect(document.routeHref).toBe("/subprocessors")
    expect(subprocessorsLink.href).toBe("/subprocessors")
    expect(
      declarationFooterLinks.some((link) => link.href === "/subprocessors")
    ).toBe(true)
  })

  it("marks the subprocessor trust surface as live and indexable", () => {
    const subprocessorSurface = trustSurfaceDefinition.surfaces.find(
      (surface) => surface.id === "surface-subprocessors"
    )

    expect(subprocessorSurface).toMatchObject({
      route: "/subprocessors",
      state: "live",
      isPublicLink: true,
    })
    expect(subprocessorSurface?.activationRuleId).toBeUndefined()
    expect(publicTrustIndexableRoutes).toContain("/subprocessors")
  })

  it("classifies current production and conditional processors", () => {
    for (const vendor of [
      "Vercel, Inc.",
      "Neon, LLC / Databricks",
      "OpenAI, LLC",
      "Upstash, Inc.",
      "Plus Five Five, Inc. / Resend",
      "Functional Software, Inc. d/b/a Sentry",
    ]) {
      expect(documentCopy).toContain(vendor)
    }
  })

  it("validates the requested vendor list without over-claiming production use", () => {
    for (const vendor of [
      "Hugging Face",
      "Supabase",
      "Railway",
      "Retool",
      "Cursor",
      "Codex",
      "Cline",
      "pgVector and PostgreSQL",
    ]) {
      expect(documentCopy).toContain(vendor)
    }

    expect(documentCopy).toContain(
      "Supabase: not validated as a current Afenda production service"
    )
    expect(documentCopy).toContain(
      "pgVector and PostgreSQL: software components, not legal subprocessors"
    )
  })

  it("includes official source links for vendor review", () => {
    for (const source of [
      "https://vercel.com/legal/dpa",
      "https://neon.com/subprocessors",
      "https://openai.com/policies/sub-processor-list/",
      "https://huggingface.co/privacy",
      "https://supabase.com/downloads/docs/Supabase%2BDPA%2B260317.pdf",
      "https://railway.com/legal/dpa",
      "https://retool.com/dpa.pdf",
      "https://cursor.com/terms/dpa",
      "https://cline.bot/privacy",
      "https://www.postgresql.org/about/",
      "https://github.com/pgvector/pgvector",
    ]) {
      expect(documentCopy).toContain(source)
    }
  })
})
