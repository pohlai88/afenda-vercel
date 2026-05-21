"use client"

import { useSearchParams } from "next/navigation"

import { Label } from "#components2/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components2/ui/select"
import { usePathname, useRouter } from "#i18n/navigation"

type PickerOption = { id: string; label: string }

export function CareerPathingFrameworkPicker({
  frameworks,
  selectedFrameworkId,
  label,
}: {
  frameworks: readonly PickerOption[]
  selectedFrameworkId: string | undefined
  label: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (frameworks.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Select
        value={selectedFrameworkId ?? frameworks[0]?.id}
        onValueChange={(frameworkId) => {
          const params = new URLSearchParams(searchParams.toString())
          params.set("frameworkId", frameworkId)
          const query = params.toString()
          router.push(query ? `${pathname}?${query}` : pathname)
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {frameworks.map((framework) => (
            <SelectItem key={framework.id} value={framework.id}>
              {framework.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function CareerPathingEmployeeGapPicker({
  employees,
  selectedEmployeeId,
  label,
}: {
  employees: readonly PickerOption[]
  selectedEmployeeId: string | undefined
  label: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (employees.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Select
        value={selectedEmployeeId ?? employees[0]?.id}
        onValueChange={(employeeId) => {
          const params = new URLSearchParams(searchParams.toString())
          params.set("employeeId", employeeId)
          const query = params.toString()
          router.push(query ? `${pathname}?${query}` : pathname)
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function CareerPathingPlanPicker({
  plans,
  selectedPlanId,
  label,
}: {
  plans: readonly PickerOption[]
  selectedPlanId: string | undefined
  label: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (plans.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Select
        value={selectedPlanId ?? plans[0]?.id}
        onValueChange={(planId) => {
          const params = new URLSearchParams(searchParams.toString())
          params.set("planId", planId)
          const query = params.toString()
          router.push(query ? `${pathname}?${query}` : pathname)
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {plans.map((plan) => (
            <SelectItem key={plan.id} value={plan.id}>
              {plan.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
