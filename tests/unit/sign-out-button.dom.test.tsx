// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const { signOut, push, refresh } = vi.hoisted(() => ({
  signOut: vi.fn(async () => undefined),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("#lib/auth-client", () => ({
  authClient: {
    signOut,
  },
}))

vi.mock("#i18n/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
    prefetch: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

import { SignOutButton } from "#components2/sign-out-button"

describe("SignOutButton", () => {
  it("calls auth signOut then navigates home and refreshes", async () => {
    render(<SignOutButton />)

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }))

    await vi.waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1)
    })
    expect(push).toHaveBeenCalledWith("/")
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
