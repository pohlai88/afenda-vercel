"use client"

import { Camera, MessageCircle, Upload } from "lucide-react"

import { NexusUtilityPlaceholderPopover } from "./nexus-utility-placeholder-popover"

export function NexusUtilityMessengerPlaceholder() {
  return (
    <NexusUtilityPlaceholderPopover widgetKey="messenger" icon={MessageCircle} />
  )
}

export function NexusUtilityScreenshotPlaceholder() {
  return (
    <NexusUtilityPlaceholderPopover widgetKey="screenshot" icon={Camera} />
  )
}

export function NexusUtilityUploadPlaceholder() {
  return (
    <NexusUtilityPlaceholderPopover widgetKey="upload" icon={Upload} />
  )
}
