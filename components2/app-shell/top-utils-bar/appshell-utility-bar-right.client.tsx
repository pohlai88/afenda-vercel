"use client"

import { useState, type DragEvent, type ReactNode } from "react"
import type { Route } from "next"

import { cn } from "#lib/utils"

import type { MessengerPanelTransport } from "#features/messenger/client"
import type { QuickCreateMenu } from "#features/nexus/client"
import type {
  UtilityBarCapabilityRow,
  UtilityBarRailSnapshot,
} from "#features/nexus/client"

import {
  selectVisibleItems,
  useUtilityBarStore,
} from "../../stores/utility-bar.store"
import type { UtilityBarItemId } from "./appshell-utility-bar-items"
import {
  AppShellAccountDropdown,
  type AppShellAccountDropdownProps,
} from "./appshell-utility-bar-account-dropdown.client"
import { AppShellMarketplacePanel } from "./appshell-utility-bar-marketplace.client"
import { AppShellNexusUtilityNotifications } from "./appshell-nexus-utility-notifications.client"
import { UtilityBarQuickCreatePanel } from "./appshell-utility-bar-quick-create.client"
import { UtilityBarRailHydrator } from "./appshell-utility-bar-rail-hydrator.client"
import {
  AppShellAvatarDisc,
  AppShellHelpIcon,
  AppShellLocaleDropdown,
  AppShellSearchMobileIcon,
  AppShellThemeIcon,
} from "./appshell-utility-bar.client"
import { UtilityBarConnectivityPanel } from "./appshell-utility-bar-connectivity.client"
import { UtilityBarCoordinationPanel } from "./appshell-utility-bar-coordination.client"
import { UtilityBarDensityPanel } from "./appshell-utility-bar-density.client"
import { UtilityBarDiagnosisPanel } from "./appshell-utility-bar-diagnosis.client"
import { UtilityBarFeedbackPanel } from "./appshell-utility-bar-feedback.client"
import { UtilityBarLynxPanel } from "./appshell-utility-bar-lynx.client"
import { UtilityBarMessengerPanel } from "./appshell-utility-bar-messenger.client"
import { UtilityBarOrgAdminPanel } from "./appshell-utility-bar-org-admin.client"
import { UtilityBarScreenshotPanel } from "./appshell-utility-bar-screenshot.client"
import { UtilityBarShortcutsPanel } from "./appshell-utility-bar-shortcuts.client"
import { UtilityBarStoragePanel } from "./appshell-utility-bar-storage.client"
import { UtilityBarUploadPanel } from "./appshell-utility-bar-upload.client"
import { useAppShellStore } from "../../stores/app-shell.store"

export type AppShellUtilityBarRightProps = {
  hrefs?: {
    insight?: Route
    help?: Route
    settings?: Route
  }
  integrationsHref?: Route
  avatarAriaLabel?: string
  avatarTooltip?: string
  onAvatarClickAction?: () => void
  marketplaceAriaLabel?: string
  marketplaceTooltip?: string
  account?: AppShellAccountDropdownProps
  messengerPreviewStub?: boolean
  messengerTransport?: MessengerPanelTransport
  workspaceBlobOrganizationId?: string | null
  orgSlug?: string | null
  quickCreateMenu?: QuickCreateMenu
  railSnapshot?: UtilityBarRailSnapshot
  capabilityRows?: readonly UtilityBarCapabilityRow[]
  notificationsCanManage?: boolean
  showOrgAdminIntegrations?: boolean
}

function RailIcon({
  id,
  hrefs,
  openCommand,
  workspaceBlobOrganizationId,
  orgSlug,
  messengerPreviewStub,
  messengerTransport,
  quickCreateMenu,
  notificationsCanManage,
}: {
  id: UtilityBarItemId
  hrefs?: AppShellUtilityBarRightProps["hrefs"]
  openCommand: () => void
  workspaceBlobOrganizationId?: string | null
  orgSlug?: string | null
  messengerPreviewStub?: boolean
  messengerTransport?: MessengerPanelTransport
  quickCreateMenu?: QuickCreateMenu
  notificationsCanManage?: boolean
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
      return quickCreateMenu ? (
        <UtilityBarQuickCreatePanel menu={quickCreateMenu} />
      ) : null
    case "notifications":
      return (
        <AppShellNexusUtilityNotifications
          canManage={Boolean(notificationsCanManage)}
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
      return (
        <UtilityBarScreenshotPanel
          organizationId={workspaceBlobOrganizationId ?? null}
        />
      )
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
  onDragOver: (e: DragEvent, index: number) => void
  onDrop: (e: DragEvent) => void
  onDragEnd: () => void
  children: ReactNode
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
          // Ignored — drag metadata is optional.
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
  quickCreateMenu,
  railSnapshot,
  capabilityRows = [],
  notificationsCanManage = false,
  showOrgAdminIntegrations = false,
  integrationsHref,
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

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    setOverIndex(index)
  }

  function handleDrop(e: DragEvent) {
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
      {railSnapshot ? <UtilityBarRailHydrator snapshot={railSnapshot} /> : null}

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
            quickCreateMenu={quickCreateMenu}
            notificationsCanManage={notificationsCanManage}
          />
        </DraggableRailItem>
      ))}

      <AppShellMarketplacePanel
        triggerAriaLabel={marketplaceAriaLabel}
        triggerTooltip={marketplaceTooltip}
        capabilityRows={capabilityRows}
        integrationsHref={
          showOrgAdminIntegrations ? integrationsHref : undefined
        }
      />

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
