import { expect, test } from "@playwright/test"

import { signInAsOrgAdmin } from "./utils/org-admin-auth"
import {
  hasOrgSwitchFixtureDatabase,
  ORG_SWITCH_E2E_FIXTURE,
  resetOrgSwitchFixture,
  seedOrgSwitchFixtureForUser,
} from "./utils/org-switch-fixtures"
import { BOOTSTRAP_FIXTURE } from "../fixtures/bootstrap-mocks"

/**
 * Must stay aligned with `DEV_PASSWORD` in `scripts/seed-dev-users.mjs` and
 * `components/dev/dev-signin-panel.tsx`.
 */
const DEV_OWNER_PASSWORD = "123qweasdzxc!@#"

const orgAdminEmail =
  process.env.E2E_ORG_ADMIN_EMAIL?.trim() || BOOTSTRAP_FIXTURE.members[0].email
const orgAdminPassword =
  process.env.E2E_ORG_ADMIN_PASSWORD?.trim() || DEV_OWNER_PASSWORD

test.describe("Workbench org switch", () => {
  test.describe.configure({ mode: "serial" })

  test("switches organizations from the left utility bar and lands on the target Nexus route", async ({
    page,
  }) => {
    test.setTimeout(90_000)
    test.skip(
      !hasOrgSwitchFixtureDatabase(),
      "Set DATABASE_URL for deterministic org switch E2E fixtures."
    )

    await seedOrgSwitchFixtureForUser(orgAdminEmail)

    try {
      await signInAsOrgAdmin(page, orgAdminEmail, orgAdminPassword!)

      await page.goto(`/en/o/${BOOTSTRAP_FIXTURE.organization.slug}/nexus`, {
        waitUntil: "domcontentloaded",
      })

      await expect(
        page.getByRole("button", { name: "Switch organization" })
      ).toBeVisible()

      await page.getByRole("button", { name: "Switch organization" }).click()
      await expect(
        page.getByRole("menuitem", {
          name: new RegExp(ORG_SWITCH_E2E_FIXTURE.organizationName, "i"),
        })
      ).toBeVisible()

      await page
        .getByRole("menuitem", {
          name: new RegExp(ORG_SWITCH_E2E_FIXTURE.organizationName, "i"),
        })
        .click()

      await page.waitForURL(
        new RegExp(`/en/o/${ORG_SWITCH_E2E_FIXTURE.organizationSlug}/nexus/?$`)
      )
      await expect(page).toHaveURL(
        new RegExp(`/en/o/${ORG_SWITCH_E2E_FIXTURE.organizationSlug}/nexus/?$`)
      )
    } finally {
      await resetOrgSwitchFixture()
    }
  })
})
