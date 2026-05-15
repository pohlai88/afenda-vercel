import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? "0"),
    includeLocalVariables: true,
    enableLogs: true,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/www\.nexuscanon\.com/,
    ],
  })
}
