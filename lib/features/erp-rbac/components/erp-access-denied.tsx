import { GovernedEmpty, GovernedSurface } from "#features/governed-surface"

export function ErpAccessDenied({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <GovernedSurface
      header={{
        title,
        description,
      }}
    >
      <GovernedEmpty
        model={{
          variant: "forbidden",
          title: "RBAC access required",
          description,
        }}
      />
    </GovernedSurface>
  )
}
