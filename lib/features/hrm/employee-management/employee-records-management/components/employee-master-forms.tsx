"use client"

import { useActionState, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Field, FieldError, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"
import {
  updateEmployeeContactAction,
  updateEmployeeEmploymentAction,
  updateEmployeeIdentityAction,
  updateEmployeeStatutoryProfileAction,
  upsertEmployeeIdentityDocumentAction,
  upsertEmployeeWorkAuthorizationAction,
} from "#features/hrm/client"

import type {
  EmployeeMasterMutationFormState,
  EmployeeMasterSnapshot,
} from "../../../types"

type EmployeeMasterFormsProps = {
  orgSlug: string
  snapshot: EmployeeMasterSnapshot
}

type EmployeeMasterFormTranslations = (
  key: string,
  values?: Record<string, string | number | boolean | null | undefined>
) => string

export function EmployeeMasterForms({
  orgSlug,
  snapshot,
}: EmployeeMasterFormsProps) {
  const t = useEmployeeMasterFormTranslations()
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <IdentityForm orgSlug={orgSlug} snapshot={snapshot} t={t} />
      <ContactForm orgSlug={orgSlug} snapshot={snapshot} t={t} />
      <EmploymentForm orgSlug={orgSlug} snapshot={snapshot} t={t} />
      <StatutoryForm orgSlug={orgSlug} snapshot={snapshot} t={t} />
      <IdentityDocumentForm orgSlug={orgSlug} snapshot={snapshot} t={t} />
      <WorkAuthorizationForm orgSlug={orgSlug} snapshot={snapshot} t={t} />
    </div>
  )
}

function IdentityForm({
  orgSlug,
  snapshot,
  t,
}: EmployeeMasterFormsProps & { t: EmployeeMasterFormTranslations }) {
  const [state, action, pending] = useActionState(
    updateEmployeeIdentityAction,
    undefined
  )
  const employee = snapshot.employee
  const profile = snapshot.personalProfile
  return (
    <section className="rounded-md border border-border p-4">
      <SectionTitle
        title={t("identity.title")}
        description={t("identity.description")}
      />
      <FormAlert state={state} title={t("common.alertTitle")} />
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Hidden orgSlug={orgSlug} employeeId={employee.id} />
        <FieldErrorInput
          id="identity-number"
          name="employeeNumber"
          label={t("identity.fields.employeeNumber")}
          required
          defaultValue={employee.employeeNumber}
          error={state && !state.ok ? state.errors.employeeNumber : undefined}
        />
        <FieldErrorInput
          id="identity-legal"
          name="legalName"
          label={t("identity.fields.legalName")}
          required
          defaultValue={employee.legalName}
          error={state && !state.ok ? state.errors.legalName : undefined}
        />
        <TextField
          id="identity-preferred"
          name="preferredName"
          label={t("identity.fields.preferredName")}
          defaultValue={employee.preferredName ?? ""}
        />
        <TextField
          id="identity-dob"
          name="dateOfBirth"
          label={t("identity.fields.dateOfBirth")}
          type="date"
          defaultValue={inputDate(profile?.dateOfBirth ?? employee.dateOfBirth)}
        />
        <SelectField
          id="identity-gender"
          name="gender"
          label={t("identity.fields.gender")}
          defaultValue={profile?.gender ?? employee.gender ?? ""}
          options={[
            ["", t("identity.options.gender.notRecorded")],
            ["female", t("identity.options.gender.female")],
            ["male", t("identity.options.gender.male")],
            ["non_binary", t("identity.options.gender.nonBinary")],
            ["undisclosed", t("identity.options.gender.undisclosed")],
          ]}
        />
        <TextField
          id="identity-nationality"
          name="nationality"
          label={t("identity.fields.nationality")}
          maxLength={16}
          defaultValue={profile?.nationality ?? employee.nationality ?? ""}
        />
        <TextField
          id="identity-marital"
          name="maritalStatus"
          label={t("identity.fields.maritalStatus")}
          defaultValue={profile?.maritalStatus ?? ""}
        />
        <SubmitButton pending={pending} label={t("identity.submit")} />
      </form>
    </section>
  )
}

