import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"

import type { ActionResult } from "../schemas/action-result.shared"

export type ActionFormErrorsProps<T = void> = {
  result: ActionResult<T> | null | undefined
  title?: string
}

/**
 * RSC helper — renders expected Server Action failures without throwing.
 */
export function ActionFormErrors<T>({
  result,
  title,
}: ActionFormErrorsProps<T>) {
  if (!result || result.ok) {
    return null
  }

  const entries = result.fieldErrors
    ? Object.entries(result.fieldErrors).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].length > 0
      )
    : []

  return (
    <Alert variant="destructive" className="w-full max-w-xl">
      <AlertTitle>{title ?? result.error}</AlertTitle>
      <AlertDescription className="space-y-2">
        {title ? <p>{result.error}</p> : null}
        {result.code ? (
          <p className="font-mono text-xs text-destructive/90">{result.code}</p>
        ) : null}
        {entries.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-sm">
            {entries.map(([field, message]) => (
              <li key={field}>
                <span className="font-medium">{field}</span>
                {": "}
                {message}
              </li>
            ))}
          </ul>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
