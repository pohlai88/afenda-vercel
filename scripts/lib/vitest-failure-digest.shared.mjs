/**
 * Parse Vitest JSON reporter output into a compact failure digest.
 * Shared by vitest-audit.mjs and vitest-failures.mjs.
 */

/** @param {unknown} report */
export function buildFailureDigest(report) {
  /** @type {Array<{ file: string; title: string; messages: string[] }>} */
  const failures = []

  const testResults = report?.testResults
  if (!Array.isArray(testResults)) {
    return {
      failures,
      lines: ["(could not parse vitest-report.json)"],
    }
  }

  for (const fileResult of testResults) {
    const file =
      typeof fileResult?.name === "string" ? fileResult.name : "(unknown file)"
    const assertions = fileResult?.assertionResults
    if (!Array.isArray(assertions)) continue

    for (const assertion of assertions) {
      if (assertion?.status !== "failed") continue
      const title =
        typeof assertion?.title === "string"
          ? assertion.title
          : "(unknown test)"
      const messages = Array.isArray(assertion?.failureMessages)
        ? assertion.failureMessages.filter((m) => typeof m === "string")
        : []
      failures.push({ file, title, messages })
    }
  }

  /** @type {string[]} */
  const lines = []
  if (failures.length === 0) {
    lines.push("All tests passed.")
    return { failures, lines }
  }

  lines.push(`Failed tests: ${failures.length}`)
  lines.push("")

  for (const failure of failures) {
    lines.push(`${failure.file} › ${failure.title}`)
    for (const message of failure.messages) {
      for (const line of message.split(/\r?\n/)) {
        lines.push(`  ${line}`)
      }
      lines.push("")
    }
  }

  return { failures, lines }
}

/** @param {string} text */
export function digestIndicatesPass(text) {
  return text.trim() === "All tests passed."
}

/** @param {string} text */
export function digestIndicatesFailures(text) {
  return /^Failed tests: \d+/m.test(text)
}
