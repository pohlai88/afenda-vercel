import { expect, test } from "@playwright/test"

import { AUTH_PUBLIC_SHELL_COPY } from "../fixtures/auth-public-shell"
import { CHECK_EMAIL_PAGE_COPY } from "../fixtures/individual-journey"
import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

test.describe("pre-sign-in auth shell", () => {
  test(
    "forgot-password page: form, submit control, back link to sign-in",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/forgot-password")
      await expect(
        page.getByText(AUTH_PUBLIC_SHELL_COPY.forgotPasswordTitle, {
          exact: true,
        })
      ).toBeVisible()
      await expect(
        page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("button", {
          name: AUTH_PUBLIC_SHELL_COPY.forgotPasswordSend,
        })
      ).toBeVisible()
      await page
        .getByRole("link", {
          name: AUTH_PUBLIC_SHELL_COPY.forgotPasswordBackToSignIn,
        })
        .click()
      await expect(page).toHaveURL(/\/en\/sign-in/)
    }
  )

  test(
    "reset-password without token shows error on submit",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/reset-password")
      await expect(
        page.getByText(AUTH_PUBLIC_SHELL_COPY.resetPasswordTitle, {
          exact: true,
        })
      ).toBeVisible()
      await page
        .getByLabel("New password", { exact: true })
        .fill("longpassword1")
      await page
        .getByLabel("Confirm password", { exact: true })
        .fill("longpassword1")
      await page
        .getByRole("button", {
          name: AUTH_PUBLIC_SHELL_COPY.resetPasswordSubmit,
        })
        .click()
      await expect(
        page.getByText(AUTH_PUBLIC_SHELL_COPY.resetMissingTokenAlert, {
          exact: true,
        })
      ).toBeVisible()
    }
  )

  test(
    "check-email and verify-email pages render primary content",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/check-email")
      await expect(
        page.getByRole("heading", {
          name: CHECK_EMAIL_PAGE_COPY.heading,
          exact: true,
        })
      ).toBeVisible()
      await expect(
        page.getByRole("link", { name: CHECK_EMAIL_PAGE_COPY.verifyCta })
      ).toBeVisible()

      await page.goto("/en/verify-email")
      await expect(
        page.getByRole("heading", {
          name: AUTH_PUBLIC_SHELL_COPY.verifyEmailHeading,
          exact: true,
        })
      ).toBeVisible()
      await expect(
        page.getByRole("button", {
          name: AUTH_PUBLIC_SHELL_COPY.verifyEmailSubmit,
        })
      ).toBeVisible()
    }
  )

  test(
    "sign-in page: Sign up tab shows name field",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/sign-in")
      await expect(
        page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
      ).toBeVisible()
      await page
        .getByRole("tab", { name: AUTH_PUBLIC_SHELL_COPY.signInTabSignUp })
        .click()
      await expect(
        page.getByLabel(AUTH_PUBLIC_SHELL_COPY.signUpNameLabel, {
          exact: true,
        })
      ).toBeVisible()
    }
  )
})
