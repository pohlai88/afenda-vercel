"use client"

import { useTranslations } from "next-intl"
import { Link } from "#i18n/navigation"

import { AuthLegalConsent } from "#components2/auth/auth-legal-consent"
import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components2/ui/tabs"

import {
  SignInFormProvider,
  useSignInForm,
} from "./sign-in-form-context.client"
import { SignInFormMethodPanels } from "./sign-in-form-method-panels.client"
import type { SignInFormMode } from "./sign-in-form.types.shared"

export function SignInForm({
  postAuthPath,
  stepUp = false,
  initialEmail,
  enabledSocialProviders,
  initialMode = "sign-in",
  lockMode = false,
}: {
  postAuthPath: string
  stepUp?: boolean
  initialEmail?: string
  enabledSocialProviders: string[]
  initialMode?: SignInFormMode
  lockMode?: boolean
}) {
  return (
    <SignInFormProvider
      postAuthPath={postAuthPath}
      stepUp={stepUp}
      initialEmail={initialEmail}
      enabledSocialProviders={enabledSocialProviders}
      initialMode={initialMode}
      lockMode={lockMode}
    >
      <SignInFormCard />
    </SignInFormProvider>
  )
}

function SignInFormCard() {
  const t = useTranslations("Auth")
  const {
    mode,
    setMode,
    kind,
    setKind,
    busy,
    stepUp,
    lockMode,
    setOtp,
    focusFieldForMode,
  } = useSignInForm()

  return (
    <Card
      className="w-full border-border/80 shadow-elevation-1"
      aria-busy={busy}
    >
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl tracking-tight">
          {mode === "sign-in" ? t("titleSignIn") : t("titleSignUp")}
        </CardTitle>
        <CardDescription>
          {stepUp ? t("descriptionStepUp") : t("descriptionDefault")}
        </CardDescription>
        {stepUp ? (
          <Alert variant="default" className="mt-3" role="status">
            <AlertTitle>{t("stepUpAlertTitle")}</AlertTitle>
            <AlertDescription>{t("stepUpAlertDescription")}</AlertDescription>
          </Alert>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {lockMode ? (
          <SignInFormMethodPanels
            panelMode={mode}
            panelKind={mode === "sign-up" ? "password" : kind}
          />
        ) : (
          <Tabs
            value={mode}
            onValueChange={(v) => {
              if (busy) return
              const nextMode = v as SignInFormMode
              setMode(nextMode)
              if (nextMode === "sign-up") {
                setKind("password")
              }
              setOtp("")
              focusFieldForMode(nextMode, nextMode === "sign-up" ? "password" : kind)
            }}
          >
            <TabsList className="grid h-10 w-full grid-cols-2">
              <TabsTrigger value="sign-in" disabled={busy}>
                {t("tabSignIn")}
              </TabsTrigger>
              <TabsTrigger value="sign-up" disabled={busy}>
                {t("tabSignUp")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sign-in" className="mt-4 space-y-6 outline-none">
              <SignInFormMethodPanels panelMode="sign-in" />
            </TabsContent>
            <TabsContent value="sign-up" className="mt-4 space-y-6 outline-none">
              <SignInFormMethodPanels panelMode="sign-up" panelKind="password" />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t pt-6">
        <AuthLegalConsent />
        <p className="text-center text-xs text-muted-foreground">
          <Link
            href="/"
            className="font-medium underline-offset-4 hover:text-foreground"
          >
            {t("footerHome")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
