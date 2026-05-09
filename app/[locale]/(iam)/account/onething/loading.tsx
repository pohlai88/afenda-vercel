import { Spinner } from "#components/ui/spinner"

export default function AccountOneThingLoading() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  )
}
