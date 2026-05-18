import type {
  FormRule,
  FormRuleCondition,
  FormRuleEffect,
  FormRuleFieldCondition,
} from "./schemas/form-rules.schema"

export type FormFieldRuleState = {
  visible: boolean
  enabled: boolean
}

export type FormRuleValues = Record<string, unknown>

const DEFAULT_FIELD_STATE: FormFieldRuleState = {
  visible: true,
  enabled: true,
}

/**
 * Evaluates declarative rules for a single control.
 * Rules run in order; later matching rules override earlier effects per axis.
 */
export function resolveFormFieldRuleState(
  rules: readonly FormRule[] | undefined,
  values: FormRuleValues
): FormFieldRuleState {
  if (!rules?.length) {
    return DEFAULT_FIELD_STATE
  }

  const hasShowRule = rules.some((rule) => rule.effect === "SHOW")
  const hasEnableRule = rules.some((rule) => rule.effect === "ENABLE")
  let visible = hasShowRule ? false : true
  let enabled = hasEnableRule ? false : true

  for (const rule of rules) {
    if (!evaluateFormRuleCondition(rule.condition, values)) {
      continue
    }

    switch (rule.effect) {
      case "SHOW":
        visible = true
        break
      case "HIDE":
        visible = false
        break
      case "DISABLE":
        enabled = false
        break
      case "ENABLE":
        enabled = true
        break
      default: {
        const _exhaustive: never = rule.effect
        void _exhaustive
      }
    }
  }

  return { visible, enabled }
}

export function evaluateFormRuleCondition(
  condition: FormRuleCondition,
  values: FormRuleValues
): boolean {
  switch (condition.scope) {
    case "field":
      return evaluateFieldCondition(condition, values)
    case "and":
      return condition.conditions.every((child: FormRuleCondition) =>
        evaluateFormRuleCondition(child, values)
      )
    case "or":
      return condition.conditions.some((child: FormRuleCondition) =>
        evaluateFormRuleCondition(child, values)
      )
    default:
      return false
  }
}

function evaluateFieldCondition(
  condition: FormRuleFieldCondition,
  values: FormRuleValues
): boolean {
  const observed = values[condition.fieldId]
  return observed === condition.equals
}

export function isFormRuleEffectVisible(effect: FormRuleEffect): boolean {
  return effect === "SHOW" || effect === "HIDE"
}