function ContactForm({
  orgSlug,
  snapshot,
  t,
}: EmployeeMasterFormsProps & { t: EmployeeMasterFormTranslations }) {
  const [state, action, pending] = useActionState(
    updateEmployeeContactAction,
    undefined
  )
  const employee = snapshot.employee
  const profile = snapshot.contactProfile
  const address = addressRecord(profile?.address)
  return (
    <section className="rounded-md border border-border p-4">
      <SectionTitle
        title={t("contact.title")}
        description={t("contact.description")}
      />
      <FormAlert state={state} title={t("common.alertTitle")} />
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Hidden orgSlug={orgSlug} employeeId={employee.id} />
        <FieldErrorInput
          id="contact-work-email"
          name="workEmail"
          label={t("contact.fields.workEmail")}
          type="email"
          defaultValue={profile?.workEmail ?? employee.email ?? ""}
          error={state && !state.ok ? state.errors.workEmail : undefined}
        />
        <TextField
          id="contact-work-phone"
          name="workPhone"
          label={t("contact.fields.workPhone")}
          defaultValue={profile?.workPhone ?? employee.phone ?? ""}
        />
        <FieldErrorInput
          id="contact-personal-email"
          name="personalEmail"
          label={t("contact.fields.personalEmail")}
          type="email"
          defaultValue={profile?.personalEmail ?? ""}
          error={state && !state.ok ? state.errors.personalEmail : undefined}
        />
        <TextField
          id="contact-personal-phone"
          name="personalPhone"
          label={t("contact.fields.personalPhone")}
          defaultValue={profile?.personalPhone ?? ""}
        />
        <TextField
          id="contact-line-1"
          name="addressLine1"
          label={t("contact.fields.addressLine1")}
          defaultValue={address.line1}
        />
        <TextField
          id="contact-line-2"
          name="addressLine2"
          label={t("contact.fields.addressLine2")}
          defaultValue={address.line2}
        />
        <TextField
          id="contact-city"
          name="city"
          label={t("contact.fields.city")}
          defaultValue={address.city}
        />
        <TextField
          id="contact-region"
          name="region"
          label={t("contact.fields.region")}
          defaultValue={address.region}
        />
        <TextField
          id="contact-postal"
          name="postalCode"
          label={t("contact.fields.postalCode")}
          defaultValue={address.postalCode}
        />
        <TextField
          id="contact-country"
          name="countryCode"
          label={t("contact.fields.country")}
          maxLength={16}
          defaultValue={address.countryCode ?? employee.countryCode ?? ""}
        />
        <SubmitButton pending={pending} label={t("contact.submit")} />
      </form>
    </section>
  )
}

function EmploymentForm({
  orgSlug,
  snapshot,
  t,
}: EmployeeMasterFormsProps & { t: EmployeeMasterFormTranslations }) {
  const [state, action, pending] = useActionState(
    updateEmployeeEmploymentAction,
    undefined
  )
  const employee = snapshot.employee
  const options = snapshot.placementOptions
  return (
    <section className="rounded-md border border-border p-4">
      <SectionTitle
        title={t("employment.title")}
        description={t("employment.description")}
      />
      <FormAlert state={state} title={t("common.alertTitle")} />
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Hidden orgSlug={orgSlug} employeeId={employee.id} />
        <SelectField
          id="employment-status"
          name="employmentStatus"
          label={t("employment.fields.status")}
          defaultValue={employee.employmentStatus}
          options={[
            ["active", t("employment.options.status.active")],
            ["probation", t("employment.options.status.probation")],
            ["confirmed", t("employment.options.status.confirmed")],
            ["suspended", t("employment.options.status.suspended")],
            ["terminated", t("employment.options.status.terminated")],
          ]}
        />
        <TextField
          id="employment-start"
          name="employmentStartDate"
          label={t("employment.fields.startDate")}
          type="date"
          defaultValue={inputDate(employee.employmentStartDate)}
        />
        <TextField
          id="employment-probation"
          name="probationEndDate"
          label={t("employment.fields.probationEndDate")}
          type="date"
          defaultValue={inputDate(employee.probationEndDate)}
        />
        <TextField
          id="employment-confirmed"
          name="confirmationDate"
          label={t("employment.fields.confirmationDate")}
          type="date"
          defaultValue={inputDate(employee.confirmationDate)}
        />
        <OptionSelect
          id="employment-dept"
          name="currentDepartmentId"
          label={t("employment.fields.department")}
          value={employee.currentDepartmentId}
          options={options.departments}
          emptyLabel={t("common.notAssigned")}
        />
        <OptionSelect
          id="employment-position"
          name="currentPositionId"
          label={t("employment.fields.position")}
          value={employee.currentPositionId}
          options={options.positions}
          emptyLabel={t("common.notAssigned")}
        />
        <OptionSelect
          id="employment-grade"
          name="currentJobGradeId"
          label={t("employment.fields.jobGrade")}
          value={employee.currentJobGradeId}
          options={options.jobGrades}
          emptyLabel={t("common.notAssigned")}
        />
        <OptionSelect
          id="employment-manager"
          name="managerEmployeeId"
          label={t("employment.fields.manager")}
          value={employee.managerEmployeeId}
          options={options.managers.filter((m) => m.id !== employee.id)}
          emptyLabel={t("common.notAssigned")}
        />
        <OptionSelect
          id="employment-linked-user"
          name="linkedUserId"
          label={t("employment.fields.linkedUser")}
          value={employee.linkedUserId}
          options={options.linkedUsers}
          emptyLabel={t("common.notAssigned")}
        />
        <TextField
          id="employment-country"
          name="countryCode"
          label={t("employment.fields.workCountry")}
          maxLength={16}
          defaultValue={employee.countryCode ?? ""}
        />
        <TextField
          id="employment-state"
          name="workStateCode"
          label={t("employment.fields.workState")}
          defaultValue={employee.workStateCode ?? ""}
        />
        <SubmitButton pending={pending} label={t("employment.submit")} />
      </form>
    </section>
  )
}

