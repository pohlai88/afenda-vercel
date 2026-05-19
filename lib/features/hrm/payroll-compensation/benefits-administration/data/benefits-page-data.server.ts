import "server-only"

import { listActiveEmployeeChoicesForLeave } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import { listDependentsForOrganization } from "../../../employee-management/employee-records-management/data/dependent.queries.server"
import { listBenefitClaimReferencesForOrganization } from "./benefit-claim-reference.queries.server"
import { listBenefitOpenEnrollmentsForOrg } from "./benefit-open-enrollment.queries.server"
import { listBenefitProvidersForOrganization } from "./benefit-provider.queries.server"
import {
  listBenefitEnrollmentsForOrganization,
  listBenefitPlansForOrganization,
  listLifeEventsForOrganization,
} from "./benefit.queries.server"
import type { HrmBenefitsTab } from "./benefit-display.shared"

export type BenefitsPageTabData = {
  employees: Awaited<ReturnType<typeof listActiveEmployeeChoicesForLeave>>
  plans: Awaited<ReturnType<typeof listBenefitPlansForOrganization>>
  enrollments: Awaited<ReturnType<typeof listBenefitEnrollmentsForOrganization>>
  lifeEvents: Awaited<ReturnType<typeof listLifeEventsForOrganization>>
  openEnrollmentWindows: Awaited<
    ReturnType<typeof listBenefitOpenEnrollmentsForOrg>
  >
  dependents: Awaited<ReturnType<typeof listDependentsForOrganization>>
  benefitProviders: Awaited<
    ReturnType<typeof listBenefitProvidersForOrganization>
  >
  allBenefitProviders: Awaited<
    ReturnType<typeof listBenefitProvidersForOrganization>
  >
  claimReferences: Awaited<
    ReturnType<typeof listBenefitClaimReferencesForOrganization>
  >
}

const EMPTY_TAB_DATA: BenefitsPageTabData = {
  employees: [],
  plans: [],
  enrollments: [],
  lifeEvents: [],
  openEnrollmentWindows: [],
  dependents: [],
  benefitProviders: [],
  allBenefitProviders: [],
  claimReferences: [],
}

export async function loadBenefitsPageTabData(
  organizationId: string,
  activeTab: HrmBenefitsTab
): Promise<BenefitsPageTabData> {
  switch (activeTab) {
    case "plans":
      return {
        ...EMPTY_TAB_DATA,
        plans: await listBenefitPlansForOrganization(organizationId, {
          limit: 200,
        }),
        benefitProviders: await listBenefitProvidersForOrganization(
          organizationId,
          { isActive: true, limit: 200 }
        ),
      }
    case "providers":
      return {
        ...EMPTY_TAB_DATA,
        allBenefitProviders: await listBenefitProvidersForOrganization(
          organizationId,
          { limit: 200 }
        ),
      }
    case "enrollments":
      return {
        ...EMPTY_TAB_DATA,
        employees: await listActiveEmployeeChoicesForLeave(organizationId),
        plans: await listBenefitPlansForOrganization(organizationId, {
          limit: 200,
        }),
        enrollments: await listBenefitEnrollmentsForOrganization(
          organizationId,
          { limit: 500 }
        ),
        dependents: await listDependentsForOrganization(organizationId),
      }
    case "claimReferences": {
      const [enrollments, allBenefitProviders, claimReferences] =
        await Promise.all([
          listBenefitEnrollmentsForOrganization(organizationId, {
            limit: 500,
          }),
          listBenefitProvidersForOrganization(organizationId, { limit: 200 }),
          listBenefitClaimReferencesForOrganization(organizationId, 500),
        ])
      return {
        ...EMPTY_TAB_DATA,
        enrollments,
        allBenefitProviders,
        claimReferences,
      }
    }
    case "openEnrollment":
      return {
        ...EMPTY_TAB_DATA,
        plans: await listBenefitPlansForOrganization(organizationId, {
          limit: 200,
        }),
        openEnrollmentWindows:
          await listBenefitOpenEnrollmentsForOrg(organizationId),
      }
    case "life":
      return {
        ...EMPTY_TAB_DATA,
        employees: await listActiveEmployeeChoicesForLeave(organizationId),
        lifeEvents: await listLifeEventsForOrganization(organizationId, {
          limit: 300,
        }),
      }
    case "reports":
      return {
        ...EMPTY_TAB_DATA,
        plans: await listBenefitPlansForOrganization(organizationId, {
          limit: 200,
        }),
        enrollments: await listBenefitEnrollmentsForOrganization(
          organizationId,
          { limit: 500 }
        ),
        lifeEvents: await listLifeEventsForOrganization(organizationId, {
          limit: 300,
        }),
      }
    default:
      return EMPTY_TAB_DATA
  }
}
