// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GALLERY_AUDIT_PANEL } from "#components2/dev/metadata-renderer-gallery/gallery-fixtures"
import { AuditPanelRenderer } from "#components2/metadata/renderers/audit-panel.renderer"

describe("AuditPanelRenderer", () => {
  it("renders error empty state when configuration is invalid", () => {
    render(<AuditPanelRenderer configuration={{ rows: [] }} />)
    expect(screen.getByText("Audit panel unavailable")).toBeTruthy()
  })

  it("renders audit rows for valid configuration", () => {
    render(<AuditPanelRenderer configuration={GALLERY_AUDIT_PANEL} />)
    expect(screen.getByText("Audit trail")).toBeTruthy()
    expect(screen.getByText("Jordan Lee")).toBeTruthy()
  })
})
