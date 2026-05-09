import { MailCheckIcon } from "lucide-react"

import {
  AuthFooterLink,
  AuthFooterLinks,
} from "#components/auth/auth-footer-links"
import { AuthPageFrame } from "#components/auth/auth-page-frame"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Link } from "#i18n/navigation"

export default function CheckEmailPage() {
  return (
    <AuthPageFrame>
      <Card className="w-full border-border/80 shadow-elevation-1">
        <CardHeader className="space-y-2 pb-4">
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10">
            <MailCheckIcon className="size-5 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-xl tracking-tight">
            Check your email
          </CardTitle>
          <CardDescription>
            We sent a verification code or link to your inbox. It may take a
            minute to arrive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/verify-email">Enter verification code</Link>
          </Button>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <AuthFooterLinks>
            <AuthFooterLink href="/sign-in">Back to sign in</AuthFooterLink>
          </AuthFooterLinks>
        </CardFooter>
      </Card>
    </AuthPageFrame>
  )
}