function StatutoryForm({
  orgSlug,
  snapshot,
  t,
}: EmployeeMasterFormsProps & { t: EmployeeMasterFormTranslations }) {
  const payroll = snapshot.payrollProfile
  const extras = recordValue(payroll?.statutoryProfileExtras)
  const initialCountry = payroll?.countryCode === "VN" ? "VN" : "MY"
  const [country, setCountry] = useState<"MY" | "VN">(initialCountry)
  const [state, action, pending] = useActionState(
    updateEmployeeStatutoryProfileAction,
    undefined
  )

  return (
    <section id="statutory" className="rounded-md border border-border p-4">
      <SectionTitle
        title={t("statutory.title")}
        description={t("statutory.description")}
      />
      <FormAlert state={state} title={t("common.alertTitle")} />
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Hidden orgSlug={orgSlug} employeeId={snapshot.employee.id} />
        <SelectField
          id="stat-country"
          name="countryCode"
          label={t("statutory.fields.countryProfile")}
          defaultValue={country}
          onChange={(value) => setCountry(value === "VN" ? "VN" : "MY")}
          options={[
            ["MY", t("statutory.options.countryProfile.malaysia")],
            ["VN", t("statutory.options.countryProfile.vietnam")],
          ]}
        />
        <TextField
          id="stat-effective"
          name="effectiveFrom"
          label={t("statutory.fields.effectiveFrom")}
          type="date"
          required
          defaultValue={inputDate(payroll?.effectiveFrom) || todayDate()}
        />
        {country === "MY" ? (
          <>
            <input type="hidden" name="taxResidencyCountry" value="MY" />
            <input
              type="hidden"
              name="taxIdentifierType"
              value="my_income_tax"
            />
            <TextField
              id="stat-my-tax"
              name="taxIdentifierNumber"
              label={t("statutory.fields.my.incomeTaxNumber")}
              defaultValue={payroll?.taxIdentifierNumber ?? ""}
            />
            <TextField
              id="stat-my-epf"
              name="epfNumber"
              label={t("statutory.fields.my.epfNumber")}
              defaultValue={payroll?.epfNumber ?? ""}
            />
            <TextField
              id="stat-my-socso"
              name="socsoNumber"
              label={t("statutory.fields.my.socsoNumber")}
              defaultValue={payroll?.socsoNumber ?? ""}
            />
            <TextField
              id="stat-my-pcb"
              name="pcbCategory"
              label={t("statutory.fields.my.pcbCategory")}
              defaultValue={payroll?.pcbCategory ?? ""}
            />
            <TextField
              id="stat-my-state"
              name="workStateCode"
              label={t("statutory.fields.my.workState")}
              defaultValue={stringValue(extras.workStateCode)}
            />
            <TextField
              id="stat-my-tp1"
              name="pcbTp1AdditionalReliefMonthlyMyr"
              label={t("statutory.fields.my.tp1Relief")}
              defaultValue={stringValue(
                extras.pcbTp1AdditionalReliefMonthlyMyr
              )}
            />
            <TextField
              id="stat-my-tp3"
              name="pcbTp3AdditionalDeductionMonthlyMyr"
              label={t("statutory.fields.my.tp3Deduction")}
              defaultValue={stringValue(
                extras.pcbTp3AdditionalDeductionMonthlyMyr
              )}
            />
            <CheckboxField
              id="stat-my-eis"
              name="eisEligible"
              label={t("statutory.fields.my.eisEligible")}
              defaultChecked={payroll?.eisEligible ?? true}
            />
            <CheckboxField
              id="stat-my-hrdf"
              name="hrdfApplicable"
              label={t("statutory.fields.my.hrdfApplicable")}
              defaultChecked={payroll?.hrdfApplicable ?? false}
            />
          </>
        ) : (
          <>
            <input type="hidden" name="taxResidencyCountry" value="VN" />
            <input type="hidden" name="taxIdentifierType" value="vn_pit" />
            <TextField
              id="stat-vn-tax"
              name="taxIdentifierNumber"
              label={t("statutory.fields.vn.pitTaxCode")}
              defaultValue={payroll?.taxIdentifierNumber ?? ""}
            />
            <TextField
              id="stat-vn-si"
              name="socialInsuranceNumber"
              label={t("statutory.fields.vn.socialInsurance")}
              defaultValue={stringValue(extras.socialInsuranceNumber)}
            />
            <TextField
              id="stat-vn-hi"
              name="healthInsuranceNumber"
              label={t("statutory.fields.vn.healthInsurance")}
              defaultValue={stringValue(extras.healthInsuranceNumber)}
            />
            <TextField
              id="stat-vn-ui"
              name="unemploymentInsuranceNumber"
              label={t("statutory.fields.vn.unemploymentInsurance")}
              defaultValue={stringValue(extras.unemploymentInsuranceNumber)}
            />
            <TextField
              id="stat-vn-province"
              name="workProvinceCode"
              label={t("statutory.fields.vn.workProvince")}
              defaultValue={stringValue(extras.workProvinceCode)}
            />
            <TextField
              id="stat-vn-region"
              name="workRegionCode"
              label={t("statutory.fields.vn.workRegion")}
              defaultValue={stringValue(extras.workRegionCode)}
            />
            <CheckboxField
              id="stat-vn-union"
              name="unionEligible"
              label={t("statutory.fields.vn.unionEligible")}
              defaultChecked={Boolean(extras.unionEligible)}
            />
          </>
        )}
        <SubmitButton pending={pending} label={t("statutory.submit")} />
      </form>
    </section>
  )
}

