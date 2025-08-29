import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import PrivacyPolicyTemplate from "@/components/privacy-policy-template"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

export const metadata: Metadata = {
  title: "Privacy Policy | DocsFlow",
  description: "Our commitment to protecting your privacy and securing your data with DocsFlow's document intelligence platform.",
}

export default function PrivacyPolicy() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-grow">
        <section className="py-12 md:py-16">
          <div className="container max-w-4xl">
            <div className="mb-8">
              <Button variant="ghost" size="sm" asChild className="mb-6">
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
            </div>

            <PrivacyPolicyTemplate
              companyName="DocsFlow"
              websiteUrl="https://docsflow.com"
              contactEmail="privacy@docsflow.com"
              contactAddress={`DocsFlow, Inc.\n[Insert Address]\n[Insert City, State ZIP]\nUnited States`}
              lastUpdated={currentDate}
              includeGDPR={true}
              includeCCPA={true}
              includeCookies={true}
              includeAnalytics={true}
              includeThirdPartyServices={["OpenAI", "Google Analytics", "AWS", "Microsoft Azure"]}
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
