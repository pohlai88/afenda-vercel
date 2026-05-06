import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter } from "next/font/google"

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

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    /**
     * OS / browser tab follows `prefers-color-scheme`, not the in-page `next-themes` toggle.
     * Light and dark both use the same transparent square marks (`APP_ICON_*`); maskable stays
     * on the PWA manifest only (`purpose: "maskable"`).
     * `shortcut` → real multi-size ICO at `/favicon.ico` (`pnpm icons:favicon`).
     * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata#icons
     */
    shortcut: FAVICON_ICO,
    icon: [
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
