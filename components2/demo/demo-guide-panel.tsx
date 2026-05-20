import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import type { DemoGuideContent } from "#features/demo"

export type DemoGuidePanelProps = DemoGuideContent

export function DemoGuidePanel({
  title,
  purpose,
  steps,
  productionActions,
  demoLimitations,
}: DemoGuidePanelProps) {
  return (
    <Card size="sm" className="sticky top-24">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{purpose}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 text-sm">
        <section>
          <h3 className="mb-2 font-medium text-foreground">
            How to read this page
          </h3>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            {steps.map((step) => (
              <li key={step.title}>
                <span className="font-medium text-foreground">
                  {step.title}
                </span>
                {" — "}
                {step.description}
              </li>
            ))}
          </ol>
        </section>

        {productionActions && productionActions.length > 0 ? (
          <section>
            <h3 className="mb-2 font-medium text-foreground">
              What you can do in production
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {productionActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {demoLimitations && demoLimitations.length > 0 ? (
          <section>
            <h3 className="mb-2 font-medium text-foreground">
              Demo limitation
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {demoLimitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
