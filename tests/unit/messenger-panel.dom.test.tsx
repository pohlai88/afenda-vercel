// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { NextIntlClientProvider } from "next-intl"

import { MessengerPanel } from "#features/messenger/client"

const messages = {
  Dashboard: {
    shell: {
      utilityBar: {
        messenger: {
          trigger: "Messenger",
          tooltip: "Open chats",
          title: "Messenger",
          description: "Org chat",
          previewStub: "Preview stub",
          newRoom: "New room",
          roomsTitle: "Rooms",
          emptyRooms: "No rooms",
          unnamedRoom: "Room",
          selectRoom: "Pick a room",
          emptyMessages: "No messages",
          composerPlaceholder: "Type…",
          send: "Send",
          newRoomTitle: "New room",
          roomNameLabel: "Name",
          roomNamePlaceholder: "Name",
          memberIdsLabel: "Members",
          memberIdsPlaceholder: "Ids",
          cancel: "Cancel",
          createRoom: "Create",
          errors: { createNeedsMembers: "Need members" },
        },
      },
    },
  },
} as const

function renderMessenger() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <MessengerPanel
        organizationId="org-1"
        previewStub
        hideTrigger
        open
        onOpenChange={() => {}}
        transport={{
          listRooms: async () => ({
            ok: true,
            rooms: [
              {
                id: "r1",
                organizationId: "org-1",
                kind: "group",
                name: "Team",
                lastMessageAt: new Date().toISOString(),
                lastMessagePreview: "hey",
              },
            ],
          }),
          listMessages: async () => ({
            ok: true,
            messages: [
              {
                id: "m1",
                roomId: "r1",
                organizationId: "org-1",
                authorUserId: "u1",
                body: "hello",
                createdAt: new Date().toISOString(),
              },
            ],
          }),
          sendMessage: async () => ({
            ok: true,
            message: {
              id: "m2",
              roomId: "r1",
              organizationId: "org-1",
              authorUserId: "u1",
              body: "sent",
              createdAt: new Date().toISOString(),
            },
          }),
          createGroupRoom: async () => ({ ok: true, roomId: "r1" }),
          markRead: async () => ({ ok: true }),
        }}
      />
    </NextIntlClientProvider>
  )
}

describe("MessengerPanel", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders stub banner and can send via transport", async () => {
    renderMessenger()
    expect(await screen.findByText(/Preview stub/i)).toBeTruthy()
    expect(await screen.findByText("Team")).toBeTruthy()
    fireEvent.click(screen.getByText("Team"))
    const ta = await screen.findByPlaceholderText("Type…")
    fireEvent.change(ta, { target: { value: "hello" } })
    fireEvent.click(screen.getByRole("button", { name: "Send" }))
    expect(await screen.findByText("sent")).toBeTruthy()
  })
})
