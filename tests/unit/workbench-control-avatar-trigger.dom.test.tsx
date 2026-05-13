// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element -- test stub for `next/image`
    <img alt="" {...props} />
  ),
}))

import { WorkbenchUtilityControlAvatarTrigger } from "#components/workbench/utility-bar/right-utility-bar/workbench-utility-control-avatar-trigger"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"

afterEach(() => {
  cleanup()
})

describe("WorkbenchUtilityControlAvatarTrigger", () => {
  it("forwards native button props and ref", () => {
    const onClick = vi.fn()
    const ref = createRef<HTMLButtonElement>()

    render(
      <WorkbenchUtilityControlAvatarTrigger
        ref={ref}
        aria-label="Open account menu"
        data-state="open"
        data-test-id="avatar-trigger"
        onClick={onClick}
      />
    )

    const button = screen.getByRole("button", { name: "Open account menu" })
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button.getAttribute("data-state")).toBe("open")
    expect(button.getAttribute("data-test-id")).toBe("avatar-trigger")
    expect(ref.current).toBe(button)
  })

  it("works as a Radix dropdown trigger via asChild", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <WorkbenchUtilityControlAvatarTrigger aria-label="Open account menu" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div>Profile settings</div>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    const button = screen.getByRole("button", { name: "Open account menu" })
    fireEvent.pointerDown(button, { button: 0, ctrlKey: false })

    expect(button.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByText("Profile settings")).toBeTruthy()
  })
})
