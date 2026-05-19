/** Default pay-component treatment by country when org has no override (HRM-MCP-006/007). */
export type PayComponentTreatmentFlags = {
  readonly componentCode: string
  readonly taxable: boolean
  readonly contributable: boolean
  readonly pensionable: boolean
}

const BASE_EARNING: PayComponentTreatmentFlags = {
  componentCode: "BASIC",
  taxable: true,
  contributable: true,
  pensionable: true,
}

const COMMON: readonly PayComponentTreatmentFlags[] = [
  BASE_EARNING,
  {
    componentCode: "ALLOWANCE",
    taxable: true,
    contributable: true,
    pensionable: false,
  },
  {
    componentCode: "EPF_EE",
    taxable: false,
    contributable: false,
    pensionable: false,
  },
  {
    componentCode: "PCB",
    taxable: false,
    contributable: false,
    pensionable: false,
  },
]

const BY_COUNTRY: Readonly<
  Record<string, readonly PayComponentTreatmentFlags[]>
> = {
  MY: COMMON,
  SG: [
    ...COMMON,
    {
      componentCode: "CPF_EE",
      taxable: false,
      contributable: false,
      pensionable: false,
    },
  ],
  ID: [
    ...COMMON,
    {
      componentCode: "BPJS_EE",
      taxable: false,
      contributable: false,
      pensionable: false,
    },
  ],
  VN: [
    ...COMMON,
    {
      componentCode: "VN_PIT",
      taxable: false,
      contributable: false,
      pensionable: false,
    },
  ],
}

export function listDefaultPayComponentTreatments(
  countryCode: string
): readonly PayComponentTreatmentFlags[] {
  return BY_COUNTRY[countryCode] ?? COMMON
}
