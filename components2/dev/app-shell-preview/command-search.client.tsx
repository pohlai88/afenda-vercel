"use client"

import {
  AppShellCommandPalette,
  AppShellUtilityBarCommandSearchTrigger,
} from "#components2/app-shell/client"

import { SHELL_PREVIEW_COMMAND_PALETTE_PROPS } from "../fixtures/command-palette.fixture"

const SEP = <div aria-hidden className="h-4 w-px shrink-0 bg-border/40" />

export function AppShellPreviewCommandSearch() {
  return (
    <>
      {SEP}
      <AppShellUtilityBarCommandSearchTrigger
        placeholder={SHELL_PREVIEW_COMMAND_PALETTE_PROPS.placeholder}
        triggerAriaLabel="Open command palette"
      />
      {SEP}
    </>
  )
}

export function AppShellPreviewCommandPalette() {
  return <AppShellCommandPalette {...SHELL_PREVIEW_COMMAND_PALETTE_PROPS} />
}
