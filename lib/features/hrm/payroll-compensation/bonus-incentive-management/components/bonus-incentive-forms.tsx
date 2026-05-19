import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Field, FieldGroup, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { NativeSelect, NativeSelectOption } from "#components2/ui/native-select"
import { Textarea } from "#components2/ui/textarea"

import {
  submitAdjustBonusPayout,
  submitApproveBonusPayoutApproval,
  submitAssignBonusEmployee,
  submitCalculateBonusCycle,
  submitCreateBonusCycle,
  submitCreateBonusPlan,
  submitExportBonusPayoutToPayroll,
  submitLockBonusPayout,
  submitRecordBonusClawback,
  submitRejectBonusPayoutApproval,
  submitRequestBonusPayoutApproval,
  submitReturnBonusPayout,
  submitUpsertBonusTarget,
} from "../actions/bonus-incentive.actions"
import {
  BONUS_FORMULA_TYPES,
  BONUS_PLAN_TYPES,
} from "../schemas/bonus-incentive.schema"
import type {
  BonusCycleRow,
  BonusEmployeeChoice,
  BonusPayrollPeriodChoice,
  BonusPayoutRow,
  BonusPlanRow,
} from "../data/bonus-incentive.queries.server"

type AdminProps = {
  readonly isAdmin: boolean
}

