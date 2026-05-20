#!/usr/bin/env node
/**
 * Migrate HRM form-success ref+effect duplication to the shared
 * `useFormSuccess` hook at `lib/features/hrm/_internal-cross-cutting/`.
 *
 * Idempotent. Run with `--apply` to write; otherwise dry-run.
 *
 *   node scripts/refactors/2026-05-19-hrm-use-form-success-hook.mjs           # dry-run
 *   node scripts/refactors/2026-05-19-hrm-use-form-success-hook.mjs --apply   # write
 *
 * Scope: only the 23 HRM dialog forms that exhibit the exact uniform shape:
 *   const onSuccessRef = useRef(onSuccess)
 *   useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])
 *   useEffect(() => { if (state?.ok) onSuccessRef.current?.() }, [state])
 *
 * Two forms with richer success gating (router.refresh, outcome guard) are
 * intentionally NOT in this list and keep their inline effects:
 *   - employee-portal-claim-submit-form.client.tsx  (router.refresh after ok)
 *   - remote-checkin-capture-form.client.tsx        (state.outcome === "approved")
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const APPLY = process.argv.includes("--apply")
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

const TARGETS = [
  "lib/features/hrm/time-attendance/leave-attendance-management/components/attendance-record-event-form.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-apply-form.tsx",
  "lib/features/hrm/payroll-compensation/benefits-administration/components/benefit-claim-reference-form.tsx",
  "lib/features/hrm/payroll-compensation/benefits-administration/components/benefit-plan-form.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/attendance-correction-form.tsx",
  "lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/components/fwa-request-form.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-clarification-form.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-cancel-form.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-own-request-form.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-return-form.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/policies-leave-type-form.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-reject-form.tsx",
  "lib/features/hrm/payroll-compensation/expenses-reimbursement/components/claim-submit-form.tsx",
  "lib/features/hrm/payroll-compensation/expenses-reimbursement/components/claim-reject-form.tsx",
  "lib/features/hrm/payroll-compensation/expenses-reimbursement/components/claim-return-form.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-leave-request-form.tsx",
  "lib/features/hrm/payroll-compensation/benefits-administration/components/benefit-life-event-record-form.tsx",
  "lib/features/hrm/payroll-compensation/benefits-administration/components/benefit-provider-form.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-leave-cancel-button.tsx",
  "lib/features/hrm/talent-management/competency-skills-framework/components/skill-edit-dialog.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-advance-request-form.tsx",
  "lib/features/hrm/talent-management/competency-skills-framework/components/skill-create-dialog.tsx",
  "lib/features/hrm/payroll-compensation/benefits-administration/components/benefit-enrollment-form.tsx",
]

const REACT_IMPORT_RE =
  /^(import\s*\{\s*)([^}]+?)(\s*\}\s*from\s*["']react["'])/m
const SUCCESS_BLOCK_RE =
  /(?:\r?\n)?\s*const\s+onSuccessRef\s*=\s*useRef\(onSuccess\)\s*\r?\n\s*useEffect\(\s*\(\)\s*=>\s*\{\s*\r?\n\s*onSuccessRef\.current\s*=\s*onSuccess\s*\r?\n\s*\}\s*,\s*\[onSuccess\]\s*\)\s*\r?\n+\s*useEffect\(\s*\(\)\s*=>\s*\{\s*\r?\n?\s*if\s*\(state\?\.ok\)\s*(?:\{\s*\r?\n?\s*onSuccessRef\.current\?\.\(\)\s*\r?\n?\s*\}|onSuccessRef\.current\?\.\(\))\s*\r?\n\s*\}\s*,\s*\[state\]\s*\)/m

const HOOK_IMPORT = `import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"`

function migrate(filePath) {
  const abs = path.join(root, filePath)
  if (!fs.existsSync(abs)) return { filePath, status: "missing" }
  const original = fs.readFileSync(abs, "utf8")

  if (original.includes("useFormSuccess")) {
    return { filePath, status: "already-migrated" }
  }
  if (!SUCCESS_BLOCK_RE.test(original)) {
    return { filePath, status: "no-block-match" }
  }

  // 1. Trim useEffect + useRef from the React import (one or both)
  let next = original.replace(REACT_IMPORT_RE, (_match, lead, names, tail) => {
    const cleaned = names
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n && n !== "useEffect" && n !== "useRef")
    return `${lead}${cleaned.join(", ")}${tail}`
  })

  // 2. Replace the success ref/effect block with the hook call
  next = next.replace(
    SUCCESS_BLOCK_RE,
    () => `\n  useFormSuccess(state, onSuccess)`
  )

  // 3. Insert the hook import. Prefer placement just before the FIRST
  //    relative `from "../...` import so external/alias groups stay
  //    above and the relative-imports block grows by one line. If the
  //    file has no relative imports at all, append after the last
  //    import statement (covers small leaf forms whose only imports
  //    are React + alias paths).
  const firstRelative = next.match(
    /^(import[^\n]*\sfrom\s*["']\.\.\/[^"']+["'][^\n]*\n)/m
  )
  if (firstRelative) {
    const idx = next.indexOf(firstRelative[0])
    next = next.slice(0, idx) + `${HOOK_IMPORT}\n` + next.slice(idx)
  } else {
    const importRe = /^import[^\n]*\sfrom\s*["'][^"']+["'][^\n]*\n/gm
    let lastEnd = -1
    let m
    while ((m = importRe.exec(next)) !== null) {
      lastEnd = m.index + m[0].length
    }
    if (lastEnd === -1) {
      return { filePath, status: "no-import-anchor-at-all" }
    }
    next = next.slice(0, lastEnd) + `\n${HOOK_IMPORT}\n` + next.slice(lastEnd)
  }

  if (next === original) return { filePath, status: "noop" }

  if (APPLY) {
    fs.writeFileSync(abs, next)
    return { filePath, status: "wrote" }
  }
  return { filePath, status: "would-write" }
}

const results = TARGETS.map(migrate)
const summary = results.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] ?? 0) + 1
  return acc
}, {})

console.log(APPLY ? "[apply] migrating…" : "[dry-run] preview…")
for (const r of results) {
  console.log(`  ${r.status.padEnd(22)} ${r.filePath}`)
}
console.log("\nsummary:", summary)

if (
  results.some(
    (r) =>
      r.status === "no-block-match" || r.status === "no-relative-import-anchor"
  )
) {
  process.exitCode = 1
}
