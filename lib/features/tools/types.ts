export type ToolsMutationFormState =
  | { ok: true; requestId?: string; sealed?: boolean }
  | {
      ok: false
      errors: {
        form?: string
        importSessionId?: string
        contractId?: string
        requestId?: string
      }
    }
