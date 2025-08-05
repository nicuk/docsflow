import { Metadata } from "next"
import MagicHeroSection from "@/components/magic-hero-section"
import MagicMomentsSection from "@/components/magic-moments-section"
import Footer from "@/components/footer"
import StructuredData from "@/components/structured-data"

export const metadata: Metadata = {
  title: "Stop Manually Searching Documents - Get Instant Answers | DocsFlow",
  description: "Ask any question about your business files. Get answers in 10 seconds with exact page references. Save 10+ hours every week. Free setup for first 50 businesses.",
  keywords: "document search, business AI, file intelligence, instant answers, document management, business automation",
  openGraph: {
    title: "Stop Manually Searching Documents - Get Instant Answers",
    description: "Save 10+ hours every week. Ask questions about your business files in plain English, get instant answers with exact sources.",
    images: ["/og-magic-demo.jpg"],
  },
}

export default function MagicLandingPage() {
  return (
    <>
      <StructuredData />
      <div className="flex min-h-screen flex-col">
        <MagicHeroSection />
        <MagicMomentsSection />
        <Footer />
      </div>
    </>
  )
}