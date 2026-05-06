import { Skeleton } from "#components/ui/skeleton"

export default function Loading() {
  return (
    <div className="relative flex min-h-svh flex-col p-6">
      <div className="absolute end-6 top-6">
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <div className="flex max-w-md min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-4 w-full max-w-xs" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    </div>
  )
}
