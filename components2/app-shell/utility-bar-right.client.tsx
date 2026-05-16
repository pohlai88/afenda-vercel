"use client"

import { useState } from "react"
import type { Route } from "next"

import { cn } from "#lib/utils"

import type { MessengerPanelTransport } from "#features/messenger/client"

import {
  selectVisibleItems,
  useUtilityBarStore,
} from "../stores/utility-bar.store"
import type { UtilityBarItemId } from "./utility-bar-items"
import {
  AppShellAccountDropdown,
  type AppShellAccountDropdownProps,
} from "./utility-bar-account-dropdown.client"
import { AppShellMarketplacePanel } from "./utility-bar-marketplace.client"
import {
  AppShellAvatarDisc,
  AppShellHelpIcon,
  AppShellLocaleDropdown,
  AppShellQuickCreateIcon,
  AppShellSearchMobileIcon,
  AppShellThemeIcon,
} from "./utility-bar.client"
import { UtilityBarConnectivityPanel } from "./utility-bar-connectivity.client"
import { UtilityBarCoordinationPanel } from "./utility-bar-coordination.client"
import { UtilityBarDensityPanel } from "./utility-bar-density.client"
import { UtilityBarDiagnosisPanel } from "./utility-bar-diagnosis.client"
import { UtilityBarFeedbackPanel } from "./utility-bar-feedback.client"
import { UtilityBarLynxPanel } from "./utility-bar-lynx.client"
import { UtilityBarMessengerPanel } from "./utility-bar-messenger.client"
import { UtilityBarOrgAdminPanel } from "./utility-bar-org-admin.client"
import { UtilityBarScreenshotPanel } from "./utility-bar-screenshot.client"
import { UtilityBarShortcutsPanel } from "./utility-bar-shortcuts.client"
import { UtilityBarStoragePanel } from "./utility-bar-storage.client"
import { UtilityBarUploadPanel } from "./utility-bar-upload.client"
import { useAppShellStore } from "../stores/app-shell.store"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type AppShellUtilityBarRightProps = {
  /**
   * Locale-prefixed hrefs for the three link-type items.
   * Serializable plain object — safe to pass from a Server Component.
   * Defaults to `"/"` for any unset key.
   */
  hrefs?: {
    insight?: Route
    help?: Route
    settings?: Route
  }
  /** Avatar disc aria-label. */
  avatarAriaLabel?: string
  /** Avatar disc tooltip. */
  avatarTooltip?: string
  /**
   * Avatar click handler — **only pass from a Client Component parent**.
   * Ignored when the `account` prop is set (the account menu owns the trigger).
   * Named `onAvatarClickAction` for Next.js TS 71007 on client entry files.
   */
  onAvatarClickAction?: () => void
  /** Marketplace panel trigger aria-label. */
  marketplaceAriaLabel?: string
  /** Marketplace panel trigger tooltip. */
  marketplaceTooltip?: string
  /**
   * When set, the avatar opens {@link AppShellAccountDropdown} (personal IAM menu).
   * Props must be serializable for RSC parents except `onSignOut` (pass from a Client
   * child or omit to use the built-in sign-out flow).
   */
  account?: AppShellAccountDropdownProps
  /**
   * Dev shell preview: stub Ably and use an in-memory messenger transport.
   */
  messengerPreviewStub?: boolean
  /** Optional messenger transport override (shell preview mocks). */
  messengerTransport?: MessengerPanelTransport
  /**
   * Organization id (UUID) for governed Blob uploads from the right rail.
   * Omit on surfaces without a tenant session — upload panel shows guidance only.
   */
  workspaceBlobOrganizationId?: string | null
  /**
   * Active organization slug for the org-admin quick-jump panel.
   * Omit on surfaces without a tenant session — panel shows guidance only.
   */
  orgSlug?: string | null
}

// ---------------------------------------------------------------------------
// Icon renderer — maps item ID → the right icon preset
// ---------------------------------------------------------------------------

function RailIcon({
  id,
  hrefs,
  openCommand,
  workspaceBlobOrganizationId,
  orgSlug,
  messengerPreviewStub,
  messengerTransport,
}: {
  id: UtilityBarItemId
  hrefs?: AppShellUtilityBarRightProps["hrefs"]
  openCommand: () => void
  workspaceBlobOrganizationId?: string | null
  orgSlug?: string | null
  messengerPreviewStub?: boolean
  messengerTransport?: MessengerPanelTransport
}) {
  const href =
    (id === "insight"
      ? hrefs?.insight
      : id === "help"
        ? hrefs?.help
        : undefined) ?? ("/" as Route)

  switch (id) {
    case "search-mobile":
      return (
        <AppShellSearchMobileIcon
          ariaLabel="Search"
          tooltip="Search"
          onClickAction={openCommand}
        />
      )
    case "quick-create":
      return (
        <AppShellQuickCreateIcon
          ariaLabel="Quick create"
          tooltip="Quick create"
        />
      )
    case "insight":
      return <UtilityBarLynxPanel href={href} />
    case "theme":
      return <AppShellThemeIcon ariaLabel="Appearance" tooltip="Appearance" />
    case "density":
      return <UtilityBarDensityPanel />
    case "locale":
      return <AppShellLocaleDropdown ariaLabel="Language" tooltip="Language" />
    case "shortcuts":
      return <UtilityBarShortcutsPanel />
    case "feedback":
      return <UtilityBarFeedbackPanel />
    case "help":
      return (
        <AppShellHelpIcon href={href} ariaLabel="Help" tooltip="Help & docs" />
      )
    case "settings":
      return <UtilityBarOrgAdminPanel orgSlug={orgSlug ?? null} />
    case "connectivity":
      return <UtilityBarConnectivityPanel />
    case "storage":
      return <UtilityBarStoragePanel />
    case "screenshot":
      return <UtilityBarScreenshotPanel />
    case "upload":
      return (
        <UtilityBarUploadPanel
          organizationId={workspaceBlobOrganizationId ?? null}
        />
      )
    case "diagnosis":
      return <UtilityBarDiagnosisPanel />
    case "messenger":
      return (
        <UtilityBarMessengerPanel
          organizationId={workspaceBlobOrganizationId ?? null}
          previewStub={Boolean(messengerPreviewStub)}
          transport={messengerTransport}
        />
      )
    case "coordination":
      return (
        <UtilityBarCoordinationPanel
          organizationId={workspaceBlobOrganizationId ?? null}
        />
      )
  }
}

