// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/image", () => ({
  default: ({ fill: _fill, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element -- test stub for `next/image`
    <img alt="" {...props} />
  ),
}))

import { WorkbenchAppLauncherTrigger } from "#components/workbench/utility-bar/left-utility-bar/workbench-app-launcher-trigger"
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover"

afterEach(() => {
  cleanup()
})

describe("WorkbenchAppLauncherTrigger", () => {
  it("forwards native button props and ref", () => {
    const onClick = vi.fn()
    const ref = createRef<HTMLButtonElement>()

    render(
      <WorkbenchAppLauncherTrigger
        ref={ref}
        aria-label="Open app launcher"
        data-state="open"
        data-test-id="launcher-trigger"
        onClick={onClick}
      />
    )

    const button = screen.getByRole("button", { name: "Open app launcher" })
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button.getAttribute("data-state")).toBe("open")
    expect(button.getAttribute("data-test-id")).toBe("launcher-trigger")
    expect(ref.current).toBe(button)
  })

  it("works as a Radix popover trigger via asChild", () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <WorkbenchAppLauncherTrigger aria-label="Open app launcher" />
        </PopoverTrigger>
        <PopoverContent>
          <div>Launcher content</div>
        </PopoverContent>
      </Popover>
    )

    const button = screen.getByRole("button", { name: "Open app launcher" })
    fireEvent.click(button)

    expect(button.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByText("Launcher content")).toBeTruthy()
  })
})
