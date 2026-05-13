import "server-only"

import { flag } from "flags/next"

const BOOLEAN_FLAG_OPTIONS = [
  { label: "Off", value: false },
  { label: "On", value: true },
] as const

const TRUE_ENV_VALUES = new Set(["1", "true", "yes", "on"])
const FALSE_ENV_VALUES = new Set(["0", "false", "no", "off"])

function normalizeEnvValue(value: string | undefined) {
  return value?.trim().toLowerCase()
}

function isFlagsConfigError(error: unknown) {
  return error instanceof Error && error.message.startsWith("flags:")
}

function createBooleanFlag(input: {
  key: string
  description: string
  envName: string
  defaultValue: boolean
}) {
  return flag<boolean>({
    key: input.key,
    description: input.description,
    defaultValue: input.defaultValue,
    options: [...BOOLEAN_FLAG_OPTIONS],
    decide() {
      return readBooleanFlagEnv(input.envName, input.defaultValue)
    },
  })
}

async function resolveBooleanFlagValue(
  featureFlag: () => Promise<boolean>,
  envName: string,
  defaultValue: boolean
) {
  if (!process.env.FLAGS_SECRET?.trim()) {
    return readBooleanFlagEnv(envName, defaultValue)
  }

  try {
    return await featureFlag()
  } catch (error) {
    if (isFlagsConfigError(error)) {
      return readBooleanFlagEnv(envName, defaultValue)
    }
    throw error
  }
}

export function readBooleanFlagEnv(name: string, defaultValue: boolean) {
  const normalized = normalizeEnvValue(process.env[name])
  if (!normalized) return defaultValue
  if (TRUE_ENV_VALUES.has(normalized)) return true
  if (FALSE_ENV_VALUES.has(normalized)) return false
  return defaultValue
}

export const lynxOperatorEnabled = createBooleanFlag({
  key: "lynx-operator-enabled",
  description:
    "Enables Lynx operator assist in the Lynx module and operator APIs.",
  envName: "FLAG_LYNX_OPERATOR_ENABLED",
  defaultValue: true,
})

export const lynxStructuredQueryDemoEnabled = createBooleanFlag({
  key: "lynx-structured-query-demo-enabled",
  description:
    "Enables Lynx's structured NL to SQL demo surface for controlled rollout.",
  envName: "FLAG_LYNX_STRUCTURED_QUERY_DEMO_ENABLED",
  defaultValue: true,
})

export const lynxOperatorOrbitToolsEnabled = createBooleanFlag({
  key: "lynx-operator-orbit-tools-enabled",
  description:
    "Allows Lynx operator assist to inspect Orbit operational state through governed read-only tools.",
  envName: "FLAG_LYNX_OPERATOR_ORBIT_TOOLS_ENABLED",
  defaultValue: true,
})

export const orbitAdvancedOperatorControlsEnabled = createBooleanFlag({
  key: "orbit-advanced-operator-controls-enabled",
  description:
    "Enables Orbit advanced operator controls such as keyboard hotkeys and batch actions.",
  envName: "FLAG_ORBIT_ADVANCED_OPERATOR_CONTROLS_ENABLED",
  defaultValue: true,
})

export const vercelFlags = {
  lynxOperatorEnabled,
  lynxStructuredQueryDemoEnabled,
  lynxOperatorOrbitToolsEnabled,
  orbitAdvancedOperatorControlsEnabled,
} as const

export function isLynxOperatorOrbitToolsEnabled() {
  return readBooleanFlagEnv("FLAG_LYNX_OPERATOR_ORBIT_TOOLS_ENABLED", true)
}

export async function isLynxOperatorEnabled() {
  return resolveBooleanFlagValue(
    lynxOperatorEnabled,
    "FLAG_LYNX_OPERATOR_ENABLED",
    true
  )
}

export async function isLynxStructuredQueryDemoEnabled() {
  return resolveBooleanFlagValue(
    lynxStructuredQueryDemoEnabled,
    "FLAG_LYNX_STRUCTURED_QUERY_DEMO_ENABLED",
    true
  )
}

export async function isOrbitAdvancedOperatorControlsEnabled() {
  return resolveBooleanFlagValue(
    orbitAdvancedOperatorControlsEnabled,
    "FLAG_ORBIT_ADVANCED_OPERATOR_CONTROLS_ENABLED",
    true
  )
}
