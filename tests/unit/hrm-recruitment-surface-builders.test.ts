import { describe, expect, it } from "vitest"

import {
  buildCandidateCareersListSurfaceConfiguration,
} from "#features/hrm/talent-management/candidate-selfservice-portal/data/candidate-portal-surface-builders.server"
import {
  buildRecruitmentPipelineStatConfiguration,
  buildRecruitmentRequisitionsListSurfaceConfiguration,
} from "#features/hrm/talent-management/recruitment-applicant-tracking/data/recruitment-surface-builders.server"

describe("recruitment surface builders", () => {
  it("builds pipeline stat configuration", () => {
    const config = buildRecruitmentPipelineStatConfiguration({
      openRequisitionCount: 2,
      activeApplicationCount: 5,
      interviewQueueCount: 1,
      offerInFlightCount: 3,
      copy: {
        openRequisitions: "Open",
        activeApplications: "Active",
        interviewsQueued: "Interviews",
        offersInFlight: "Offers",
      },
    })
    expect(config.stats).toHaveLength(4)
    expect(config.stats[0]?.value).toBe("2")
  })

  it("builds requisitions list surface rows", () => {
    const config = buildRecruitmentRequisitionsListSurfaceConfiguration(
      [
        {
          id: "req-1",
          title: "Engineer",
          departmentId: null,
          departmentName: "Product",
          headcount: 1,
          status: "open",
          requiredSkillCodes: ["typescript"],
          createdAt: new Date("2026-01-01"),
        },
      ],
      "acme",
      {
        pageTitle: "Requisitions",
        pageDescription: "All",
        empty: "None",
        colTitle: "Title",
        colDepartment: "Dept",
        colHeadcount: "HC",
        colStatus: "Status",
      }
    )
    expect(config.rows).toHaveLength(1)
    expect(config.rows[0]?.cells.title).toBe("Engineer")
  })
})

describe("candidate portal surface builders", () => {
  it("builds careers list with apply detail links", () => {
    const config = buildCandidateCareersListSurfaceConfiguration(
      [
        {
          id: "req-1",
          title: "Designer",
          departmentId: null,
          departmentName: null,
          headcount: 2,
          status: "open",
          requiredSkillCodes: [],
          createdAt: new Date("2026-01-01"),
        },
      ],
      "acme-careers",
      {
        pageTitle: "Careers",
        pageDescription: "Open roles",
        emptyTitle: "Empty",
        colTitle: "Role",
        colDepartment: "Dept",
        colHeadcount: "HC",
        colStatus: "Status",
        statusOpen: "Open",
      }
    )
    expect(config.rows[0]?.rowHref).toContain("/p/acme-careers/candidate/careers/req-1")
  })
})
