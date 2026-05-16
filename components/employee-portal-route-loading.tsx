import { Skeleton } from "#components/ui/skeleton"

export type EmployeePortalRouteLoadingVariant = "list" | "detail" | "form"

type EmployeePortalRouteLoadingProps = {
  variant?: EmployeePortalRouteLoadingVariant
}

/**
 * Default `loading.tsx` skeleton for employee portal sections — mirrors portal
 * chrome density (header + nav rail + primary panel).
 */
export function EmployeePortalRouteLoading({
  variant = "list",
}: EmployeePortalRouteLoadingProps) {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <PortalLoadingBody variant={variant} />
    </div>
  )
}

function PortalLoadingBody({
  variant,
}: {
  variant: EmployeePortalRouteLoadingVariant
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      {variant === "detail" ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : variant === "form" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      )}
    </>
  )
}

export default function EmployeePortalRouteLoadingDefault() {
  return <EmployeePortalRouteLoading />
}
