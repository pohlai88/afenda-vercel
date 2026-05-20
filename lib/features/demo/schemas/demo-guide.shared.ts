export type DemoGuideStep = {
  title: string
  description: string
}

export type DemoGuideContent = {
  title: string
  purpose: string
  steps: readonly DemoGuideStep[]
  productionActions?: readonly string[]
  demoLimitations?: readonly string[]
}
