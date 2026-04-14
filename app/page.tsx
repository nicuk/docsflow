import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bot, Database, Shield, Users } from "lucide-react"
import ContactForm from "@/components/contact-form"
import Testimonials from "@/components/testimonials"
import UseCases from "@/components/use-cases"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import FAQSection from "@/components/faq-section"
import TrustBadges from "@/components/trust-badges"
import TypingPromptInput from "@/components/typing-prompt-input"
import FramerSpotlight from "@/components/framer-spotlight"
import CssGridBackground from "@/components/css-grid-background"
import FeaturesSection from "@/components/features-section"
import StructuredData from "@/components/structured-data"
import ROICalculator from "@/components/roi-calculator"

export default function Home() {
  return (
    <>
      <StructuredData />
      <div className="flex min-h-screen flex-col">
        <Navbar />

        {/* Hero Section */}
        <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <CssGridBackground />
          <FramerSpotlight />
          <div className="container px-4 md:px-6 py-16 md:py-20">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter mb-6 text-foreground">
                Ask Your Business Documents Anything — Get Cited Answers in Seconds
              </h1>

              <p className="sr-only">
                DocsFlow is an AI-powered document intelligence platform that lets businesses search contracts, SOPs, reports, and files using natural language. It provides source-attributed answers with page references, supports PDF, DOCX, XLSX, PPTX, and images, and uses hybrid semantic and keyword search with multi-provider LLM failover. DocsFlow is a multi-tenant SaaS starting at $99/month.
              </p>

              <p className="text-xl text-muted-foreground md:text-2xl/relaxed max-w-3xl mb-12">
                Upload contracts, SOPs, and reports. Ask questions in plain English.
                Every answer includes the exact document, page, and paragraph it came from.
              </p>

              <TypingPromptInput />

              <div className="mt-8 text-center max-w-2xl mx-auto">
                <p className="text-sm text-muted-foreground mb-4 font-medium">
                  Try asking questions like:
                </p>
                <div className="grid gap-3 text-left">
                  <div className="bg-background/60 backdrop-blur-sm border rounded-lg p-3 text-sm">
                    &#x1f4bc; &quot;Show me all contracts signed with Acme Corp in 2023&quot;
                    <div className="text-xs text-primary mt-1">&#x2197; Instant answer with source references</div>
                  </div>
                  <div className="bg-background/60 backdrop-blur-sm border rounded-lg p-3 text-sm">
                    &#x1f4cb; &quot;What&apos;s our return policy for enterprise clients?&quot;
                    <div className="text-xs text-primary mt-1">&#x2197; Exact policy with page numbers</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 mt-12">
                <Button asChild size="lg" className="px-8 py-6 h-auto text-lg font-semibold rounded-xl shadow-lg">
                  <Link href="/signup">Start Free Trial</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-8 py-6 h-auto text-lg rounded-xl">
                  <a href="#contact">Book a Demo</a>
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-12 max-w-2xl mx-auto">
                <div className="text-center p-3">
                  <div className="font-semibold text-foreground">1-5 Day Setup</div>
                  <p className="text-xs text-muted-foreground">White-glove included</p>
                </div>
                <div className="text-center p-3">
                  <div className="font-semibold text-foreground">All File Types</div>
                  <p className="text-xs text-muted-foreground">PDF, Word, Excel, PPT</p>
                </div>
                <div className="text-center p-3">
                  <div className="font-semibold text-foreground">Isolated Workspaces</div>
                  <p className="text-xs text-muted-foreground">Database-level security</p>
                </div>
                <div className="text-center p-3">
                  <div className="font-semibold text-foreground">Custom AI</div>
                  <p className="text-xs text-muted-foreground">Your terminology</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <div id="features">
          <FeaturesSection />
        </div>

        {/* How It Works */}
        <section className="py-20 border-t border-b border-border/50" id="how-it-works" aria-labelledby="how-it-works-heading">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h2 id="how-it-works-heading" className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                  How It Works
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  From first call to production search in 5 business days. Here is the process.
                </p>
              </div>
            </div>
            <div className="grid gap-8 md:grid-cols-3 items-start">
              <div className="flex flex-col items-center space-y-4 text-center p-6 bg-card rounded-xl border">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  1
                </div>
                <h3 className="text-xl font-bold">Discovery Call</h3>
                <p className="text-muted-foreground">
                  30-minute session to understand your document workflows, team size, and the questions your team needs answered.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 bg-card rounded-xl border">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  2
                </div>
                <h3 className="text-xl font-bold">White-Glove Setup</h3>
                <p className="text-muted-foreground">
                  We configure your workspace, upload your documents, train the AI on your terminology, and set up access controls.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 bg-card rounded-xl border">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  3
                </div>
                <h3 className="text-xl font-bold">Team Training &amp; Launch</h3>
                <p className="text-muted-foreground">
                  30-minute live training with your actual documents. Your team starts getting answers on day one.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <div id="use-cases">
          <UseCases />
        </div>

        {/* Testimonials */}
        <div id="testimonials">
          <Testimonials />
        </div>

        {/* FAQ Section */}
        <FAQSection />

        {/* Contact Section */}
        <section id="contact" className="py-20 bg-muted/50 dark:bg-muted/10 border-t border-b border-border/50" aria-labelledby="contact-heading">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-start">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 id="contact-heading" className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                    See DocsFlow on Your Own Documents
                  </h2>
                  <p className="text-muted-foreground md:text-xl">
                    30-minute live demo using your actual files. We will show you the time and cost savings specific to your team.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Secure workspace with role-based access controls</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <span>Hybrid AI search across PDFs, Word, Excel, PowerPoint</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <span>Custom AI trained on your industry terminology</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span>AES-256 encryption, GDPR compliant, data never used for training</span>
                  </div>
                </div>
                <div className="pt-4 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">What to expect:</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>30-minute strategy session tailored to your workflow</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>Live search demo with your actual business documents</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>Custom ROI estimate based on your team size and document volume</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="lg:ml-10">
                <div id="roi-calculator" className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
                  <h3 className="text-xl font-bold text-foreground mb-4">Estimate Your Time Savings</h3>
                  <ROICalculator />
                </div>

                <ContactForm />
              </div>
            </div>
          </div>
        </section>

        {/* Blog / Resources Section */}
        <section className="py-16 border-t border-border/50">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl text-foreground mb-2">
                Resources for Decision-Makers
              </h2>
              <p className="text-muted-foreground">
                Practical guides on AI document search — no jargon, just results.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Link href="/blog/ai-document-search-for-legal-teams" className="group p-6 bg-card border rounded-xl hover:border-primary/30 transition-colors">
                <span className="text-xs font-medium text-primary">Industry Guide</span>
                <h3 className="text-base font-semibold mt-1 group-hover:text-primary transition-colors">AI Document Search for Legal Teams</h3>
                <p className="text-sm text-muted-foreground mt-2">Find clauses in seconds across hundreds of contracts.</p>
              </Link>
              <Link href="/blog/how-to-choose-ai-document-search-platform" className="group p-6 bg-card border rounded-xl hover:border-primary/30 transition-colors">
                <span className="text-xs font-medium text-primary">Buying Guide</span>
                <h3 className="text-base font-semibold mt-1 group-hover:text-primary transition-colors">How to Choose an AI Document Search Platform</h3>
                <p className="text-sm text-muted-foreground mt-2">7-criterion evaluation framework for business buyers.</p>
              </Link>
              <Link href="/blog/docsflow-vs-sharepoint-search" className="group p-6 bg-card border rounded-xl hover:border-primary/30 transition-colors">
                <span className="text-xs font-medium text-primary">Comparison</span>
                <h3 className="text-base font-semibold mt-1 group-hover:text-primary transition-colors">DocsFlow vs SharePoint Search</h3>
                <p className="text-sm text-muted-foreground mt-2">Why keyword search fails and what to use instead.</p>
              </Link>
            </div>
            <div className="text-center mt-8">
              <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
                View all articles &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <TrustBadges />

        <Footer />
      </div>
    </>
  )
}