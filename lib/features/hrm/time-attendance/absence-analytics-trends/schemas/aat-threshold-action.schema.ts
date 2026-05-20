import {
  aatThresholdConfigSchema,
  type AatThresholdConfig,
} from "./aat-threshold.schema"

export const updateAatThresholdFormSchema = aatThresholdConfigSchema

export type UpdateAatThresholdFormInput = AatThresholdConfig

export type UpdateAatThresholdFormState =
  | { ok: true }
  | {
      ok: false
      errors: Partial<Record<keyof UpdateAatThresholdFormInput, string>>
    }

function parseRateField(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || !raw.trim()) return undefined
  const percent = Number.parseFloat(raw)
  if (!Number.isFinite(percent)) return undefined
  return percent / 100
}

function parseIntField(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || !raw.trim()) return undefined
  return Number.parseInt(raw, 10)
}

export function parseUpdateAatThresholdFormData(formData: FormData) {
  return updateAatThresholdFormSchema.safeParse({
    watchAbsenceRate: parseRateField(formData.get("watchAbsenceRate")),
    atRiskAbsenceRate: parseRateField(formData.get("atRiskAbsenceRate")),
    highRiskAbsenceRate: parseRateField(formData.get("highRiskAbsenceRate")),
    criticalAbsenceRate: parseRateField(formData.get("criticalAbsenceRate")),
    watchFrequency: parseIntField(formData.get("watchFrequency")),
    atRiskFrequency: parseIntField(formData.get("atRiskFrequency")),
    highRiskFrequency: parseIntField(formData.get("highRiskFrequency")),
  })
}
