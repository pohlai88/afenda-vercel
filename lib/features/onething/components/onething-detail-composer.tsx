"use client"

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"

import { useOneThingDraftPersistence } from "./hooks/use-onething-draft-persistence"
import { ONETHING_FOCUS_COMPOSER_EVENT } from "./hooks/onething-shell-events"
import { splitOneThingDraft } from "./hooks/split-onething-draft.shared"

import type {
  CreateOrgOneThingFormState,
  OneThingRow,
} from "#features/onething/client"

/**
 * Composer — a draft row that sits at the top of the list pane.
 *
 * Multi-line behavioral fidelity (Apple Notes / Mail):
 *
 *   first line  → consequence headline (sent as `title`, schema-validated)
 *   remaining   → narrative body (sent as `consequence`, no headline rules)
 *
 * The textarea itself is unnamed (state-driven) so it does not submit; two
 * hidden inputs derive the headline + body from the same draft string.
 *
 * Drafts persist in `localStorage` per scope+listId so a network drop or
 * crash never costs the operator's words.
 *
 * Keyboard ownership (distributed, no shell-level coupling):
 *
 *   N or C  → focus the textarea (when not already typing in an input)
 *   ⌘Enter / Ctrl+Enter → submit
 *   Esc     → blur
 *
 * The composer also listens for the `onething:focus-composer` event,
 * dispatched by `useResolveWithFocusHandoff` when the queue runs dry.
 */

type ComposerActions = {
  scope: "org" | "personal"
  listId: string
  /**
   * The seeded JSON-encoded `linkage` payload for the canvas — RSC builds
   * it from the route context (org slug / locale / runId).
   */
  linkageJson?: string
  provenanceJson?: string
  counterpartyJson?: string
  impactJson?: string
  create: (
    prev: CreateOrgOneThingFormState,
    fd: FormData
  ) => Promise<CreateOrgOneThingFormState>
  /**
   * Optional notification when the create action commits — page can use it
   * to focus the new row (the ranker may not place it at the top).
   */
  onCreated?: (next: { id: string | null }) => void
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="sm"
      disabled={pending}
      className="h-7 px-3 text-xs"
    >
      {pending ? "…" : label}
    </Button>
  )
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

export function OneThingDetailComposer({
  actions,
  pendingDraft,
}: {
  actions: ComposerActions
  /** Optional pending row to render with the composer's draft text. */
  pendingDraft?: OneThingRow | null
}) {
  const t = useTranslations("Dashboard.OneThing")

  const { draft, setDraft, clearDraft } = useOneThingDraftPersistence({
    scope: actions.scope,
    listId: actions.listId,
  })

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  // Capture the create action and clear-draft callback in refs so the
  // wrapped action passed to useActionState stays referentially stable
  // (useActionState identity is sticky across re-renders).
  const createRef = useRef(actions.create)
  const onCreatedRef = useRef(actions.onCreated)
  const clearDraftRef = useRef(clearDraft)
  useEffect(() => {
    createRef.current = actions.create
    onCreatedRef.current = actions.onCreated
    clearDraftRef.current = clearDraft
  }, [actions.create, actions.onCreated, clearDraft])

  const wrappedCreate = useCallback(
    async (
      prev: CreateOrgOneThingFormState,
      fd: FormData
    ): Promise<CreateOrgOneThingFormState> => {
      const result = await createRef.current(prev, fd)
      if (result?.ok) {
        clearDraftRef.current()
        formRef.current?.reset()
        onCreatedRef.current?.({ id: null })
      }
      return result
    },
    []
  )

  const [createState, createAction] = useActionState<
    CreateOrgOneThingFormState,
    FormData
  >(wrappedCreate, undefined)

  // Auto-grow the textarea — keep the row compact for one-line captures
  // but accept multi-line paste without truncating.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  // Keyboard ownership: N or C focuses the composer when the operator is
  // not already typing into something. Distributed listener so the shell
  // does not need to lift composer state.
  useEffect(() => {
    function onKey(e: KeyboardEvent | globalThis.KeyboardEvent) {
      if (isInteractiveTarget(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key !== "n" && key !== "c") return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener(
      "keydown",
      onKey as (e: globalThis.KeyboardEvent) => void
    )
    return () => {
      document.removeEventListener(
        "keydown",
        onKey as (e: globalThis.KeyboardEvent) => void
      )
    }
  }, [])

  // Empty-queue hand-off: when the resolve hook clears focus, it dispatches
  // this event so the composer takes over without prop drilling.
  useEffect(() => {
    function onFocusComposer() {
      inputRef.current?.focus()
    }
    window.addEventListener(ONETHING_FOCUS_COMPOSER_EVENT, onFocusComposer)
    return () => {
      window.removeEventListener(ONETHING_FOCUS_COMPOSER_EVENT, onFocusComposer)
    }
  }, [])

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (draft.trim().length > 0) {
        formRef.current?.requestSubmit()
      }
    }
    if (e.key === "Escape") {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (draft.trim().length === 0) {
      e.preventDefault()
    }
  }

  const errorMessage =
    createState && !createState.ok
      ? (createState.errors?.title ?? createState.errors?.form ?? null)
      : null

  const { headline, body } = useMemo(() => splitOneThingDraft(draft), [draft])

  return (
    <form
      ref={formRef}
      action={createAction}
      onSubmit={onSubmit}
      className="flex flex-col gap-2 border-b border-border/40 bg-background px-3 py-2.5"
    >
      <input type="hidden" name="listId" value={actions.listId} />
      <input type="hidden" name="title" value={headline} />
      <input type="hidden" name="consequence" value={body} />
      {actions.linkageJson ? (
        <input type="hidden" name="linkage" value={actions.linkageJson} />
      ) : null}
      {actions.provenanceJson ? (
        <input type="hidden" name="provenance" value={actions.provenanceJson} />
      ) : null}
      {actions.counterpartyJson ? (
        <input
          type="hidden"
          name="counterparty"
          value={actions.counterpartyJson}
        />
      ) : null}
      {actions.impactJson ? (
        <input type="hidden" name="impact" value={actions.impactJson} />
      ) : null}

      <textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onKeyDown={onKeyDown}
        placeholder={t("shell.composerPlaceholder")}
        rows={1}
        className="w-full resize-none border-0 bg-transparent px-0 py-1 text-sm leading-snug text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        aria-label={t("shell.composerPlaceholder")}
      />

      {errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {draft.trim().length > 0 ? (
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span aria-hidden>{t("shell.composerSubmitHint")}</span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => clearDraft()}
              className="h-7 px-2 text-xs"
            >
              {t("shell.composerCancel")}
            </Button>
            <SubmitButton label={t("shell.composerSubmit")} />
          </div>
        </div>
      ) : null}

      {pendingDraft ? (
        <p className="text-[11px] text-muted-foreground italic">
          {pendingDraft.title}
        </p>
      ) : null}
    </form>
  )
}
