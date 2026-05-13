import { z } from "zod"

const uuid = z.string().uuid()

export const completeOnboardingStepFormSchema = z.object({
  orgSlug: z.string().min(1),
  contractId: uuid,
  stepKey: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9_.-]*$/i, {
      message: "Use letters, numbers, dots, underscores, or hyphens.",
    }),
})

export type CompleteOnboardingStepFormInput = z.infer<
  typeof completeOnboardingStepFormSchema
>
