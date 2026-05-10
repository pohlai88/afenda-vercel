/**
 * Optional accessibility rules — run via `pnpm lint:a11y`.
 * Kept separate from default `pnpm lint` until the baseline is clean.
 *
 * `eslint-config-next` already registers `jsx-a11y`; this file only applies
 * recommended rules on top of the base config (no duplicate plugin key).
 */
import baseConfig from "../eslint.config.mjs"
import jsxA11y from "eslint-plugin-jsx-a11y"

/** @type {import("eslint").Linter.Config} */
const a11yRules = {
  rules: jsxA11y.flatConfigs.recommended.rules,
}

/** Addon may contain `<button>`; outer `<button>` would be invalid nesting. */
const inputGroupAddonException = {
  files: ["components/ui/input-group.tsx"],
  rules: {
    "jsx-a11y/click-events-have-key-events": "off",
    "jsx-a11y/no-noninteractive-element-interactions": "off",
  },
}

const eslintA11yConfig = [...baseConfig, a11yRules, inputGroupAddonException]

export default eslintA11yConfig
