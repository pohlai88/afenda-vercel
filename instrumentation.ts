import type { Instrumentation } from "next"

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return
  }

  const { registerOTel } = await import("@vercel/otel")
  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "shadcn-next-app",
  })
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const err = error as Error & { digest: string }
  console.error("[onRequestError]", {
    digest: err.digest,
    message: err.message,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
  })
}
