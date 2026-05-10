type ModulePageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
}

export function ModulePageHeader({
  title,
  description,
  eyebrow = "ERP module",
}: ModulePageHeaderProps) {
  return (
    <header className="space-y-surface-xs">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  )
}