// ---------------------------------------------------------------------------
// Drag-and-drop wrapper for a single rail icon
// ---------------------------------------------------------------------------

function DraggableRailItem({
  id,
  index,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: {
  id: UtilityBarItemId
  index: number
  isDragging: boolean
  isDropTarget: boolean
  onDragStart: (id: UtilityBarItemId) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  children: React.ReactNode
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        onDragStart(id)
        try {
          e.dataTransfer.effectAllowed = "move"
          e.dataTransfer.setData("text/plain", id)
        } catch {
          // Ignored — drag metadata is optional (tests / constrained environments).
        }
      }}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "relative flex items-center select-none",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
        isDropTarget &&
          "before:absolute before:top-1 before:bottom-1 before:-left-[3px] before:w-0.5 before:rounded-full before:bg-ring"
      )}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppShellUtilityBarRight
// ---------------------------------------------------------------------------

/**
 * AppShellUtilityBarRight
 *
 * The full right section of the utility bar:
 *   - Renders icons in the order stored by `useUtilityBarStore`
 *   - Supports drag-and-drop reordering (persisted to localStorage)
 *   - Shows only items marked `visible` in the store
 *   - Marketplace panel button (opens customization hub)
 *   - Avatar disc is always last and is not draggable
 *
 * Mount once inside the `right` prop of `AppShellUtilityBar`.
 */
export function AppShellUtilityBarRight({
  hrefs,
  avatarAriaLabel = "Account",
  avatarTooltip = "Account",
  onAvatarClickAction,
  marketplaceAriaLabel = "Marketplace",
  marketplaceTooltip = "Marketplace",
  account,
  messengerPreviewStub = false,
  messengerTransport,
  workspaceBlobOrganizationId = null,
  orgSlug = null,
}: AppShellUtilityBarRightProps) {
  const items = useUtilityBarStore((s) => s.items)
  const reorderVisibleInRail = useUtilityBarStore((s) => s.reorderVisibleInRail)
  const openCommand = useAppShellStore((s) => s.openCommand)
  const visibleItems = selectVisibleItems(items)

  const [dragId, setDragId] = useState<UtilityBarItemId | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  function handleDragStart(id: UtilityBarItemId) {
    setDragId(id)
    setOverIndex(null)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setOverIndex(index)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (dragId === null || overIndex === null) {
      setDragId(null)
      setOverIndex(null)
      return
    }
    const ids = [
      ...selectVisibleItems(useUtilityBarStore.getState().items).map(
        (i) => i.id
      ),
    ]
    const from = ids.indexOf(dragId)
    if (from !== -1) {
      ids.splice(from, 1)
      ids.splice(overIndex, 0, dragId)
      reorderVisibleInRail(ids)
    }
    setDragId(null)
    setOverIndex(null)
  }

  function handleDragEnd() {
    setDragId(null)
    setOverIndex(null)
  }

  return (
    <>
      {/* Draggable icons from store */}
      {visibleItems.map((item, index) => (
        <DraggableRailItem
          key={item.id}
          id={item.id}
          index={index}
          isDragging={dragId === item.id}
          isDropTarget={overIndex === index && dragId !== item.id}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        >
          <RailIcon
            id={item.id}
            hrefs={hrefs}
            openCommand={openCommand}
            workspaceBlobOrganizationId={workspaceBlobOrganizationId}
            orgSlug={orgSlug}
            messengerPreviewStub={messengerPreviewStub}
            messengerTransport={messengerTransport}
          />
        </DraggableRailItem>
      ))}

      {/* Marketplace panel — always visible, not draggable */}
      <AppShellMarketplacePanel
        triggerAriaLabel={marketplaceAriaLabel}
        triggerTooltip={marketplaceTooltip}
      />

      {/* Avatar — account menu when configured; else plain disc + optional click */}
      {account ? (
        <AppShellAccountDropdown
          hrefs={account.hrefs}
          workspaceHomeHref={account.workspaceHomeHref}
          userEmail={account.userEmail}
          title={account.title}
          subtitle={account.subtitle}
          footer={account.footer}
          triggerAriaLabel={account.triggerAriaLabel ?? avatarAriaLabel}
          triggerTooltip={account.triggerTooltip ?? avatarTooltip}
          onSignOut={account.onSignOut}
        />
      ) : (
        <AppShellAvatarDisc
          ariaLabel={avatarAriaLabel}
          tooltip={avatarTooltip}
          onClickAction={onAvatarClickAction}
        />
      )}
    </>
  )
}
