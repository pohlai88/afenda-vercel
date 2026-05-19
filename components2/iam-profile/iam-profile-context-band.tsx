import type { ReactNode } from "react"

/** Labeled section band for profile overview content. */
export function IamProfileContextBand({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <section className="pt-7 pb-10 first:pt-0 last:pb-0">
      <div className="space-y-3.5">
        <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-muted-foreground/80 uppercase">
          {label}
        </p>
        {children}
      </div>
    </section>
  )
}