function IdentityDocumentForm({
  orgSlug,
  snapshot,
  t,
}: EmployeeMasterFormsProps & { t: EmployeeMasterFormTranslations }) {
  const [state, action, pending] = useActionState(
    upsertEmployeeIdentityDocumentAction,
    undefined
  )
  return (
    <section className="rounded-md border border-border p-4">
      <SectionTitle
        title={t("identityDocument.title")}
        description={t("identityDocument.description")}
      />
      <FormAlert state={state} title={t("common.alertTitle")} />
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Hidden orgSlug={orgSlug} employeeId={snapshot.employee.id} />
        <TextField
          id="doc-type"
          name="documentType"
          label={t("identityDocument.fields.documentType")}
          required
        />
        <FieldErrorInput
          id="doc-number"
          name="documentNumber"
          label={t("identityDocument.fields.documentNumber")}
          required
          error={state && !state.ok ? state.errors.documentNumber : undefined}
        />
        <TextField
          id="doc-country"
          name="issuingCountry"
          label={t("identityDocument.fields.issuingCountry")}
          required
          maxLength={16}
          defaultValue={snapshot.employee.countryCode ?? ""}
        />
        <TextField
          id="doc-issued"
          name="issuedAt"
          label={t("identityDocument.fields.issuedAt")}
          type="date"
        />
        <TextField
          id="doc-expiry"
          name="expiresAt"
          label={t("identityDocument.fields.expiresAt")}
          type="date"
        />
        <SelectField
          id="doc-status"
          name="verificationStatus"
          label={t("identityDocument.fields.verification")}
          defaultValue="unverified"
          options={[
            [
              "unverified",
              t("identityDocument.options.verification.unverified"),
            ],
            ["verified", t("identityDocument.options.verification.verified")],
            ["rejected", t("identityDocument.options.verification.rejected")],
            ["expired", t("identityDocument.options.verification.expired")],
          ]}
        />
        <CheckboxField
          id="doc-primary"
          name="isPrimary"
          label={t("identityDocument.fields.primaryDocument")}
        />
        <SubmitButton pending={pending} label={t("identityDocument.submit")} />
      </form>
    </section>
  )
}

