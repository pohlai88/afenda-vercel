"use client"

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import { useTranslations } from "next-intl"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "#components/ui/command"
import { useRouter } from "#i18n/navigation"

import { isTypingTarget } from "./workbench-keyboard-utils"

type WorkbenchCommandContextValue = {
  open: boolean
  query: string
  setQuery: Dispatch<SetStateAction<string>>
  openCommand: (options?: { query?: string }) => void
  closeCommand: () => void
  toggleCommand: () => void
}

export type WorkbenchCommandItem = {
  label: string
  href: string
  description?: string
  keywords?: string[]
  shortcut?: string
}

export type WorkbenchCommandSection = {
  heading: string
  items: WorkbenchCommandItem[]
}

export type WorkbenchCommandLayerProps = {
  title: string
  description: string
  sections: WorkbenchCommandSection[]
}

const WorkbenchCommandContext =
  createContext<WorkbenchCommandContextValue | null>(null)

export function WorkbenchCommandProvider({
  children,
}: {
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const openCommand = useCallback((options?: { query?: string }) => {
    if (options?.query !== undefined) {
      setQuery(options.query)
    }
    setOpen(true)
  }, [])

  const closeCommand = useCallback(() => {
    setOpen(false)
    setQuery("")
  }, [])

  const toggleCommand = useCallback(() => {
    setOpen((previous) => {
      const next = !previous
      if (!next) {
        setQuery("")
      }
      return next
    })
  }, [])

  const value = useMemo<WorkbenchCommandContextValue>(
    () => ({
      open,
      query,
      setQuery,
      openCommand,
      closeCommand,
      toggleCommand,
    }),
    [open, query, openCommand, closeCommand, toggleCommand]
  )

  return (
    <WorkbenchCommandContext.Provider value={value}>
      {children}
    </WorkbenchCommandContext.Provider>
  )
}

export function useWorkbenchCommand(): WorkbenchCommandContextValue {
  const ctx = useContext(WorkbenchCommandContext)
  if (!ctx) {
    throw new Error(
      "useWorkbenchCommand must be used within WorkbenchCommandProvider"
    )
  }
  return ctx
}

export function WorkbenchCommandLayer({
  title,
  description,
  sections,
}: WorkbenchCommandLayerProps) {
  const { open, query, setQuery, closeCommand, toggleCommand } =
    useWorkbenchCommand()
  const router = useRouter()
  const tCommand = useTranslations("Dashboard.commandPalette")

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return
      if (event.key !== "k") return
      if (!event.metaKey && !event.ctrlKey) return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      toggleCommand()
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [toggleCommand])

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href as Parameters<typeof router.push>[0])
      closeCommand()
    },
    [router, closeCommand]
  )

  const nonEmpty = useMemo(
    () => sections.filter((section) => section.items.length > 0),
    [sections]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeCommand()
      }}
      title={title}
      description={description}
    >
      <Command
        loop
        label={title}
        className="rounded-none border-0 bg-transparent p-0 shadow-none"
      >
        <CommandInput
          placeholder={tCommand("placeholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            <div className="space-y-1">
              <p className="font-medium">{tCommand("empty")}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </CommandEmpty>
          {nonEmpty.map((section, index) => (
            <Fragment key={section.heading}>
              {index > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={section.heading}>
                {section.items.map((item) => (
                  <CommandItem
                    key={`${item.label}-${item.href}`}
                    value={item.label}
                    keywords={[
                      item.href,
                      ...(item.description ? [item.description] : []),
                      ...(item.keywords ?? []),
                    ]}
                    onSelect={() => handleNavigate(item.href)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.label}
                      </p>
                      {item.description ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    {item.shortcut ? (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Fragment>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
