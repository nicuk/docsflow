import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { PerformanceMonitor } from "@/components/performance-monitor"
import { TenantProvider } from "@/components/providers/tenant-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { QueryProvider } from "@/components/providers/query-provider"
import { Toaster } from "@/components/ui/toaster"

// SURGICAL FIX: Removed headers() import that was forcing dynamic rendering and breaking CSS delivery

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DocsFlow | AI Document Search for Contracts, SOPs & Business Files",
  description:
    "Save 8+ hours/week with AI-powered answers from your own files. Instantly search SOPs, contracts, reports. Join 500+ teams — try it free.",
  keywords: "document AI, document search, AI document analysis, SOPs, contract analysis, team productivity, business efficiency",
  icons: {
    icon: [
      { url: '/favicon.svg?v=3', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=3', sizes: '32x32' }
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico?v=3'
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://docsflow.app",
    title: "DocsFlow | AI-Powered Document Intelligence",
    description:
      "Transform your document chaos into instant answers. AI that understands your contracts, reports, and business files.",
    siteName: "DocsFlow",
    images: [
      {
        url: "https://docsflow.app/logo.svg",
        width: 1200,
        height: 630,
        alt: "DocsFlow - Turn Documents Into Instant Answers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DocsFlow | AI-Powered Document Intelligence",
    description: "Stop searching files. Start getting answers. AI that understands your business documents.",
    images: ["https://docsflow.app/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  generator: 'DocsFlow',
  alternates: {
    canonical: 'https://docsflow.app',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // SURGICAL FIX: Removed headers() usage that was forcing dynamic rendering
  // Tenant info will be handled by TenantProvider instead
  const tenantId = null;
  const tenantSubdomain = null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Force favicon refresh with explicit meta tags */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />

      </head>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <TenantProvider tenantId={tenantId} tenantSubdomain={tenantSubdomain}>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <PerformanceMonitor />
                {children}
                <Toaster />
              </ThemeProvider>
            </TenantProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