export function BonusPlanCreateForm({ isAdmin }: AdminProps) {
  if (!isAdmin) return null
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Create plan</CardTitle>
        <CardDescription>
          Define eligibility, payout formula, payroll code, and accounting
          defaults.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submitCreateBonusPlan}>
          <FieldGroup className="grid gap-4 @md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="bonus-plan-code">Code</FieldLabel>
              <Input
                id="bonus-plan-code"
                name="code"
                placeholder="ANNUAL_2026"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-plan-name">Name</FieldLabel>
              <Input
                id="bonus-plan-name"
                name="name"
                placeholder="Annual bonus 2026"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-plan-type">Plan type</FieldLabel>
              <NativeSelect id="bonus-plan-type" name="planType">
                {BONUS_PLAN_TYPES.map((type) => (
                  <NativeSelectOption key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-formula-type">Formula</FieldLabel>
              <NativeSelect id="bonus-formula-type" name="payoutFormulaType">
                {BONUS_FORMULA_TYPES.map((type) => (
                  <NativeSelectOption key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-fixed-amount">Fixed amount</FieldLabel>
              <Input
                id="bonus-fixed-amount"
                name="fixedAmount"
                inputMode="decimal"
                placeholder="1000.00"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-salary-percent">
                Salary percent
              </FieldLabel>
              <Input
                id="bonus-salary-percent"
                name="salaryPercent"
                inputMode="decimal"
                placeholder="10"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-currency">Currency</FieldLabel>
              <Input
                id="bonus-currency"
                name="defaultCurrency"
                defaultValue="MYR"
                maxLength={3}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-line-code">
                Payroll line code
              </FieldLabel>
              <Input
                id="bonus-line-code"
                name="defaultPayrollLineCode"
                defaultValue="BONUS_INCENTIVE"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-cap">Cap amount</FieldLabel>
              <Input id="bonus-cap" name="capAmount" inputMode="decimal" />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-floor">Floor amount</FieldLabel>
              <Input id="bonus-floor" name="floorAmount" inputMode="decimal" />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-tenure">
                Minimum tenure months
              </FieldLabel>
              <Input
                id="bonus-tenure"
                name="minTenureMonths"
                inputMode="numeric"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-statuses">
                Eligible statuses
              </FieldLabel>
              <Input
                id="bonus-statuses"
                name="employeeStatuses"
                placeholder="active,probation"
              />
            </Field>
            <Field className="@md:col-span-2">
              <FieldLabel htmlFor="bonus-description">Description</FieldLabel>
              <Textarea id="bonus-description" name="description" />
            </Field>
            <div className="flex justify-end @md:col-span-2">
              <Button type="submit">Create plan</Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

export function BonusCycleCreateForm({
  isAdmin,
  plans,
  payrollPeriods,
}: AdminProps & {
  readonly plans: readonly BonusPlanRow[]
  readonly payrollPeriods: readonly BonusPayrollPeriodChoice[]
}) {
  if (!isAdmin || plans.length === 0) return null
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Create cycle</CardTitle>
        <CardDescription>
          Bind a plan to an earning period, payout date, and optional payroll
          period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submitCreateBonusCycle}>
          <FieldGroup className="grid gap-4 @md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="bonus-cycle-plan">Plan</FieldLabel>
              <NativeSelect id="bonus-cycle-plan" name="planId">
                {plans.map((plan) => (
                  <NativeSelectOption key={plan.id} value={plan.id}>
                    {plan.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-cycle-code">Code</FieldLabel>
              <Input
                id="bonus-cycle-code"
                name="code"
                placeholder="BON2026Q1"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-cycle-name">Name</FieldLabel>
              <Input id="bonus-cycle-name" name="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-cycle-payroll">
                Payroll period
              </FieldLabel>
              <NativeSelect id="bonus-cycle-payroll" name="payrollPeriodId">
                <NativeSelectOption value="">Unassigned</NativeSelectOption>
                {payrollPeriods.map((period) => (
                  <NativeSelectOption key={period.id} value={period.id}>
                    {period.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-period-start">Period start</FieldLabel>
              <Input
                id="bonus-period-start"
                name="periodStart"
                type="date"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-period-end">Period end</FieldLabel>
              <Input
                id="bonus-period-end"
                name="periodEnd"
                type="date"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-cutoff-date">Cutoff date</FieldLabel>
              <Input id="bonus-cutoff-date" name="cutoffDate" type="date" />
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-payout-date">Payout date</FieldLabel>
              <Input
                id="bonus-payout-date"
                name="payoutDate"
                type="date"
                required
              />
            </Field>
            <div className="flex justify-end @md:col-span-2">
              <Button type="submit">Create cycle</Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

export function BonusCycleActionPanel({
  cycle,
  employees,
}: {
  readonly cycle: BonusCycleRow
  readonly employees: readonly BonusEmployeeChoice[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <form
        action={submitAssignBonusEmployee}
        className="flex flex-wrap justify-end gap-2"
      >
        <input type="hidden" name="planId" value={cycle.planId} />
        <input type="hidden" name="cycleId" value={cycle.id} />
        <NativeSelect name="employeeId" size="sm">
          {employees.map((employee) => (
            <NativeSelectOption key={employee.id} value={employee.id}>
              {employee.legalName}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" size="sm" variant="outline">
          Assign
        </Button>
      </form>
      <form
        action={submitUpsertBonusTarget}
        className="flex flex-wrap justify-end gap-2"
      >
        <input type="hidden" name="cycleId" value={cycle.id} />
        <Input name="targetScope" placeholder="individual" className="w-32" />
        <Input name="targetMetric" placeholder="sales" className="w-32" />
        <Input name="targetValue" placeholder="10000.00" className="w-32" />
        <Input name="actualValue" placeholder="12000.00" className="w-32" />
        <Button type="submit" size="sm" variant="outline">
          Add target
        </Button>
      </form>
      <form action={submitCalculateBonusCycle} className="flex justify-end">
        <input type="hidden" name="cycleId" value={cycle.id} />
        <Button type="submit" size="sm">
          Calculate
        </Button>
      </form>
    </div>
  )
}

export function BonusPayoutActionPanel({
  payout,
  payrollPeriods,
}: {
  readonly payout: BonusPayoutRow
  readonly payrollPeriods: readonly BonusPayrollPeriodChoice[]
}) {
  return (
    <div className="flex flex-col gap-2">
      {payout.state === "calculated" || payout.state === "returned" ? (
        <form
          action={submitRequestBonusPayoutApproval}
          className="flex justify-end"
        >
          <input type="hidden" name="payoutId" value={payout.id} />
          <Button type="submit" size="sm" variant="outline">
            Request approval
          </Button>
        </form>
      ) : null}
      {payout.currentApprovalId && payout.state === "pending_approval" ? (
        <div className="flex flex-wrap justify-end gap-2">
          <form action={submitApproveBonusPayoutApproval}>
            <input
              type="hidden"
              name="approvalId"
              value={payout.currentApprovalId}
            />
            <Button type="submit" size="sm">
              Approve
            </Button>
          </form>
          <form action={submitRejectBonusPayoutApproval} className="flex gap-2">
            <input
              type="hidden"
              name="approvalId"
              value={payout.currentApprovalId}
            />
            <Input name="reason" placeholder="Reason" className="w-36" />
            <Button type="submit" size="sm" variant="outline">
              Reject
            </Button>
          </form>
          <form action={submitReturnBonusPayout} className="flex gap-2">
            <input
              type="hidden"
              name="approvalId"
              value={payout.currentApprovalId}
            />
            <Input name="reason" placeholder="Return note" className="w-36" />
            <Button type="submit" size="sm" variant="outline">
              Return
            </Button>
          </form>
        </div>
      ) : null}
      {payout.state === "approved" ? (
        <form action={submitLockBonusPayout} className="flex justify-end">
          <input type="hidden" name="payoutId" value={payout.id} />
          <Button type="submit" size="sm" variant="outline">
            Lock
          </Button>
        </form>
      ) : null}
      {payout.state === "locked" ? (
        <form
          action={submitExportBonusPayoutToPayroll}
          className="flex flex-wrap justify-end gap-2"
        >
          <input type="hidden" name="payoutId" value={payout.id} />
          <NativeSelect name="payrollPeriodId" size="sm">
            {payrollPeriods.map((period) => (
              <NativeSelectOption key={period.id} value={period.id}>
                {period.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button type="submit" size="sm">
            Send to payroll
          </Button>
        </form>
      ) : null}
      <form
        action={submitAdjustBonusPayout}
        className="flex flex-wrap justify-end gap-2"
      >
        <input type="hidden" name="payoutId" value={payout.id} />
        <Input
          name="adjustmentType"
          placeholder="management"
          className="w-32"
        />
        <Input name="amount" placeholder="1000.00" className="w-28" />
        <Input name="reason" placeholder="Justification" className="w-36" />
        <Button type="submit" size="sm" variant="outline">
          Adjust
        </Button>
      </form>
      <form
        action={submitRecordBonusClawback}
        className="flex flex-wrap justify-end gap-2"
      >
        <input type="hidden" name="payoutId" value={payout.id} />
        <Input name="clawbackType" placeholder="overpayment" className="w-32" />
        <Input name="amount" placeholder="100.00" className="w-28" />
        <Input name="reason" placeholder="Recovery reason" className="w-36" />
        <Button type="submit" size="sm" variant="outline">
          Clawback
        </Button>
      </form>
    </div>
  )
}
