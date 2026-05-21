/** Resolve a stable entity id from URL query against an org-scoped list. */
export function resolveCareerPathingSelectedId(
  candidates: readonly { id: string }[],
  selectedId: string | undefined
): string | undefined {
  if (selectedId && candidates.some((row) => row.id === selectedId)) {
    return selectedId
  }
  return candidates[0]?.id
}

/** Resolve skill-gap employee from target-role rows and optional `?employeeId=`. */
export function resolveCareerPathingSkillGapEmployeeId(
  targetRoles: readonly { employeeId: string }[],
  selectedEmployeeId: string | undefined
): string | undefined {
  const uniqueEmployeeIds = [
    ...new Set(targetRoles.map((row) => row.employeeId)),
  ].map((employeeId) => ({ id: employeeId }))

  return resolveCareerPathingSelectedId(
    uniqueEmployeeIds,
    selectedEmployeeId
  )
}
