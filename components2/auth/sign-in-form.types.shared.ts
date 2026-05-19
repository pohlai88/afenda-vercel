export type SignInFormMode = "sign-in" | "sign-up"
export type SignInFormAuthKind = "password" | "otp"

export type SignInFormActionPending =
  | null
  | "form"
  | "oauth-google"
  | "oauth-github"
