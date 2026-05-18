export {
  organizationAppsPath,
  ORG_APPS_CONTACTS,
} from "#lib/org-apps-module-paths"

// ---------------------------------------------------------------------------
// Contact avatar helpers — deterministic initials + semantic color bucket.
// All class pairs resolve through existing CSS variable tokens (no raw palette).
// ---------------------------------------------------------------------------

export function getContactInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const AVATAR_COLOR_CLASSES = [
  "bg-primary/10 text-primary",
  "bg-info/15 text-info",
  "bg-success/15 text-success",
  "bg-warning/20 text-warning-foreground",
  "bg-destructive/10 text-destructive",
] as const

export function getContactAvatarColor(name: string): string {
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length]!
}
