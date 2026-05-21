export type CareerPathingSectionProps = {
  organizationId: string
  orgSlug: string
  isHrmAdmin: boolean
  selectedPlanId?: string
  selectedFrameworkId?: string
  selectedEmployeeId?: string
}

export type CareerPathingEmployeeChoice = {
  id: string
  label: string
}
