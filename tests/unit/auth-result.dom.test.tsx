// @vitest-environment jsdom

import type { Route } from "next"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("#i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

import { AuthResult } from "#components2/auth/auth-result"

describe("AuthResult", () => {
  it("renders title, description, and primary link", () => {
    render(
      <AuthResult
        title="Session expired"
        description="Please sign in again to continue."
        primaryAction={{
          label: "Sign in",
          href: "/en/sign-in" as unknown as Route,
        }}
      />
    )

    expect(screen.getByRole("region")).toBeTruthy()
    expect(screen.getByText("Session expired")).toBeTruthy()
    expect(screen.getByText("Please sign in again to continue.")).toBeTruthy()
    const signIn = screen.getByRole("link", { name: "Sign in" })
    expect(signIn.getAttribute("href")).toBe("/en/sign-in")
  })

  it("renders secondary action when provided", () => {
    render(
      <AuthResult
        variant="destructive"
        title="Invitation expired"
        description="Ask your admin for a new invite."
        primaryAction={{
          label: "Sign in",
          href: "/en/sign-in" as unknown as Route,
        }}
        secondaryAction={{ label: "Home", href: "/en" as unknown as Route }}
      />
    )

    expect(
      screen.getByRole("link", { name: "Home" }).getAttribute("href")
    ).toBe("/en")
  })
})
