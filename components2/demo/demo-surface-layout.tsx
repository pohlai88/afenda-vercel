import type { ReactNode } from "react"

export type DemoSurfaceLayoutProps = {
  main: ReactNode
  aside: ReactNode
}

export function DemoSurfaceLayout({ main, aside }: DemoSurfaceLayoutProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">{main}</div>
      <aside className="min-w-0">{aside}</aside>
    </div>
  )
}
