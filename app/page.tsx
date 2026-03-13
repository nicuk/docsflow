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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
                  {/* Pain Point Hero */}
                  <div className="bg-red-600 text-white px-8 py-6 rounded-2xl inline-block mb-8 text-center max-w-4xl shadow-lg">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
                      💼 Losing Deals Because You Can't Find the Right File in Time?
                    </h1>
                    <p className="text-lg md:text-xl opacity-95">
                      Every hour your team spends searching is an hour you're not closing deals, onboarding clients, or growing your business.
                    </p>
                  </div>
                  
                  {/* Value Proposition */}
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter mb-6 text-foreground">
                    DocsFlow Instantly Answers Business Questions — From Contracts to SOPs
                  </h2>
                  <p className="text-xl text-muted-foreground md:text-2xl/relaxed max-w-3xl mb-12">
                    Upload your documents. Ask real questions. Get exact answers with page references, fast.
                    Search across 1,000s of files like you're chatting with your smartest team member.
                    <span className="text-green-600 dark:text-green-400 font-bold"> Save 8+ hours per employee, per week — without changing your workflows.</span>
                  </p>

              <TypingPromptInput />
              
              {/* Demo Examples */}
              <div className="mt-8 text-center max-w-2xl mx-auto">
                <p className="text-sm text-muted-foreground mb-4 font-medium">
                  Try asking questions like:
                </p>
                <div className="grid gap-3 text-left">
                  <div className="bg-background/60 backdrop-blur-sm border rounded-lg p-3 text-sm">
                    <span className="text-muted-foreground">💼</span> "Show me all contracts signed with Acme Corp in 2023"
                    <div className="text-xs text-primary mt-1">↳ Instant answer with source references</div>
                  </div>
                  <div className="bg-background/60 backdrop-blur-sm border rounded-lg p-3 text-sm">
                    <span className="text-muted-foreground">📋</span> "What's our return policy for enterprise clients?"
                    <div className="text-xs text-primary mt-1">↳ Exact policy with page numbers</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 mt-16">
                <Button asChild className="flex items-center gap-3 px-8 py-6 h-[70px] bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-xl border-0 relative overflow-hidden group shadow-2xl">
                  <a href="#contact">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/0 via-yellow-200/50 to-yellow-300/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-x-[-100%] group-hover:translate-x-[100%]"></div>
                    <span className="text-2xl relative z-10">📂</span>
                    <div className="flex flex-col items-start relative z-10">
                      <span className="text-lg font-bold text-gray-900">Try It on Your Own Files</span>
                      <span className="text-sm text-gray-700 -mt-0.5">No credit card required</span>
                    </div>
                  </a>
                </Button>
                <Button asChild className="flex items-center gap-3 px-6 py-6 h-[70px] rounded-xl border-2 border-primary bg-transparent hover:bg-primary/5 text-[15px] font-medium text-foreground">
                  <a href="#roi-calculator">
                    <span className="text-xl">📊</span>
                    <div className="flex flex-col items-start">
                      <span className="font-bold">Calculate Your $ ROI Instantly</span>
                      <span className="text-sm text-muted-foreground -mt-0.5">See Your Savings</span>
                    </div>
                  </a>
                </Button>
              </div>
              
              {/* Social Proof & Features */}
              <div className="text-center mt-12 max-w-2xl mx-auto">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-6">
                  <p className="text-sm text-primary font-semibold mb-2">
                    🔥 <span className="text-orange-600 font-bold">Now Available:</span> Join 800+ teams who transformed their document workflows
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enterprise slots available • Priority booking for new implementations
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-background/60 backdrop-blur-sm border rounded-lg p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-500">✅</span>
                      <span className="font-medium">5-Day Implementation</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">White-glove setup included</p>
                  </div>
                  
                  <div className="bg-background/60 backdrop-blur-sm border rounded-lg p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-500">✅</span>
                      <span className="font-medium">All File Types</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">PDFs, Word, Excel, PowerPoint</p>
                  </div>
                  
                  <div className="bg-background/60 backdrop-blur-sm border rounded-lg p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-500">✅</span>
                      <span className="font-medium">Enterprise Security</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">SOC 2 compliant</p>
                  </div>
                  
                  <div className="bg-background/60 backdrop-blur-sm border rounded-lg p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-500">✅</span>
                      <span className="font-medium">Custom AI Training</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">Your terminology & context</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    ⚡ Fast Track Available: Get live in 48 hours for Q4 deals
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cost of Inaction Section */}
        <section className="py-20 bg-red-50 dark:bg-red-950/20 border-t border-b border-red-200/30 dark:border-red-800/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                DocsFlow Clients Save $100,000+ in Year One — Here's the Breakdown
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl font-medium">
                Stop bleeding money. Every day without DocsFlow costs you $296+ in wasted time.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center p-6 bg-card rounded-xl shadow-lg border border-red-500/30 flex flex-col justify-between h-full">
                <div className="text-4xl font-bold text-primary mb-4">$2,720</div>
                <p className="text-sm text-muted-foreground leading-relaxed">Monthly cost of time wasted searching<br/>(8 hrs/week × $85/hr)</p>
              </div>
              
              <div className="text-center p-6 bg-card rounded-xl shadow-lg border border-red-500/30 flex flex-col justify-between h-full">
                <div className="text-4xl font-bold text-primary mb-4">$1,200</div>
                <p className="text-sm text-muted-foreground leading-relaxed">Monthly consultant fees for information<br/>already in your files</p>
              </div>
              
              <div className="text-center p-6 bg-card rounded-xl shadow-lg border border-red-500/30 flex flex-col justify-between h-full">
                <div className="text-4xl font-bold text-primary mb-4">$5,000+</div>
                <p className="text-sm text-muted-foreground leading-relaxed">Lost deals due to slow responses<br/>and missed details</p>
              </div>
            </div>
            
            <div className="text-center bg-card border border-border p-8 rounded-2xl shadow-sm">
              <p className="text-3xl font-bold mb-2 text-foreground">Total Hidden Cost: $8,920+ per month</p>
              <p className="text-lg text-muted-foreground">Your competitors who solve this are gaining a $100,000+ annual advantage</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <div id="features">
          <FeaturesSection />
        </div>

        {/* Business Transformation Process */}
        <section className="py-20 border-t border-b border-border/50" id="how-it-works" aria-labelledby="transformation-process-heading">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h2 id="transformation-process-heading" className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                  From Chaos to Control in 5 Days
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Your time back, fast. See exactly how we eliminate document chaos and get your team productive immediately.
                </p>
              </div>
            </div>
            <div className="space-y-8">
              {/* Top Row - 3 columns */}
              <div className="grid gap-8 md:grid-cols-3 items-start">
                <div className="flex flex-col items-center space-y-4 text-center p-6 bg-card rounded-xl border">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-foreground">
                    <span className="text-2xl">📞</span>
                  </div>
                  <h3 className="text-xl font-bold">Strategy Call — We Calculate Your Document Waste</h3>
                  <p className="text-muted-foreground">
                    30-minute deep-dive to identify exactly how much time and money you're losing to document chaos.
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-4 text-center p-6 bg-card rounded-xl border">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-foreground">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <h3 className="text-xl font-bold">White-Glove Setup — We Upload + Train Your AI</h3>
                  <p className="text-muted-foreground">
                    Our experts handle everything. Upload your files, train the AI on your terminology, set up access controls.
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-4 text-center p-6 bg-card rounded-xl border">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-foreground">
                    <span className="text-2xl">👩‍🏫</span>
                  </div>
                  <h3 className="text-xl font-bold">30-Min Team Training — That's How Easy It Is</h3>
                  <p className="text-muted-foreground">
                    Quick training session with your actual documents. Your team will be productive immediately — it's that simple.
                  </p>
                </div>
              </div>
              
              {/* Bottom Row - 2 columns */}
              <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
                <div className="flex flex-col items-center space-y-4 text-center p-6 bg-card rounded-xl border">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-foreground">
                    <span className="text-2xl">📈</span>
                  </div>
                  <h3 className="text-xl font-bold">Track ROI Weekly — See Usage, Savings, Wins</h3>
                  <p className="text-muted-foreground">
                    Detailed analytics showing time saved, searches completed, and productivity gains across your team.
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-4 text-center p-6 bg-card rounded-xl border">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-foreground">
                    <span className="text-2xl">✅</span>
                  </div>
                  <h3 className="text-xl font-bold">Results Guarantee — Don't Save Time? You Don't Pay</h3>
                  <p className="text-muted-foreground">
                    If you don't save at least 10 hours in your first month, we refund every penny. Zero risk.
                  </p>
                </div>
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

        {/* Investment vs Return ROI Section */}
        <section className="py-20 bg-green-50 dark:bg-green-950/20 border-t border-b border-green-200/30 dark:border-green-800/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                ROI: 30x in 3 Weeks
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl font-medium">
                Starts at $99/mo → Pays for itself in 3 days. Here's exactly how the math works.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Investment Side */}
              <div className="bg-card p-8 rounded-xl shadow-lg border border-red-500/30">
                <h3 className="text-2xl font-bold mb-6 text-center text-primary">Your Investment:</h3>
                <div className="space-y-4">
                  <div className="pricing-row">
                    <span className="pricing-description">Custom Implementation:</span>
                    <span className="pricing-value">$1,000 one-time</span>
                  </div>
                  <div className="pricing-row">
                    <span className="pricing-description">Professional Service:</span>
                    <span className="pricing-value">$99-299/month</span>
                  </div>
                  <div className="pricing-row border-t-2 pt-4">
                    <span className="pricing-description font-semibold text-lg">Total First Year:</span>
                    <span className="pricing-value text-3xl">$2,188-4,588</span>
                  </div>
                </div>
              </div>
              
              {/* Return Side */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-8 rounded-xl shadow-lg border-2 border-green-500/30">
                <h3 className="text-2xl font-bold mb-6 text-center text-primary">Your Return:</h3>
                <div className="space-y-4">
                  <div className="pricing-row">
                    <span className="pricing-description">Time savings (10 hrs/week):</span>
                    <span className="pricing-value">$44,200/year</span>
                  </div>
                  <div className="pricing-row">
                    <span className="pricing-description">Eliminated consultant fees:</span>
                    <span className="pricing-value">$14,400/year</span>
                  </div>
                  <div className="pricing-row">
                    <span className="pricing-description">Faster client responses:</span>
                    <span className="pricing-value">$50,000+ deals</span>
                  </div>
                  <div className="pricing-row border-t-2 pt-4">
                    <span className="pricing-description font-semibold text-lg">Total First Year Value:</span>
                    <span className="pricing-value text-3xl">$108,600+</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* ROI Result */}
            <div className="text-center mt-12 bg-card border border-border p-8 rounded-2xl max-w-4xl mx-auto shadow-sm">
              <p className="text-4xl font-bold mb-4 text-foreground">ROI: 1,500% - 3,000%</p>
              <p className="text-xl mb-2 text-muted-foreground">Investment pays for itself in 2-3 weeks</p>
              <p className="text-base text-muted-foreground">Professional document intelligence that transforms business efficiency</p>
            </div>
          </div>
        </section>

        {/* Contact/Pricing Section */}
        <section id="contact" className="py-20 bg-muted/50 dark:bg-muted/10 border-t border-b border-border/50" aria-labelledby="contact-heading">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-start">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 id="contact-heading" className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                    Book a 30-Minute Call — Find $8,000/Month in Hidden Losses
                  </h2>
                  <p className="text-muted-foreground md:text-xl">
                    9 out of 10 businesses using DocsFlow say: "This paid for itself instantly." See your potential savings.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Transform scattered documents into strategic business assets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <span>Eliminate the $8,920/month hidden cost of document chaos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <span>Custom AI trained on YOUR industry and terminology</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span>White-glove implementation with ongoing success management</span>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✅</span>
                      <span className="font-medium">30-minute strategy session (understand your challenges)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✅</span>
                      <span className="font-medium">Live demo with YOUR actual business documents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✅</span>
                      <span className="font-medium">Custom ROI analysis for your specific situation</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:ml-10">
                <div id="roi-calculator" className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/20 group">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-primary/10 p-2 rounded-lg transition-transform duration-300 group-hover:scale-110">
                      <span className="text-xl">📊</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">See How Much You&#39;re Losing</h3>
                  </div>
                  <ROICalculator />
                </div>

                <ContactForm />
              </div>
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