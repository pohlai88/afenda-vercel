import type { useTranslations } from "next-intl"

import type { CapabilityCardCopy } from "./capability-card"
import type { CapabilityDetailDialogCopy } from "./capability-detail-dialog.client"
import type { CapabilityTableRowCopy } from "./capability-table"
import type { CapabilityToggleButtonProps } from "./capability-toggle-button.client"
import type {
  CapabilityDefinition,
  ResolvedCapability,
  ResolvedEffectiveState,
  ResolvedSource,
} from "../types"

/**
 * Translator surface (server or client) — narrowed to what
 * `Marketplace` namespace needs. Both `getTranslations("Marketplace")`
 * (RSC) and `useTranslations("Marketplace")` (client) satisfy this
 * interface, so the copy builder works in either context.
 */
type MarketplaceTranslator = ReturnType<typeof useTranslations<"Marketplace">>

/**
 * Pure shape that the page composer uses to read every translation
 * the catalog needs. Keeps `useTranslations` calls in one place
 * (the RSC page) instead of leaking i18n into the leaf components.
 *
 * Every field is a localized string already — the leaves do not call
 * `next-intl` themselves. This is deliberate so the components stay
 * independently testable with stubbed copy.
 */
export type MarketplaceCopySource = {
  readonly itemTitle: (itemKey: string) => string
  readonly itemDescription: (itemKey: string) => string
  readonly stateBadge: (state: ResolvedEffectiveState) => string
  readonly sourceBadge: (source: ResolvedSource) => string
  readonly stateHint: (state: ResolvedEffectiveState) => string
  readonly toggle: CapabilityToggleButtonProps["labels"]
  readonly detail: CapabilityDetailDialogCopy
}

export function buildCapabilityCardCopy(
  resolved: ResolvedCapability,
  copy: MarketplaceCopySource
): CapabilityCardCopy {
  const def = resolved.definition
  return {
    title: copy.itemTitle(def.itemKey),
    description: copy.itemDescription(def.itemKey),
    stateHint: copy.stateHint(resolved.effective),
    stateBadge: copy.stateBadge(resolved.effective),
    sourceBadge: copy.sourceBadge(resolved.source),
    toggle: copy.toggle,
  }
}

export function buildCapabilityTableRowCopy(
  resolved: ResolvedCapability,
  copy: MarketplaceCopySource
): CapabilityTableRowCopy {
  const def = resolved.definition
  return {
    title: copy.itemTitle(def.itemKey),
    description: copy.itemDescription(def.itemKey),
    stateBadge: copy.stateBadge(resolved.effective),
    sourceBadge: copy.sourceBadge(resolved.source),
  }
}

export function getCapabilityDisplayName(
  definition: CapabilityDefinition,
  copy: Pick<MarketplaceCopySource, "itemTitle">
): string {
  return copy.itemTitle(definition.itemKey)
}

/**
 * Compose the full copy source from a single translator instance.
 * Centralized so RSC pages and (future) client islands stay in sync
 * on which keys they read.
 */
export function buildMarketplaceCopySource(
  t: MarketplaceTranslator
): MarketplaceCopySource {
  return {
    itemTitle: (key) => t(`items.${key}.title` as never),
    itemDescription: (key) => t(`items.${key}.description` as never),
    stateBadge: (state) => t(`shell.metaStateBadge.${state}` as never),
    sourceBadge: (source) => t(`shell.metaSourceBadge.${source}` as never),
    stateHint: (state) => t(`shell.stateHint.${state}` as never),
    toggle: {
      enable: t("toggle.enable"),
      disable: t("toggle.disable"),
      pending: t("toggle.pending"),
      mandatory: t("toggle.mandatory"),
      blocked: t("toggle.blocked"),
      unavailable: t("toggle.unavailable"),
      notCustomizable: t("toggle.notCustomizable"),
      error: t("toggle.error"),
    },
    detail: {
      triggerLabel: t("detail.trigger"),
      closeLabel: t("detail.close"),
      metaTitle: t("detail.metaTitle"),
      metaSourceLabel: t("detail.metaSourceLabel"),
      metaStateLabel: t("detail.metaStateLabel"),
      metaCustomizableLabel: t("detail.metaCustomizableLabel"),
      metaCustomizableYes: t("detail.metaCustomizableYes"),
      metaCustomizableNo: t("detail.metaCustomizableNo"),
    },
  }
}
