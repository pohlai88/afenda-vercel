/**
 * Merge dotenv file entries with process.env for child processes.
 *
 * @param {Record<string, string>} fromFile
 * @param {NodeJS.ProcessEnv} processEnv
 * @param {{ fileOverrides?: boolean }} [options]
 *   When fileOverrides is true, keys from fromFile win (for workflow port overrides
 *   under `vercel env run`). Default: process.env wins (Vitest / migrations).
 */
export function mergeChildEnv(fromFile, processEnv, options = {}) {
  if (options.fileOverrides) {
    return { ...processEnv, ...fromFile }
  }
  return { ...fromFile, ...processEnv }
}
