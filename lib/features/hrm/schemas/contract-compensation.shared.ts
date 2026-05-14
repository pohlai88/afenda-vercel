import { z } from "zod"

/** Viet-ERP–aligned default codes (org catalog seeds). */
export const HRM_COMPENSATION_COMPONENT_CODES = [
  "MEAL_ALLOWANCE",
  "PHONE_ALLOWANCE",
  "FUEL_ALLOWANCE",
  "PERF_ALLOWANCE",
  "KPI_AMOUNT",
] as const

export type HrmCompensationComponentCode =
  (typeof HRM_COMPENSATION_COMPONENT_CODES)[number]

export const hrmCompensationSnapshotEntrySchema = z.object({
  componentCode: z.string().min(1).max(64),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().min(3).max(3),
  taxTreatment: z.string().min(1).max(32),
  statutoryBaseTreatment: z.string().min(1).max(32),
})

export type HrmCompensationSnapshotEntry = z.infer<
  typeof hrmCompensationSnapshotEntrySchema
>

export const hrmCompensationSnapshotSchema = z.array(
  hrmCompensationSnapshotEntrySchema
)

const annexSlotSchema = z.object({
  annexNo: z.string().min(1).max(128),
  annexDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const hrmContractAnnexSlotsSchema = z.array(annexSlotSchema).max(3)

export type HrmContractAnnexSlot = z.infer<typeof annexSlotSchema>

/** Decimal string allowed for contract allowance form fields (matches DB scale). */
export const HRM_ALLOWANCE_AMOUNT_DECIMAL_RE = /^\d+(\.\d{1,2})?$/

export type HrmAllowanceLineFormParsed = {
  readonly componentId: string
  readonly amount: string
  readonly currency: string
}

/**
 * Reads `allowance.<CODE>` from `FormData` for each catalog code.
 * Non-empty values must match {@link HRM_ALLOWANCE_AMOUNT_DECIMAL_RE} or the parse fails (no silent skip).
 */
export function parseAllowanceLineInputsFromForm(input: {
  readonly formData: FormData
  readonly codeToId: ReadonlyMap<string, string>
  readonly currency: string
}):
  | { ok: true; lines: HrmAllowanceLineFormParsed[] }
  | { ok: false; invalidCode: string } {
  const lines: HrmAllowanceLineFormParsed[] = []
  for (const [code, componentId] of input.codeToId) {
    const raw = input.formData.get(`allowance.${code}`)
    if (typeof raw !== "string") continue
    const trimmed = raw.trim()
    if (trimmed.length === 0) continue
    if (!HRM_ALLOWANCE_AMOUNT_DECIMAL_RE.test(trimmed)) {
      return { ok: false, invalidCode: code }
    }
    lines.push({
      componentId,
      amount: trimmed,
      currency: input.currency,
    })
  }
  return { ok: true, lines }
}

/** Build annex JSON from optional paired form fields (up to three slots). */
export function tryBuildAnnexSlotsFromForm(input: {
  readonly annex1No?: string | undefined
  readonly annex1Date?: string | undefined
  readonly annex2No?: string | undefined
  readonly annex2Date?: string | undefined
  readonly annex3No?: string | undefined
  readonly annex3Date?: string | undefined
}):
  | { ok: true; value: HrmContractAnnexSlot[] | null }
  | { ok: false; message: string } {
  const slots: HrmContractAnnexSlot[] = []
  const pairs: Array<{ no?: string; date?: string }> = [
    { no: input.annex1No, date: input.annex1Date },
    { no: input.annex2No, date: input.annex2Date },
    { no: input.annex3No, date: input.annex3Date },
  ]
  for (const p of pairs) {
    const no = p.no?.trim()
    const date = p.date?.trim()
    if (!no && !date) continue
    if (!no || !date) {
      return {
        ok: false,
        message:
          "Each annex requires both a reference number and a date, or leave both empty.",
      }
    }
    slots.push({ annexNo: no, annexDate: date })
  }
  if (slots.length === 0) return { ok: true, value: null }
  const parsed = hrmContractAnnexSlotsSchema.safeParse(slots)
  if (!parsed.success) {
    return { ok: false, message: "Invalid annex slot data." }
  }
  return { ok: true, value: parsed.data }
}