function WorkAuthorizationForm({
  orgSlug,
  snapshot,
  t,
}: EmployeeMasterFormsProps & { t: EmployeeMasterFormTranslations }) {
  const [state, action, pending] = useActionState(
    upsertEmployeeWorkAuthorizationAction,
    undefined
  )
  return (
    <section className="rounded-md border border-border p-4">
      <SectionTitle
        title={t("workAuthorization.title")}
        description={t("workAuthorization.description")}
      />
      <FormAlert state={state} title={t("common.alertTitle")} />
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Hidden orgSlug={orgSlug} employeeId={snapshot.employee.id} />
        <FieldErrorInput
          id="auth-country"
          name="countryCode"
          label={t("workAuthorization.fields.country")}
          required
          maxLength={16}
          defaultValue={snapshot.employee.countryCode ?? ""}
          error={state && !state.ok ? state.errors.countryCode : undefined}
        />
        <FieldErrorInput
          id="auth-type"
          name="authorizationType"
          label={t("workAuthorization.fields.authorizationType")}
          required
          error={
            state && !state.ok ? state.errors.authorizationType : undefined
          }
        />
        <TextField
          id="auth-doc"
          name="documentNumber"
          label={t("workAuthorization.fields.documentNumber")}
        />
        <TextField
          id="auth-issued"
          name="issuedAt"
          label={t("workAuthorization.fields.issuedAt")}
          type="date"
        />
        <TextField
          id="auth-expiry"
          name="expiresAt"
          label={t("workAuthorization.fields.expiresAt")}
          type="date"
        />
        <SelectField
          id="auth-status"
          name="status"
          label={t("workAuthorization.fields.status")}
          defaultValue="active"
          options={[
            ["active", t("workAuthorization.options.status.active")],
            ["pending", t("workAuthorization.options.status.pending")],
            ["expired", t("workAuthorization.options.status.expired")],
            ["revoked", t("workAuthorization.options.status.revoked")],
          ]}
        />
        <TextField
          id="auth-notes"
          name="notes"
          label={t("workAuthorization.fields.notes")}
        />
        <SubmitButton pending={pending} label={t("workAuthorization.submit")} />
      </form>
    </section>
  )
}

function useEmployeeMasterFormTranslations(): EmployeeMasterFormTranslations {
  return useTranslations(
    "Dashboard.Hrm.workforce.masterForms" as never
  ) as unknown as EmployeeMasterFormTranslations
}

function Hidden({
  orgSlug,
  employeeId,
}: {
  orgSlug: string
  employeeId: string
}) {
  return (
    <>
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="employeeId" value={employeeId} />
    </>
  )
}

function SectionTitle({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function FormAlert({
  state,
  title,
}: {
  state: EmployeeMasterMutationFormState | undefined
  title: string
}) {
  if (!state || state.ok || !state.errors.form) return null
  return (
    <Alert variant="destructive" className="mt-3">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{state.errors.form}</AlertDescription>
    </Alert>
  )
}

function FieldErrorInput({
  id,
  name,
  label,
  error,
  type = "text",
  required,
  maxLength,
  defaultValue = "",
}: {
  id: string
  name: string
  label: string
  error?: string
  type?: string
  required?: boolean
  maxLength?: number
  defaultValue?: string
}) {
  const invalid = Boolean(error)
  return (
    <Field data-invalid={invalid ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={invalid}
      />
      {invalid ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}

function TextField({
  id,
  name,
  label,
  type = "text",
  required,
  maxLength,
  defaultValue = "",
}: {
  id: string
  name: string
  label: string
  type?: string
  required?: boolean
  maxLength?: number
  defaultValue?: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue}
      />
    </Field>
  )
}

function SelectField({
  id,
  name,
  label,
  defaultValue,
  options,
  onChange,
}: {
  id: string
  name: string
  label: string
  defaultValue: string
  options: [string, string][]
  onChange?: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.currentTarget.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  )
}

function OptionSelect({
  id,
  name,
  label,
  value,
  options,
  emptyLabel,
}: {
  id: string
  name: string
  label: string
  value: string | null
  options: EmployeeMasterSnapshot["placementOptions"]["departments"]
  emptyLabel: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        name={name}
        defaultValue={value ?? ""}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.code} · {option.label}
            {option.secondaryLabel ? ` (${option.secondaryLabel})` : ""}
          </option>
        ))}
      </select>
    </Field>
  )
}

function CheckboxField({
  id,
  name,
  label,
  defaultChecked = false,
}: {
  id: string
  name: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-center gap-2 self-end py-2">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="size-4 rounded border border-input"
      />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  )
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <div className="flex items-end">
      <Button type="submit" disabled={pending} size="sm">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            Saving
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  )
}

function inputDate(value: Date | string | null | undefined): string {
  if (!value) return ""
  if (typeof value === "string") return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function addressRecord(value: unknown): Record<string, string> {
  const record = recordValue(value)
  return {
    line1: stringValue(record.line1),
    line2: stringValue(record.line2),
    city: stringValue(record.city),
    region: stringValue(record.region),
    postalCode: stringValue(record.postalCode),
    countryCode: stringValue(record.countryCode),
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}
