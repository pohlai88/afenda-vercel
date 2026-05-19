import type { ReactElement, ReactNode } from "react"
import { render, type RenderOptions } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

/** Minimal messages for governed renderer / list-surface unit tests. */
export const GOVERNED_SURFACE_TEST_MESSAGES = {
  Dashboard: {
    GovernedSurface: {
      kanban: {
        invalidConfigTitle: "This board is unavailable",
        invalidConfigDescription:
          "The board configuration failed validation. Contact your administrator if this persists.",
        invalidConfigDescriptionOperator:
          "governed.kanban-board.configuration failed validation.",
        invalidInteractionMode:
          "This board is not configured for footer actions.",
        invalidInteractionModeDrag:
          "This board is not configured for drag reorder.",
      },
    },
  },
} as const

export function renderWithNextIntl(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider
        locale="en"
        messages={GOVERNED_SURFACE_TEST_MESSAGES}
      >
        {children}
      </NextIntlClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}
