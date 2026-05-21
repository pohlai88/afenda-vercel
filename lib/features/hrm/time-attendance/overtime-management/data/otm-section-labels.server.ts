import "server-only"

import { getTranslations } from "next-intl/server"

import {
  HRM_OTM_DAY_CATEGORIES,
  type HrmOtmDayCategory,
} from "../schemas/otm.schema"
import {
  HRM_OTM_EXCEPTION_TYPES,
  type HrmOtmExceptionType,
} from "../schemas/otm-workflow-state.shared"

export async function getOtmDayCategoryLabelMap(): Promise<
  Record<HrmOtmDayCategory, string>
> {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  return Object.fromEntries(
    HRM_OTM_DAY_CATEGORIES.map((category) => [
      category,
      t(
        `dayCategoryLabels.${category}` as `dayCategoryLabels.${HrmOtmDayCategory}`
      ),
    ])
  ) as Record<HrmOtmDayCategory, string>
}

export async function getOtmExceptionTypeLabelMap(): Promise<
  Record<HrmOtmExceptionType, string>
> {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  return Object.fromEntries(
    HRM_OTM_EXCEPTION_TYPES.map((type) => [
      type,
      t(
        `exceptionTypeLabels.${type}` as `exceptionTypeLabels.${HrmOtmExceptionType}`
      ),
    ])
  ) as Record<HrmOtmExceptionType, string>
}
