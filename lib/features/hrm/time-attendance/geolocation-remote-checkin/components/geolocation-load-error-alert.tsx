import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"

import type { GeolocationLoadError } from "../data/geolocation-load-error.shared"

export function GeolocationLoadErrorAlert({
  loadError,
}: {
  loadError: GeolocationLoadError
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{loadError.title}</AlertTitle>
      {loadError.description ? (
        <AlertDescription>{loadError.description}</AlertDescription>
      ) : null}
    </Alert>
  )
}
