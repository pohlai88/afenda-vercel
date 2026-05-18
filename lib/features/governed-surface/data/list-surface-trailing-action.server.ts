import "server-only"

import {
  resolveListSurfaceRowTrailingAction,
  type ResolveListSurfaceRowTrailingActionInput,
} from "../list-surface-trailing-action.shared"
import type { ActionDescriptor } from "../schemas/action.schema"
import type { ErpPermissionRequirement } from "../schemas/erp-permission-requirement.schema"
import type { ListSurfaceRowTrailingAction } from "../schemas/list-surface-row-trailing-action.schema"
import { resolveGovernedErpPermissionAllowed } from "./governed-permission-gate.server"

export type ResolveTrailingActionForErpPermissionInput = {
  requirement: ErpPermissionRequirement | undefined
  visible?: boolean
  deniedReason: string
  descriptor?: ActionDescriptor
}

/**
 * Server-only: evaluate ERP permission once per row (or per builder call) and
 * emit governed trailing-action metadata for Pattern C sections.
 */
export async function resolveListSurfaceRowTrailingActionForErpPermission(
  input: ResolveTrailingActionForErpPermissionInput
): Promise<ListSurfaceRowTrailingAction | undefined> {
  const allowed = await resolveGovernedErpPermissionAllowed(input.requirement)
  return resolveListSurfaceRowTrailingAction({
    visible: input.visible,
    allowed,
    disabledReason: input.deniedReason,
    descriptor: input.descriptor,
  })
}

export async function resolveListSurfaceRowTrailingActionsForErpPermission<
  TRow extends { id: string },
>(
  rows: readonly TRow[],
  resolveInput: (
    row: TRow
  ) =>
    | Promise<ResolveTrailingActionForErpPermissionInput>
    | ResolveTrailingActionForErpPermissionInput
): Promise<Map<string, ListSurfaceRowTrailingAction | undefined>> {
  const entries = await Promise.all(
    rows.map(async (row) => {
      const input = await resolveInput(row)
      const action = await resolveListSurfaceRowTrailingActionForErpPermission(
        input
      )
      return [row.id, action] as const
    })
  )
  return new Map(entries)
}

export type { ResolveListSurfaceRowTrailingActionInput }
