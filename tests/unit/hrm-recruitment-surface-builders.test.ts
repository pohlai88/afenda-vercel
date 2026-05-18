import { describe, expect, it } from "vitest"

import { buildCandidateCareersListSurfaceConfiguration } from "#features/hrm/talent-management/candidate-selfservice-portal/data/candidate-portal-surface-builders.server"
import { parseGovernedKanbanBoardConfiguration } from "#features/governed-surface/schemas/kanban-board.schema"
import {
  buildRecruitmentPipelineKanbanConfiguration,
  buildRecruitmentPipelineStatConfiguration,
  buildRecruitmentRequisitionsListSurfaceConfiguration,
} from "#features/hrm/talent-management/recruitment-onboarding/data/recruitment-surface-builders.server"
import { buildRecruitmentReportListSurfaceConfiguration } from "#features/hrm/talent-management/recruitment-onboarding/data/recruitment-report-list-surface.server"

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
          requisitionType: "new_headcount",
          approvalState: "not_required",
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

  it("builds pipeline kanban configuration with footer-actions and workflow", () => {
    const config = buildRecruitmentPipelineKanbanConfiguration(
      [
        {
          id: "app-1",
          stage: "screening",
          candidateId: "cand-1",
          candidateName: "Alex Kim",
          candidateEmail: null,
          requisitionTitle: "Engineer",
          requisitionId: "req-1",
          convertedEmployeeId: null,
          screeningOutcome: null,
        },
      ],
      new Map([["app-1", 2]]),
      {
        boardAriaLabel: "Pipeline",
        stageLabels: {
          applied: "Applied",
          screening: "Screening",
          shortlisted: "Shortlisted",
          interview: "Interview",
          assessment: "Assessment",
          offer: "Offer",
          hired: "Hired",
          rejected: "Rejected",
          withdrawn: "Withdrawn",
          archived: "Archived",
        },
        pipelineEmpty: "Empty",
        interviewCount: (count) => `${count} interviews`,
        convertedEmployee: "Employee",
      }
    )

    const parsed = parseGovernedKanbanBoardConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.interactionMode).toBe("footer-actions")
    expect(parsed.data.columns).toHaveLength(10)
    expect(parsed.data.cards[0]?.badges).toContain("2 interviews")
    expect(parsed.data.workflow?.transitions.length).toBeGreaterThan(0)
  })

  it("builds operational report list surface rows", () => {
    const config = buildRecruitmentReportListSurfaceConfiguration(
      [{ id: "screening", area: "Screening", count: 3, status: "Configured" }],
      {
        empty: "Empty",
        colArea: "Area",
        colCount: "Count",
        colStatus: "Status",
        areaLabel: (row) => row.area,
        statusLabel: (row) => row.status,
      }
    )
    expect(config.rows[0]?.cells.area).toBe("Screening")
    expect(config.rows[0]?.cells.count).toBe(3)
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
          requisitionType: "new_headcount",
          approvalState: "not_required",
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
    expect(config.rows[0]?.rowHref).toContain(
      "/p/acme-careers/candidate/careers/req-1"
    )
  })
})
