"use client"

import { useState } from "react"
import type { Route } from "next"
import { useTranslations } from "next-intl"

import { cn } from "#lib/utils"

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
  AppShellConnectivityIcon,
  AppShellDensityIcon,
  AppShellDiagnosisIcon,
  AppShellFeedbackIcon,
  AppShellHelpIcon,
  AppShellInsightIcon,
  AppShellLocaleIcon,
  AppShellMessengerIcon,
  AppShellQuickCreateIcon,
  AppShellScreenshotIcon,
  AppShellSearchMobileIcon,
  AppShellSettingsIcon,
  AppShellShortcutsIcon,
  AppShellStorageIcon,
  AppShellThemeIcon,
  AppShellUploadIcon,
} from "./utility-bar.client"

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
}

// ---------------------------------------------------------------------------
// Icon renderer — maps item ID → the right icon preset
// ---------------------------------------------------------------------------

function RailIcon({
  id,
  hrefs,
  settingsAriaLabel,
  settingsTooltip,
}: {
  id: UtilityBarItemId
  hrefs?: AppShellUtilityBarRightProps["hrefs"]
  settingsAriaLabel: string
  settingsTooltip: string
}) {
  const href = (
    id === "insight" ? hrefs?.insight :
    id === "help" ? hrefs?.help :
    id === "settings" ? hrefs?.settings :
    undefined
  ) ?? ("/" as Route)

  switch (id) {
    case "search-mobile":
      return <AppShellSearchMobileIcon ariaLabel="Search" tooltip="Search" />
    case "quick-create":
      return (
        <AppShellQuickCreateIcon ariaLabel="Quick create" tooltip="Quick create" />
      )
    case "insight":
      return (
        <AppShellInsightIcon
          href={href}
          ariaLabel="Lynx machine insight"
          tooltip="Lynx machine insight"
        />
      )
    case "theme":
      return <AppShellThemeIcon ariaLabel="Appearance" tooltip="Appearance" />
    case "density":
      return (
        <AppShellDensityIcon ariaLabel="Layout density" tooltip="Layout density" />
      )
    case "locale":
      return <AppShellLocaleIcon ariaLabel="Language" tooltip="Language" />
    case "shortcuts":
      return (
        <AppShellShortcutsIcon ariaLabel="Shortcuts" tooltip="Keyboard shortcuts" />
      )
    case "feedback":
      return (
        <AppShellFeedbackIcon ariaLabel="Feedback" tooltip="Send feedback" />
      )
    case "help":
      return <AppShellHelpIcon href={href} ariaLabel="Help" tooltip="Help & docs" />
    case "settings":
      return (
        <AppShellSettingsIcon
          href={href}
          ariaLabel={settingsAriaLabel}
          tooltip={settingsTooltip}
        />
      )
    case "connectivity":
      return (
        <AppShellConnectivityIcon ariaLabel="Network status" tooltip="Connectivity" />
      )
    case "storage":
      return (
        <AppShellStorageIcon ariaLabel="Storage" tooltip="Storage inspector" />
      )
    case "screenshot":
      return <AppShellScreenshotIcon ariaLabel="Screenshot" tooltip="Screenshot" />
    case "upload":
      return <AppShellUploadIcon ariaLabel="Upload" tooltip="File upload" />
    case "diagnosis":
      return (
        <AppShellDiagnosisIcon ariaLabel="Diagnosis" tooltip="Network diagnosis" />
      )
    case "messenger":
      return <AppShellMessengerIcon ariaLabel="Messenger" tooltip="Messenger" />
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
          "before:absolute before:-left-[3px] before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-ring"
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
}: AppShellUtilityBarRightProps) {
  const tBar = useTranslations("Dashboard.shell.utilityBar")
  const items = useUtilityBarStore((s) => s.items)
  const reorderVisibleInRail = useUtilityBarStore((s) => s.reorderVisibleInRail)
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
      ...selectVisibleItems(useUtilityBarStore.getState().items).map((i) => i.id),
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
            settingsAriaLabel={tBar("settingsAriaLabel")}
            settingsTooltip={tBar("settingsTooltip")}
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
