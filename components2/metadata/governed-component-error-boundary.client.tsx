"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

import { GovernedEmpty } from "#features/governed-surface"

import { emitGovernedTelemetry } from "./governed-telemetry.client"

type GovernedComponentErrorBoundaryDiagnostics = "user" | "operator"

type Props = {
  children: ReactNode
  componentType: string
  rendererId: string
  diagnostics?: GovernedComponentErrorBoundaryDiagnostics
  surfaceKey?: string
}

type State = {
  hasError: boolean
}

export class GovernedComponentErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    emitGovernedTelemetry({
      name: "governed.renderer_error",
      type: this.props.componentType,
      rendererId: this.props.rendererId,
      message: error.message,
      surfaceKey: this.props.surfaceKey,
    })

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[governed-ui] renderer error", {
        error,
        componentStack: info.componentStack,
        componentType: this.props.componentType,
        rendererId: this.props.rendererId,
        surfaceKey: this.props.surfaceKey,
      })
    }
  }

  componentDidUpdate(prevProps: Props): void {
    if (
      this.state.hasError &&
      (prevProps.componentType !== this.props.componentType ||
        prevProps.rendererId !== this.props.rendererId)
    ) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      const diagnostics = this.props.diagnostics ?? "user"

      return (
        <GovernedEmpty
          model={{
            variant: "error",
            title: "Section unavailable",
            description:
              diagnostics === "operator"
                ? `Renderer "${this.props.rendererId}" failed for "${this.props.componentType}".`
                : "This section could not be displayed safely.",
          }}
        />
      )
    }

    return this.props.children
  }
}
