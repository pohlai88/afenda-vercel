// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ApprovalTimelineRenderer } from "#components2/metadata/renderers/approval-timeline.renderer"

describe("ApprovalTimelineRenderer", () => {
  it("renders governed error empty state when configuration is invalid", () => {
    render(<ApprovalTimelineRenderer configuration={{ steps: [] }} />)
    expect(screen.getByText("Timeline unavailable")).toBeTruthy()
  })

  it("renders approval steps for valid configuration", () => {
    render(
      <ApprovalTimelineRenderer
        configuration={{
          dataNature: "approval-flow",
          title: "Claim approval",
          steps: [
            {
              id: "submit",
              label: "Submitted",
              status: "complete",
              actorLabel: "Employee",
            },
            {
              id: "review",
              label: "Manager review",
              status: "active",
              actorLabel: "Manager",
            },
          ],
        }}
      />
    )
    expect(screen.getByText("Claim approval")).toBeTruthy()
    expect(screen.getByText("Manager review")).toBeTruthy()
    expect(screen.getByText("active")).toBeTruthy()
  })
})
