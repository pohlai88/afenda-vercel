export type ModulePageHeaderProps = {
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
    <header className="flex flex-col gap-surface-xs">
      <p className="text-label-small font-medium tracking-wide text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className="text-title-large font-semibold tracking-tight">{title}</h2>
      {description ? (
        <p className="text-body-medium text-muted-foreground">{description}</p>
      ) : null}
    </header>
  )
}
