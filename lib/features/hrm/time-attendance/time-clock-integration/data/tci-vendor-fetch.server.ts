import "server-only"

export async function fetchVendorPollJson(pollUrl: string, headers?: HeadersInit): Promise<unknown> {
  const response = await fetch(pollUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...headers,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Vendor poll failed with HTTP ${response.status}`)
  }

  return response.json() as Promise<unknown>
}
