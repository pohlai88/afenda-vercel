/** Skip-navigation anchor for AppShell surfaces. */
export function AppShellSkipToMain({
  label,
  mainId = "app-shell-main",
}: {
  label: string
  mainId?: string
}) {
  return (
    <a
      href={`#${mainId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-elevation-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </a>
  )
}
