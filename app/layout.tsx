import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from "@/components/theme-provider"
import { PerformanceMonitor } from "@/components/performance-monitor"
import { TenantProvider } from "@/components/providers/tenant-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { QueryProvider } from "@/components/providers/query-provider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from '@vercel/analytics/next'

// headers() import removed to avoid forcing dynamic rendering

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
        url: "https://docsflow.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "DocsFlow - AI Document Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DocsFlow | AI-Powered Document Intelligence",
    description: "Stop searching files. Start getting answers. AI that understands your business documents.",
    images: ["https://docsflow.app/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  generator: 'DocsFlow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Tenant info handled by TenantProvider (not headers() to avoid dynamic rendering)
  // Tenant info will be handled by TenantProvider instead
  const tenantId = null;
  const tenantSubdomain = null;

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          {process.env.NEXT_PUBLIC_GA_ID && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
                strategy="afterInteractive"
              />
              <Script id="gtag-init" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                `}
              </Script>
            </>
          )}
          <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
          <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
          <link rel="shortcut icon" href="/favicon.ico?v=3" />
          <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-readable site description" />
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
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
