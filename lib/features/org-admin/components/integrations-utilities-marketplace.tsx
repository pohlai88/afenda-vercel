"use client"

import { useActionState, useMemo, useState } from "react"
import { useFormStatus } from "react-dom"
import {
  Activity,
  Bell,
  Building2,
  Camera,
  CircleHelp,
  Database,
  Keyboard,
  Languages,
  LayoutGrid,
  MessageCircle,
  MessageSquare,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  Upload,
  Wifi,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Badge } from "#components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import { Empty, EmptyHeader, EmptyTitle } from "#components/ui/empty"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs"
import { Textarea } from "#components/ui/textarea"
import {
  NEXUS_UTILITY_CATALOG,
  NEXUS_UTILITY_MARKETPLACE_REQUEST_KIND,
  NEXUS_UTILITY_MARKETPLACE_SOURCE,
  type NexusUtilityCatalogEntry,
  type NexusUtilityIconKey,
} from "#features/nexus"
import {
  submitOrgFeedbackAction,
  type SubmitOrgFeedbackState,
} from "#features/org-feedback/client"
import { Link, usePathname } from "#i18n/navigation"
import {
  organizationAdminPath,
  organizationDashboardPath,
} from "#lib/dashboard-module-paths"

const ICONS: Record<NexusUtilityIconKey, LucideIcon> = {
  activity: Activity,
  bell: Bell,
  building2: Building2,
  camera: Camera,
  circleHelp: CircleHelp,
  database: Database,
  keyboard: Keyboard,
  languages: Languages,
  layoutGrid: LayoutGrid,
  messageCircle: MessageCircle,
  messageSquare: MessageSquare,
  penLine: PenLine,
  search: Search,
  shieldCheck: ShieldCheck,
  sparkles: Sparkles,
  store: Store,
  sun: Sun,
  upload: Upload,
  wifi: Wifi,
}

const MARKETPLACE_ITEM_TITLE_KEYS = {
  marketplace: "items.marketplace.title",
  console: "items.console.title",
  quickCreate: "items.quickCreate.title",
  notifications: "items.notifications.title",
  connectivity: "items.connectivity.title",
  diagnosis: "items.diagnosis.title",
  searchMobile: "items.searchMobile.title",
  shortcuts: "items.shortcuts.title",
  help: "items.help.title",
  theme: "items.theme.title",
  density: "items.density.title",
  locale: "items.locale.title",
  messenger: "items.messenger.title",
  feedback: "items.feedback.title",
  screenshot: "items.screenshot.title",
  upload: "items.upload.title",
  storage: "items.storage.title",
  insight: "items.insight.title",
  settings: "items.settings.title",
  customIcon: "items.customIcon.title",
} as const

const MARKETPLACE_ITEM_DESCRIPTION_KEYS = {
  marketplace: "items.marketplace.description",
  console: "items.console.description",
  quickCreate: "items.quickCreate.description",
  notifications: "items.notifications.description",
  connectivity: "items.connectivity.description",
  diagnosis: "items.diagnosis.description",
  searchMobile: "items.searchMobile.description",
  shortcuts: "items.shortcuts.description",
  help: "items.help.description",
  theme: "items.theme.description",
  density: "items.density.description",
  locale: "items.locale.description",
  messenger: "items.messenger.description",
  feedback: "items.feedback.description",
  screenshot: "items.screenshot.description",
  upload: "items.upload.description",
  storage: "items.storage.description",
  insight: "items.insight.description",
  settings: "items.settings.description",
  customIcon: "items.customIcon.description",
} as const

function UtilityMarketplaceSubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  )
}

function UtilityMarketplaceRequestForm({
  entry,
  orgSlug,
  onClose,
}: {
  entry: NexusUtilityCatalogEntry
  orgSlug: string
  onClose: () => void
}) {
  const t = useTranslations("OrgAdmin.integrations.marketplace")
  const pathname = usePathname()
  const [message, setMessage] = useState("")
  const [state, formAction] = useActionState(submitOrgFeedbackAction, {
    status: "idle",
  } satisfies SubmitOrgFeedbackState)
  const utilityTitle = t(MARKETPLACE_ITEM_TITLE_KEYS[entry.itemKey])

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border/60 bg-muted/35 p-4">
          <p className="text-sm font-medium text-foreground">
            {t("requestSuccessTitle")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("requestSuccessDescription")}
          </p>
        </div>
        <DialogFooter>
          <Button asChild variant="outline">
            <Link href={organizationAdminPath(orgSlug, "feedback")}>
              {t("requestOpenInbox")}
            </Link>
          </Button>
          <Button type="button" onClick={onClose}>
            {t("requestClose")}
          </Button>
        </DialogFooter>
      </div>
    )
  }

  const messageError =
    state.status === "validation" ? state.fieldErrors.message : undefined

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="category" value="idea" readOnly />
      <input type="hidden" name="severity" value="normal" readOnly />
      <input type="hidden" name="path" value={pathname} readOnly />
      <input
        type="hidden"
        name="source"
        value={NEXUS_UTILITY_MARKETPLACE_SOURCE}
        readOnly
      />
      <input
        type="hidden"
        name="requestKind"
        value={NEXUS_UTILITY_MARKETPLACE_REQUEST_KIND}
        readOnly
      />
      <input type="hidden" name="utilityId" value={entry.id} readOnly />

      <FieldGroup>
        <Field data-invalid={Boolean(messageError)}>
          <FieldLabel htmlFor="utility-marketplace-message">
            {t("requestMessageLabel")}
          </FieldLabel>
          <FieldContent>
            <Textarea
              id="utility-marketplace-message"
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              required
              placeholder={t("requestMessagePlaceholder", {
                utility: utilityTitle,
              })}
              aria-invalid={Boolean(messageError)}
            />
            <FieldError>
              {messageError ? t(`errors.${messageError}`) : null}
            </FieldError>
          </FieldContent>
        </Field>
      </FieldGroup>

      {state.status === "error" ? (
        <p className="text-xs text-destructive">{t("errors.errorGeneric")}</p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("requestCancel")}
        </Button>
        <UtilityMarketplaceSubmitButton
          idleLabel={t("requestSubmit")}
          pendingLabel={t("requestSubmitting")}
        />
      </DialogFooter>
    </form>
  )
}

