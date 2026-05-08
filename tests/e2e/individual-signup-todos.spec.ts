import { expect, test } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"
import {
  CHECK_EMAIL_PAGE_COPY,
  PERSONAL_TODOS_COPY,
  SIGN_UP_PAGE_COPY,
} from "../fixtures/individual-journey"

function uniqueSignupEmail(baseEmail: string): string {
  const at = baseEmail.indexOf("@")
  if (at <= 0) return baseEmail
  const local = baseEmail.slice(0, at)
  const domain = baseEmail.slice(at + 1)
  return `${local}+e2e${Date.now()}@${domain}`
}

test.describe("individual sign-up surface", () => {
  test(
    "sign-up page renders form and link to sign-in",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/sign-up")
      await expect(
        page.getByRole("heading", { name: SIGN_UP_PAGE_COPY.heading })
      ).toBeVisible()
      await expect(
        page.getByLabel(SIGN_UP_PAGE_COPY.nameLabel, { exact: true })
      ).toBeVisible()
      await expect(
        page.getByLabel(SIGN_UP_PAGE_COPY.emailLabel, { exact: true })
      ).toBeVisible()
      await expect(
        page.getByLabel(SIGN_UP_PAGE_COPY.passwordLabel, { exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: SIGN_UP_PAGE_COPY.submitIdle })
      ).toBeVisible()
      await page
        .getByRole("link", { name: SIGN_UP_PAGE_COPY.signInLink })
        .click()
      await expect(page).toHaveURL(/\/en\/sign-in/)
      await expect(
        page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
      ).toBeVisible()
    }
  )
})

test.describe("individual sign-up → check-email (optional env)", () => {
  const signupEmailBase = process.env.E2E_SIGNUP_EMAIL?.trim()
  const signupPassword = process.env.E2E_SIGNUP_PASSWORD?.trim()
  const signupName = process.env.E2E_SIGNUP_NAME?.trim()

  test.beforeEach(({}, testInfo) => {
    if (!signupEmailBase || !signupPassword || !signupName) {
      testInfo.skip(
        true,
        "Set E2E_SIGNUP_EMAIL (supports plus-address local part), E2E_SIGNUP_PASSWORD, E2E_SIGNUP_NAME to run sign-up API flow."
      )
    }
  })

  test("submits sign-up and lands on check-email", async ({ page }) => {
    const email = uniqueSignupEmail(signupEmailBase!)
    await page.goto("/en/sign-up")
    await page
      .getByLabel(SIGN_UP_PAGE_COPY.nameLabel, { exact: true })
      .fill(signupName!)
    await page
      .getByLabel(SIGN_UP_PAGE_COPY.emailLabel, { exact: true })
      .fill(email)
    await page
      .getByLabel(SIGN_UP_PAGE_COPY.passwordLabel, { exact: true })
      .fill(signupPassword!)
    await page
      .getByRole("button", { name: SIGN_UP_PAGE_COPY.submitIdle })
      .click()

    await expect(page).toHaveURL(/\/en\/check-email/, { timeout: 45_000 })
    await expect(
      page.getByRole("heading", { name: CHECK_EMAIL_PAGE_COPY.heading })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: CHECK_EMAIL_PAGE_COPY.verifyCta })
    ).toBeVisible()
  })
})

test.describe("individual personal todos (optional credentials)", () => {
  const email = process.env.E2E_INDIVIDUAL_EMAIL?.trim()
  const password = process.env.E2E_INDIVIDUAL_PASSWORD?.trim()

  test.beforeEach(({}, testInfo) => {
    if (!email || !password) {
      testInfo.skip(
        true,
        "Set E2E_INDIVIDUAL_EMAIL and E2E_INDIVIDUAL_PASSWORD for a verified account (e.g. after sign-up + email verification, or a seeded dev user used only for personal todos)."
      )
    }
  })

  test(
    "signed-in user opens personal todos, adds a task, marks complete",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/sign-in")
      await expect(
        page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
      ).toBeVisible()

      await page
        .getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
        .fill(email!)
      await page.getByLabel("Password", { exact: true }).fill(password!)
      await page.getByRole("button", { name: "Sign in", exact: true }).click()

      await page.waitForURL(
        /\/en\/(account|check-email|onboarding|o|verify-email)/,
        { timeout: 45_000 }
      )

      await page.goto("/en/account/todos")
      await expect(
        page.getByRole("heading", {
          name: PERSONAL_TODOS_COPY.pageTitle,
          exact: true,
        })
      ).toBeVisible({ timeout: 20_000 })

      await expect(
        page.getByRole("heading", { name: PERSONAL_TODOS_COPY.addSection })
      ).toBeVisible()

      const title = `e2e-personal-${Date.now()}`
      await page
        .getByLabel(PERSONAL_TODOS_COPY.titleLabel, { exact: true })
        .fill(title)
      await page
        .getByRole("button", { name: PERSONAL_TODOS_COPY.addSection })
        .click()

      const row = page.getByRole("listitem").filter({ hasText: title })
      await expect(row).toBeVisible({ timeout: 20_000 })
      await row
        .getByRole("button", { name: PERSONAL_TODOS_COPY.markComplete })
        .click()
      await expect(row.getByText("completed")).toBeVisible({ timeout: 15_000 })
    }
  )
})
