import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { AuthHashHandler } from "@/components/auth-hash-handler"
import { CSPostHogProvider } from "@/providers/posthog-provider"
import { CookieBanner } from "@/components/cookie-banner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const _geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "SixthDegree - Network Intelligence",
  description: "Discover, search, and analyze your professional network with AI-powered insights",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${_geist.variable} ${_geistMono.variable} font-sans antialiased`}>
        <CSPostHogProvider>
          <AuthHashHandler />
          {children}
          <Toaster />
          <CookieBanner />
          <Analytics />
        </CSPostHogProvider>
      </body>
    </html>
  )
}