type UtilityMarketplaceCardProps = {
  entry: NexusUtilityCatalogEntry
  orgSlug: string
  onRequest: (entry: NexusUtilityCatalogEntry) => void
}

function UtilityMarketplaceCard({
  entry,
  orgSlug,
  onRequest,
}: UtilityMarketplaceCardProps) {
  const t = useTranslations("OrgAdmin.integrations.marketplace")
  const Icon = ICONS[entry.iconKey]
  const title = t(MARKETPLACE_ITEM_TITLE_KEYS[entry.itemKey])
  const description = t(MARKETPLACE_ITEM_DESCRIPTION_KEYS[entry.itemKey])

  return (
    <Card size="sm" className="border border-border/60 bg-background/80">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/35">
            <Icon
              className="size-5 text-foreground/80"
              aria-hidden
              strokeWidth={2}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        <Badge variant="outline">
          {t(`status.${entry.marketplaceStatus}`)}
        </Badge>
        {entry.rightRailCompatible ? (
          <Badge variant="secondary">{t("badgeRightRail")}</Badge>
        ) : null}
        {entry.requestable ? (
          <Badge variant="info">{t("badgeRequestOnly")}</Badge>
        ) : null}
      </CardContent>
      <CardFooter className="justify-between gap-3 border-t border-border/50 pt-surface-md">
        <p className="text-xs text-muted-foreground">
          {entry.marketplaceStatus === "installed"
            ? t("installedHint")
            : entry.marketplaceStatus === "availableByRequest"
              ? t("requestHint")
              : t("comingSoonHint")}
        </p>
        {entry.marketplaceStatus === "installed" ? (
          <Button asChild variant="outline" size="sm">
            <Link href={organizationDashboardPath(orgSlug, "home")}>
              {t("actionManage")}
            </Link>
          </Button>
        ) : entry.marketplaceStatus === "availableByRequest" ? (
          <Button type="button" size="sm" onClick={() => onRequest(entry)}>
            {t("actionRequest")}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            {t("actionComingSoon")}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export function IntegrationsUtilitiesMarketplace({
  orgSlug,
}: {
  orgSlug: string
}) {
  const t = useTranslations("OrgAdmin.integrations.marketplace")
  const [requestEntry, setRequestEntry] =
    useState<NexusUtilityCatalogEntry | null>(null)

  const groups = useMemo(() => {
    const listed: NexusUtilityCatalogEntry[] = NEXUS_UTILITY_CATALOG.filter(
      (entry) => entry.marketplaceListed
    )
    return {
      installed: listed.filter(
        (entry) => entry.marketplaceStatus === "installed"
      ),
      availableByRequest: listed.filter(
        (entry) => entry.marketplaceStatus === "availableByRequest"
      ),
      comingSoon: listed.filter(
        (entry) => entry.marketplaceStatus === "comingSoon"
      ),
    }
  }, [])

  return (
    <>
      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold tracking-tight">{t("title")}</h3>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <Tabs defaultValue="installed" className="gap-4">
          <TabsList>
            <TabsTrigger value="installed">{t("tabInstalled")}</TabsTrigger>
            <TabsTrigger value="availableByRequest">
              {t("tabAvailableByRequest")}
            </TabsTrigger>
            <TabsTrigger value="comingSoon">{t("tabComingSoon")}</TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {t("tabInstalledDescription")}
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {groups.installed.map((entry) => (
                <UtilityMarketplaceCard
                  key={entry.id}
                  entry={entry}
                  orgSlug={orgSlug}
                  onRequest={setRequestEntry}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent
            value="availableByRequest"
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-muted-foreground">
              {t("tabAvailableByRequestDescription")}
            </p>
            {groups.availableByRequest.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {groups.availableByRequest.map((entry) => (
                  <UtilityMarketplaceCard
                    key={entry.id}
                    entry={entry}
                    orgSlug={orgSlug}
                    onRequest={setRequestEntry}
                  />
                ))}
              </div>
            ) : (
              <Empty className="border border-dashed border-border/60 bg-muted/20 px-5 py-8">
                <EmptyHeader>
                  <EmptyTitle className="text-sm">
                    {t("emptyAvailableByRequest")}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            )}
          </TabsContent>

          <TabsContent value="comingSoon" className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {t("tabComingSoonDescription")}
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {groups.comingSoon.map((entry) => (
                <UtilityMarketplaceCard
                  key={entry.id}
                  entry={entry}
                  orgSlug={orgSlug}
                  onRequest={setRequestEntry}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <Dialog
        open={requestEntry !== null}
        onOpenChange={(open) => {
          if (!open) setRequestEntry(null)
        }}
      >
        <DialogContent>
          {requestEntry ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {t("requestTitle", {
                    utility: t(
                      MARKETPLACE_ITEM_TITLE_KEYS[requestEntry.itemKey]
                    ),
                  })}
                </DialogTitle>
                <DialogDescription>{t("requestDescription")}</DialogDescription>
              </DialogHeader>
              <UtilityMarketplaceRequestForm
                key={requestEntry.id}
                entry={requestEntry}
                orgSlug={orgSlug}
                onClose={() => setRequestEntry(null)}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
