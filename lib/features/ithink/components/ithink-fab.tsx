"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "#components/ui/button"

import type { IThinkListRow } from "../types"
import { IThinkQuickAdd } from "./ithink-quick-add"

type IThinkFabProps = {
  lists: IThinkListRow[]
  defaultListId: string
}

export function IThinkFab({ lists, defaultListId }: IThinkFabProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        size="icon"
        aria-label="Add task"
        className="fixed right-6 bottom-6 z-40 h-12 w-12 rounded-full shadow-lg lg:hidden"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className="size-5" aria-hidden />
      </Button>
      <IThinkQuickAdd
        lists={lists}
        defaultListId={defaultListId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
