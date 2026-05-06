import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import { headers } from "next/headers"

import "./globals.css"
import { ThemeProvider } from "#components/theme-provider"
import { Toaster } from "#components/ui/sonner"
import { TooltipProvider } from "#components/ui/tooltip"
import {
  APP_ICON_192_PNG,
  APP_ICON_512_PNG,
  APP_ICON_APPLE_180_PNG,
  DEFAULT_OG_IMAGE,
  FAVICON_ICO,
  SITE_DESCRIPTION,
  SITE_NAME,
  getSiteUrl,
} from "#lib/site"
import { cn } from "#lib/utils"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

/**
 * Icons and OG URLs resolve against `metadataBase`. Using the **request host** avoids
 * pointing at the wrong origin when `NEXT_PUBLIC_SITE_URL` is a custom domain but the user
 * is on `*.vercel.app` (or vice versa), which breaks favicon fetches and shows a fallback.
 */
async function resolveRequestMetadataBase(): Promise<URL> {
  const h = await headers()
  const hostRaw =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host")?.trim()
  if (hostRaw) {
    const forwardedProto = h
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
    const proto =
      forwardedProto ||
      (hostRaw.startsWith("localhost") || hostRaw.startsWith("127.0.0.1")
        ? "http"
        : "https")
    return new URL(`${proto}://${hostRaw}`)
  }
  return new URL(getSiteUrl())
}

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = await resolveRequestMetadataBase()
  return {
    metadataBase,
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    icons: {
      /**
       * OS / browser tab follows `prefers-color-scheme`, not the in-page `next-themes` toggle.
       * ICO first — browsers often prefer it for the tab; PNGs follow for high-DPI / PWA.
       * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata#icons
       */
      shortcut: FAVICON_ICO,
      icon: [
        { url: FAVICON_ICO, sizes: "48x48", type: "image/x-icon" },
        {
          url: APP_ICON_512_PNG,
          sizes: "512x512",
          type: "image/png",
          media: "(prefers-color-scheme: light)",
        },
        {
          url: APP_ICON_192_PNG,
          sizes: "192x192",
          type: "image/png",
          media: "(prefers-color-scheme: light)",
        },
        {
          url: APP_ICON_512_PNG,
          sizes: "512x512",
          type: "image/png",
          media: "(prefers-color-scheme: dark)",
        },
        {
          url: APP_ICON_192_PNG,
          sizes: "192x192",
          type: "image/png",
          media: "(prefers-color-scheme: dark)",
        },
        {
          url: APP_ICON_512_PNG,
          sizes: "512x512",
          type: "image/png",
        },
        {
          url: APP_ICON_192_PNG,
          sizes: "192x192",
          type: "image/png",
        },
    ],
    apple: [
      {
        url: APP_ICON_512_PNG,
        sizes: "512x512",
        type: "image/png",
      },
      {
        url: APP_ICON_APPLE_180_PNG,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "/",
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 512,
          height: 512,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export const viewport: Viewport = {
  colorScheme: "light dark",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        inter.variable,
        geistMono.variable
      )}
    >
      <body className="min-h-svh">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableColorScheme
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={0}>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
