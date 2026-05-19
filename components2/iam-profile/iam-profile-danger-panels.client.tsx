"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components2/ui/alert-dialog"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { Spinner } from "#components2/ui/spinner"
import { deleteAccountAction } from "#features/iam-profile/client"

export function IamProfileDangerPanels({ email }: { email: string }) {
  const t = useTranslations("IamProfileSurface.danger")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <section
      id="danger-zone"
      className="scroll-mt-24 rounded-md border border-destructive/40 bg-destructive/5 p-4"
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setOpen(true)}
        >
          {t("deleteAccount.action")}
        </Button>
        {err ? (
          <p className="text-sm text-destructive" role="alert">
            {err}
          </p>
        ) : null}
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deleteAccount.dialogTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-muted-foreground">
                <p>{t("deleteAccount.dialogDescription")}</p>
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm-email">
                    {t("deleteAccount.confirmLabel", { email })}
                  </Label>
                  <Input
                    id="delete-confirm-email"
                    type="email"
                    autoComplete="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("deleteAccount.cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setErr(null)
                startTransition(() => {
                  void deleteAccountAction(confirmEmail).then((result) => {
                    if (!result.ok) {
                      setErr(result.error)
                    }
                  })
                })
              }}
            >
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  {t("deleteAccount.confirming")}
                </span>
              ) : (
                t("deleteAccount.confirm")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
