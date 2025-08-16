import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { PerformanceMonitor } from "@/components/performance-monitor"
import { TenantProvider } from "@/components/providers/tenant-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { headers } from 'next/headers'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DocsFlow | AI Document Search for Contracts, SOPs & Business Files",
  description:
    "Save 8+ hours/week with AI-powered answers from your own files. Instantly search SOPs, contracts, reports. Join 500+ teams — try it free.",
  keywords: "document AI, document search, AI document analysis, SOPs, contract analysis, team productivity, business efficiency",
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' }
    ],
    apple: '/logo.png',
    shortcut: '/favicon.ico'
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
        url: "https://docsflow.app/logo.png",
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
    images: ["https://docsflow.app/logo.png"],
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const heads = await headers();
  const tenantId = heads.get('x-tenant-id') || null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <TenantProvider tenantId={tenantId}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <PerformanceMonitor />
              {children}
            </ThemeProvider>
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
