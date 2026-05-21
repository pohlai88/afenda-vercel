import { expect, test } from "./fixtures/auth"

import { BOOTSTRAP_FIXTURE } from "../fixtures/bootstrap-mocks"
import { ensureTimeClockE2ePermissions } from "./utils/ensure-time-clock-e2e-permissions"
import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()
const ingestApiKey = process.env.HRM_TIME_CLOCK_INGEST_API_KEY?.trim()
const ingestActorUserId =
  process.env.HRM_TIME_CLOCK_INGEST_ACTOR_USER_ID?.trim() ||
  BOOTSTRAP_FIXTURE.members[0].userId

const ORG_SLUG_FROM_APPS_URL_RE = /\/en\/o\/([^/]+)\/apps\//

async function resolveOrgSlug(
  page: import("@playwright/test").Page
): Promise<string> {
  if (orgSlugFromEnv) return orgSlugFromEnv

  const fromApps = page.url().match(ORG_SLUG_FROM_APPS_URL_RE)
  if (fromApps) return fromApps[1]

  const fromSession = await resolveOrgSlugFromSession(page, undefined)
  return fromSession ?? BOOTSTRAP_FIXTURE.organization.slug
}

test.describe("HRM time clock UI surface", () => {
  test.describe.configure({ timeout: 180_000 })

  test.beforeAll(async () => {
    const email =
      process.env.E2E_ORG_ADMIN_EMAIL?.trim() ||
      BOOTSTRAP_FIXTURE.members[0].email
    await ensureTimeClockE2ePermissions(email)
  })

  test(
    "time clock page renders governed sections for the active org",
    { tag: ["@hrm", "@smoke"] },
    async ({ page }) => {
      const slug = await resolveOrgSlug(page)

      await page.goto(`/en/o/${slug}/apps/hrm/time-clock`, {
        waitUntil: "domcontentloaded",
      })

      await expect(page).not.toHaveURL(/session-expired/)

      await expect(
        page.getByRole("heading", {
          name: "Time clock integration",
          exact: true,
        })
      ).toBeVisible()

      const kpi = page.locator(
        '[data-testid="governed-stat-section:hrm:time-clock:kpi-summary"]'
      )
      await expect(kpi.getByText("Overview", { exact: true })).toBeVisible()

      await expect(
        page.locator(
          '[data-testid="governed-list-section:hrm:time-clock:devices"]'
        )
      ).toBeVisible()
      await expect(
        page.locator(
          '[data-testid="governed-list-section:hrm:time-clock:mappings"]'
        )
      ).toBeVisible()
      await expect(
        page.locator(
          '[data-testid="governed-list-section:hrm:time-clock:exceptions"]'
        )
      ).toBeVisible()
      await expect(
        page.locator(
          '[data-testid="governed-list-section:hrm:time-clock:sync-batches"]'
        )
      ).toBeVisible()
    }
  )

  test(
    "registers a device, maps an employee, and ingests a punch via API",
    { tag: ["@hrm", "@smoke"] },
    async ({ page }) => {
      test.setTimeout(180_000)

      const slug = await resolveOrgSlug(page)
      const organizationId = BOOTSTRAP_FIXTURE.organization.id
      const externalDeviceId = `e2e-tci-${Date.now()}`
      const clockUserId = `e2e-user-${Date.now()}`
      const deviceName = `E2E Terminal ${externalDeviceId.slice(-6)}`

      await page.goto(`/en/o/${slug}/apps/hrm/time-clock`, {
        waitUntil: "domcontentloaded",
      })

      await expect(page).not.toHaveURL(/session-expired/)
      await expect(
        page.getByRole("heading", {
          name: "Time clock integration",
          exact: true,
        })
      ).toBeVisible({ timeout: 30_000 })

      const devicesSection = page.locator(
        '[data-testid="governed-list-section:hrm:time-clock:devices"]'
      )
      await expect(devicesSection).toBeVisible({ timeout: 30_000 })

      const registerDeviceButton = devicesSection.getByRole("button", {
        name: "Register device",
      })
      await expect(registerDeviceButton).toBeVisible({ timeout: 15_000 })
      await registerDeviceButton.click()
      const registerDialog = page
        .getByRole("dialog")
        .filter({ has: page.getByLabel("External device ID") })
      await expect(registerDialog).toBeVisible({ timeout: 30_000 })
      await registerDialog
        .getByLabel("External device ID")
        .fill(externalDeviceId)
      await registerDialog.getByLabel("Display name").fill(deviceName)
      await registerDialog.getByRole("button", { name: "Register" }).click()
      await expect(registerDialog).not.toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(externalDeviceId)).toBeVisible()

      const mappingDialogTrigger = page.getByRole("button", {
        name: "Add mapping",
      })
      await expect(mappingDialogTrigger).toBeVisible()
      await mappingDialogTrigger.click()
      const mappingDialog = page.getByRole("dialog", {
        name: "Map employee to device",
      })
      await expect(mappingDialog).toBeVisible({ timeout: 15_000 })

      const employeeSelect = mappingDialog.locator('select[name="employeeId"]')
      const employeeOptions = employeeSelect.locator("option")
      const employeeCount = await employeeOptions.count()
      test.skip(
        employeeCount <= 1,
        "No active employees in seed data for time-clock mapping."
      )
      await employeeSelect.selectOption({ index: 1 })

      const deviceSelect = mappingDialog.locator('select[name="deviceId"]')
      const deviceOption = deviceSelect.locator(
        `option:has-text("${externalDeviceId}")`
      )
      await expect(deviceOption).toHaveCount(1)
      const deviceValue = await deviceOption.getAttribute("value")
      if (!deviceValue) {
        throw new Error("Expected registered device option in mapping dialog.")
      }
      await deviceSelect.selectOption(deviceValue)
      await mappingDialog
        .locator('input[name="clockUserId"]')
        .fill(clockUserId)
      await mappingDialog.getByRole("button", { name: "Save mapping" }).click()
      await expect(mappingDialog).not.toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(clockUserId)).toBeVisible()

      const occurredAtIso = new Date().toISOString()
      const ingestBody = {
        organizationId,
        sourceKind: "api" as const,
        punches: [
          {
            externalDeviceId,
            clockUserId,
            eventType: "clock_in" as const,
            occurredAtIso,
            sourceRef: `e2e-${Date.now()}`,
          },
        ],
      }

      // Playwright `page.request` does not always carry the live browser cookie jar;
      // in-page fetch matches how operators call the route from an authenticated tab.
      const sessionIngest = await page.evaluate(async (body) => {
        const res = await fetch("/api/erp/hrm/time-clock/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        })
        const text = await res.text()
        let json: { accepted?: number; duplicates?: number } | null = null
        try {
          json = JSON.parse(text) as { accepted?: number; duplicates?: number }
        } catch {
          json = null
        }
        return { ok: res.ok, status: res.status, text, json }
      }, ingestBody)
      expect(
        sessionIngest.ok,
        `HTTP ${sessionIngest.status}: ${sessionIngest.text}`
      ).toBe(true)
      expect(sessionIngest.json?.accepted ?? 0).toBeGreaterThanOrEqual(1)

      if (ingestApiKey && ingestActorUserId) {
        const keyResponse = await page.request.post(
          "/api/erp/hrm/time-clock/ingest",
          {
            data: {
              ...ingestBody,
              punches: [
                {
                  ...ingestBody.punches[0],
                  occurredAtIso: new Date().toISOString(),
                  sourceRef: `e2e-key-${Date.now()}`,
                },
              ],
            },
            headers: {
              Authorization: `Bearer ${ingestApiKey}`,
              "x-afenda-organization-id": organizationId,
            },
          }
        )
        expect(keyResponse.ok(), await keyResponse.text()).toBe(true)
        const keyPayload = (await keyResponse.json()) as {
          accepted?: number
          duplicates?: number
        }
        expect(
          (keyPayload.accepted ?? 0) + (keyPayload.duplicates ?? 0)
        ).toBeGreaterThanOrEqual(1)
      }

      await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 })
      await expect(page.getByText(externalDeviceId)).toBeVisible({
        timeout: 30_000,
      })
      await expect(
        page.locator(
          '[data-testid="governed-list-section:hrm:time-clock:sync-batches"]'
        )
      ).toBeVisible()
      await expect(page.getByText("api", { exact: true }).first()).toBeVisible()
    }
  )

  test(
    "time clock route under unknown org slug renders organization not-found",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto("/en/o/zz-no-such-afenda-org-slug-99/apps/hrm/time-clock")
      await expect(
        page.getByRole("heading", {
          name: "Organization not available",
          exact: true,
        })
      ).toBeVisible()
    }
  )
})
