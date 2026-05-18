import "server-only"

export const RECRUITMENT_READ_PERMISSION = {
  module: "hrm" as const,
  object: "recruitment" as const,
  function: "read" as const,
}

export const RECRUITMENT_TABLE_PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "comfortable" as const,
}
