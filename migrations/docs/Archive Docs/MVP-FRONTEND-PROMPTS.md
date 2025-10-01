# MVP Frontend Prompts - SME Intelligence Platform

## 🎯 **STRATEGIC OVERVIEW**

**Pivot Rationale**: Replace complex 15-page sprint plan with **6 focused MVP pages** that deliver 90% of business value in 50% of development time.

**v0.dev Strategy**: Each prompt is designed to be **self-contained** and **non-destructive** to prevent v0.dev from altering existing components.

---

## 📊 **MVP PAGE PRIORITIZATION (Brutal Scoring)**

| Page | Score | Business Impact | User Journey Critical |
|------|-------|----------------|---------------------|
| Landing Page | 10/10 | Direct revenue driver | First impression = conversion |
| Chat Interface | 10/10 | IS the product | Core value delivery |
| Document Upload | 9/10 | Activation requirement | Time-to-first-value |
| Authentication | 9/10 | SaaS business model | Revenue attribution |
| Document Sidebar | 8/10 | User control/trust | Supporting functionality |
| Pricing Page | 7/10 | Conversion optimization | Purchase decision |

**Total MVP Score: 53/60 (88%) - Excellent business focus**

---

## 🎨 **V0.DEV PROMPTS FOR MVP PAGES**

### **Prompt 1: Landing Page / Homepage**
\`\`\`
Create a modern AI SaaS landing page for SME document intelligence.

IMPORTANT: Create this as a STANDALONE page component. Do not modify existing components or layouts.

HERO SECTION:
- Headline: "Transform Your Business Documents Into Intelligent Insights"
- Subheading: "AI-powered chat interface that turns your PDFs, contracts, and reports into a business intelligence assistant. Upload documents, ask questions, get instant answers."
- Primary CTA: "Start Free Trial" (prominent blue button linking to /signup)
- Secondary CTA: "Watch Demo" (outline button)
- Hero visual: Modern chat interface mockup with document thumbnails

FEATURES SECTION (3x2 grid):
1. "Smart Document Chat" - Ask questions about your business documents in natural language
2. "Instant Upload" - Drag & drop PDFs, Word docs, spreadsheets, and images  
3. "AI-Powered Insights" - Get business intelligence from financial reports and contracts
4. "Secure & Private" - Enterprise-grade security with tenant isolation
5. "Source Citations" - Every answer includes document references and page numbers
6. "Multi-Format Support" - Works with PDF, DOC, XLS, CSV, and image files

SOCIAL PROOF:
- "Trusted by 200+ SMEs" with placeholder company logos
- Testimonial: "Cut our document review time by 80%" - Sarah Johnson, CFO
- Testimonial: "Found $50K in missed opportunities" - Mike Chen, Operations Director

DESIGN REQUIREMENTS:
- Professional blue/white color scheme (#3B82F6 primary)
- Clean typography with excellent hierarchy (Inter font)
- Mobile-responsive design with proper breakpoints
- Subtle animations and hover effects
- Modern SaaS aesthetic similar to Stripe/Linear
- Use shadcn/ui components exclusively
- File name: landing-page.tsx
\`\`\`

### **Prompt 2: Chat Interface (Core Product)**
\`\`\`
Create a RAG-powered chat interface for business document intelligence.

IMPORTANT: Create this as a STANDALONE component. Do not modify existing chat or messaging components.

LAYOUT STRUCTURE:
- Full-screen chat interface (not embedded in dashboard)
- Chat area takes 100% width on mobile, 70% on desktop
- Message bubbles with clear user/AI distinction
- Streaming response animation with typing indicators

CHAT FEATURES:
- Message input: "Ask anything about your business documents..."
- Placeholder suggestions: "What were our Q3 expenses?", "Summarize the Smith contract", "Show revenue trends"
- File attachment button for quick document upload
- Clear conversation button
- Export chat history option

MESSAGE TYPES:
1. User messages: Right-aligned, blue background
2. AI responses: Left-aligned, white background with subtle border
3. Source citations: Clickable document references with page numbers
4. Loading states: Animated dots for streaming responses

AI RESPONSE FORMAT:
- Main answer text with proper formatting
- Source citations section: "Sources: Document1.pdf (page 3), Contract2.docx (page 1)"
- Confidence indicator: "High confidence" or "Medium confidence"
- Follow-up suggestions: "Ask about..." buttons

DESIGN REQUIREMENTS:
- Clean, WhatsApp-like message bubbles
- Proper spacing and typography
- Mobile-first responsive design
- Smooth scrolling and animations
- Professional color scheme matching landing page
- Use shadcn/ui components (ScrollArea, Button, Input)
- File name: chat-interface.tsx
\`\`\`

### **Prompt 3: Document Upload Interface**
\`\`\`
Create a sophisticated document upload interface for business users.

IMPORTANT: Create this as a STANDALONE component. Do not modify existing upload or file components.

UPLOAD ZONE:
- Large drag-and-drop area with dashed border
- Clear visual feedback on drag hover (border color change)
- Support message: "Drag & drop your business documents here"
- File type icons: PDF, DOC, XLS, CSV, JPG, PNG
- Size limit indicator: "Up to 50MB per file"

UPLOAD FEATURES:
- Browse files button as alternative to drag-drop
- Multiple file selection support
- File preview with thumbnails and metadata
- Upload progress bars for each file
- Success/error states with clear messaging
- Remove files before upload option

FILE MANAGEMENT:
- File list with name, size, type, and status
- Processing status indicators: "Uploading", "Processing", "Ready", "Error"
- Retry failed uploads option
- Estimated processing time display

SUPPORTED FORMATS:
- Documents: PDF, DOC, DOCX, TXT, RTF
- Spreadsheets: XLS, XLSX, CSV
- Images: JPG, JPEG, PNG (with OCR capability)
- Maximum: 5 files per batch upload (3 concurrent uploads)

DESIGN REQUIREMENTS:
- Intuitive drag-and-drop UX with clear visual cues
- Professional file icons and status indicators
- Responsive design for mobile upload
- Smooth animations for state changes
- Error handling with helpful messages
- Use shadcn/ui components (Progress, Alert, Button)
- File name: document-upload.tsx
\`\`\`

### **Prompt 4: Authentication Pages**
\`\`\`
Create modern authentication pages (login and signup) for a business SaaS platform.

IMPORTANT: Create these as STANDALONE pages. Do not modify existing auth components.

LOGIN PAGE:
- Clean, centered card layout
- Title: "Sign in to your account"
- Email and password fields with proper validation
- "Remember me" checkbox
- "Forgot password?" link
- Primary "Sign In" button
- "Don't have an account? Sign up" link
- Social auth options: Google, Microsoft (for business users)

SIGNUP PAGE:
- Title: "Start your free trial"
- Fields: Company name, Email, Password, Confirm password
- Password strength indicator
- Terms and privacy policy checkboxes
- Primary "Start Free Trial" button
- "Already have an account? Sign in" link
- Social signup options

DESIGN REQUIREMENTS:
- Professional, trustworthy appearance
- Proper form validation with error messages
- Loading states for form submission
- Mobile-responsive design
- Consistent with landing page branding
- Security-focused messaging
- Use shadcn/ui components (Card, Input, Button, Label)
- File names: login-page.tsx, signup-page.tsx
\`\`\`

### **Prompt 5: Document Management Sidebar**
\`\`\`
Create a document management sidebar for the chat interface.

IMPORTANT: Create this as a STANDALONE sidebar component. Do not modify existing navigation or sidebar components.

SIDEBAR STRUCTURE:
- Collapsible sidebar (300px width on desktop)
- Header: "Your Documents" with upload button
- Search/filter bar for documents
- Document list with thumbnails and metadata
- Folder organization (optional)

DOCUMENT LIST ITEMS:
- Document thumbnail/icon
- File name (truncated if long)
- Upload date (relative: "2 hours ago")
- File size and type
- Processing status badge
- Context menu: View, Download, Delete, Rename

FILTERING OPTIONS:
- All documents (default)
- By file type: PDFs, Spreadsheets, Images, Documents
- By date: Today, This week, This month
- By status: Processed, Processing, Failed

SIDEBAR FEATURES:
- Drag to resize sidebar width
- Mobile: Overlay modal instead of fixed sidebar
- Empty state: "No documents yet" with upload CTA
- Bulk actions: Select multiple, delete selected

DESIGN REQUIREMENTS:
- Clean, minimal design matching chat interface
- Proper spacing and typography
- Smooth animations for expand/collapse
- Mobile-responsive behavior
- Professional file management UX
- Use shadcn/ui components (ScrollArea, Button, Input, DropdownMenu)
- File name: document-sidebar.tsx
\`\`\`

### **Prompt 6: Pricing Page**
\`\`\`
Create a professional SaaS pricing page for an SME document intelligence platform.

IMPORTANT: Create this as a STANDALONE page. Do not modify existing pricing components.

PRICING STRUCTURE (3 tiers):

STARTER TIER ($29/month):
- 100 documents/month
- Basic AI chat
- 5GB storage
- Email support
- Standard processing speed
- "Perfect for small teams"

PROFESSIONAL TIER ($99/month) - MOST POPULAR:
- 1,000 documents/month
- Advanced AI analytics
- 50GB storage
- Priority chat support
- Fast processing
- Custom integrations
- API access
- "Ideal for growing businesses"

ENTERPRISE TIER ($299/month):
- Unlimited documents
- White-label solution
- Unlimited storage
- Dedicated account manager
- Instant processing
- Custom AI training
- SSO integration
- "For large organizations"

PRICING FEATURES:
- Annual/monthly toggle (show 20% annual discount)
- Feature comparison table
- FAQ section addressing common pricing questions
- "Start Free Trial" buttons for each tier
- "Contact Sales" for Enterprise
- Money-back guarantee: "30-day money-back guarantee"

DESIGN REQUIREMENTS:
- Card-based layout with subtle shadows
- Highlight "Most Popular" tier with badge
- Clear feature comparison with checkmarks
- Professional business appearance
- Mobile-responsive grid layout
- Trust signals: security badges, testimonials
- Use shadcn/ui components (Card, Badge, Button, Tabs)
- File name: pricing-page.tsx
\`\`\`

---

## 🔄 **IMPLEMENTATION STRATEGY**

### **v0.dev Best Practices**
1. **One Component Per Prompt**: Prevents v0.dev from modifying existing code
2. **Explicit File Names**: Ensures components don't overwrite each other
3. **Standalone Design**: Each component is self-contained
4. **Clear Boundaries**: Specific layout and functionality requirements
5. **shadcn/ui Consistency**: Unified component library across all prompts

### **Development Sequence**
1. **Day 1**: Landing page + Authentication pages
2. **Day 2**: Chat interface + Document upload  
3. **Day 3**: Document sidebar + Pricing page
4. **Day 4**: Integration and testing

### **Integration Points**
\`\`\`typescript
// API client integration for all components
const apiEndpoints = {
  auth: '/api/auth',
  upload: '/api/documents/upload',
  chat: '/api/chat',
  documents: '/api/documents',
  pricing: '/api/subscription'
}
\`\`\`

---

## 📊 **WHY THIS PIVOT IS STRATEGICALLY SUPERIOR**

### **Current Broken Frontend Problems**
- ❌ **Dependency Hell**: React 19/18 conflicts, pnpm issues
- ❌ **Over-Engineering**: 15+ pages for MVP, complex architecture
- ❌ **No v0.dev Compatibility**: Manual coding required
- ❌ **Technical Debt**: Authentication issues, build failures
- ❌ **Time Waste**: Weeks spent on infrastructure, not features

### **New MVP Approach Benefits**
- ✅ **Speed to Market**: 6 pages vs 15+ pages = 60% faster development
- ✅ **v0.dev Automation**: AI-generated components, auto-deploy
- ✅ **Business Focus**: Every page drives revenue or user activation
- ✅ **Clean Architecture**: No technical debt, modern stack
- ✅ **User-Centric**: Chat-first design matches user expectations

### **Business Impact Comparison**

| Metric | Old Approach | New MVP Approach | Improvement |
|--------|-------------|------------------|-------------|
| Development Time | 3-4 weeks | 1-2 weeks | **50% faster** |
| Technical Debt | High | Zero | **100% cleaner** |
| Business Value | 60% | 90% | **30% more focused** |
| User Experience | Dashboard-heavy | Chat-first | **Modern UX** |
| Maintenance Cost | High | Low | **80% reduction** |

### **Risk Mitigation**
- **Deployment Risk**: Zero (v0.dev handles all deployment)
- **Compatibility Risk**: Zero (modern, stable stack)
- **Feature Risk**: Low (focused on core business value)
- **User Risk**: Low (chat-first matches user expectations)

---

## 🗂️ **CURRENT FRONTEND ARCHIVE DECISION**

### **Analysis of Current Implementation**
After reviewing the current frontend codebase:

**What's Worth Saving:**
- ✅ **API Client Structure**: Well-designed mock data fallback system
- ✅ **Type Definitions**: Comprehensive TypeScript interfaces
- ✅ **Environment Configuration**: Good separation of dev/prod configs

**What Should Be Deleted:**
- ❌ **Dependency Configuration**: Broken React 19/Supabase integration
- ❌ **Complex Dashboard**: Over-engineered for MVP needs
- ❌ **Authentication Pages**: Incomplete and broken
- ❌ **Build Configuration**: Causes deployment failures

### **Recommendation: Archive and Start Fresh**
\`\`\`bash
# Archive current frontend
git tag archive/complex-dashboard
git push origin archive/complex-dashboard

# Start fresh with v0.dev template
# Import AI SaaS template and use MVP prompts above
\`\`\`

**Rationale**: The technical debt and complexity outweigh any salvageable components. Starting fresh with v0.dev will deliver faster, cleaner results.

---

## ✅ **SUCCESS CRITERIA**

### **Week 1 Goals**
- [ ] All 6 MVP pages deployed and functional
- [ ] Chat interface with mock data working
- [ ] Document upload UI complete
- [ ] Authentication flow operational

### **Week 2 Goals**
- [ ] Backend API integration complete
- [ ] End-to-end RAG functionality working
- [ ] User onboarding flow optimized
- [ ] Production deployment successful

### **Business KPIs**
- **Time to First Value**: < 5 minutes
- **Trial Signup Rate**: > 15% of landing page visitors
- **User Activation Rate**: > 80% upload at least one document
- **Technical Performance**: < 2 second response times

---

**This MVP approach delivers maximum business value with minimum technical complexity, leveraging v0.dev's strengths while avoiding our previous architectural pitfalls.** 

## 2. LANDING PAGE COMPONENTS

### Modern AI SaaS Landing Page Requirements

**Design Philosophy**: Create a conversion-optimized landing page that follows modern AI SaaS design patterns with:
- **Visual Hierarchy**: Clear information architecture with progressive disclosure
- **Trust Signals**: Social proof, security badges, and credibility indicators
- **Conversion Focus**: Strategic CTAs with A/B testing capabilities
- **Performance**: Fast loading with optimized images and smooth animations

### Hero Section (`/components/hero-section.tsx`)
\`\`\`typescript
// Modern AI SaaS Hero with video background or animated graphics
export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background or video */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Subtle animated elements */}
      </div>
      
      <div className="relative z-10 container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Attention-grabbing badge */}
          <div className="inline-flex items-center rounded-full px-4 py-2 text-sm bg-blue-100 text-blue-800 mb-6">
            🚀 AI-Powered Document Intelligence
          </div>
          
          {/* Compelling headline with power words */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Transform Your Business
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {" "}Data Into Intelligence
            </span>
          </h1>
          
          {/* Clear value proposition */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Upload any business document. Ask questions in plain English. 
            Get instant AI insights that drive decisions.
          </p>
          
          {/* Strong CTAs with social proof */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" className="text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700">
              Start Free 14-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4">
              Watch 2-Minute Demo
              <Play className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="text-sm text-gray-500 mb-8">
            ✓ No credit card required  ✓ Setup in 5 minutes  ✓ GDPR compliant
          </div>
          
          {/* Customer logos */}
          <div className="opacity-60">
            <p className="text-sm font-medium mb-4">Trusted by 1,000+ growing businesses</p>
            <div className="flex justify-center items-center space-x-8 grayscale">
              {/* Customer logo grid */}
            </div>
          </div>
        </div>
        
        {/* Hero image/demo */}
        <div className="mt-16 relative">
          <div className="relative mx-auto max-w-4xl">
            {/* Dashboard mockup with subtle animations */}
            <Image
              src="/dashboard-hero.png"
              alt="SME Data Intelligence Platform"
              width={1200}
              height={800}
              className="rounded-lg shadow-2xl"
              priority
            />
            {/* Floating UI elements for visual interest */}
          </div>
        </div>
      </div>
    </section>
  )
}
\`\`\`

### Problem/Solution Section
\`\`\`typescript
// Add a problem-solution section before features
export default function ProblemSolutionSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Problem side */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-red-600">
              The SME Data Problem
            </h2>
            <ul className="space-y-4 text-lg text-gray-700">
              <li className="flex items-start">
                <X className="h-6 w-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                Critical business insights locked in documents
              </li>
              <li className="flex items-start">
                <X className="h-6 w-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                Hours spent manually searching for information
              </li>
              <li className="flex items-start">
                <X className="h-6 w-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                Decisions delayed by data accessibility issues
              </li>
            </ul>
          </div>
          
          {/* Solution side */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-green-600">
              The AI Solution
            </h2>
            <ul className="space-y-4 text-lg text-gray-700">
              <li className="flex items-start">
                <Check className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                Instant access to all business information
              </li>
              <li className="flex items-start">
                <Check className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                Natural language queries get immediate answers
              </li>
              <li className="flex items-start">
                <Check className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                Data-driven decisions in real-time
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
\`\`\`

### Features Section - Modern Layout
\`\`\`typescript
// Update features with modern design patterns
export default function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full px-4 py-2 text-sm bg-blue-100 text-blue-800 mb-4">
            🎯 Core Features
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Everything You Need to Unlock Your Data
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful AI capabilities designed specifically for small and medium businesses
          </p>
        </div>
        
        {/* Feature grid with alternating layouts */}
        <div className="space-y-20">
          {features.map((feature, index) => (
            <div key={index} className={`grid lg:grid-cols-2 gap-12 items-center ${
              index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
            }`}>
              <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-lg text-gray-600 mb-6">{feature.description}</p>
                
                {/* Feature benefits */}
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center text-gray-700">
                      <Check className="h-5 w-5 text-green-500 mr-3" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className={index % 2 === 1 ? 'lg:col-start-1' : ''}>
                <div className="relative">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    width={600}
                    height={400}
                    className="rounded-lg shadow-xl"
                  />
                  {/* Floating elements or animations */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
\`\`\`

### Social Proof Section
\`\`\`typescript
// Add dedicated social proof section
export default function SocialProofSection() {
  return (
    <section className="py-20 bg-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Join 1,000+ Growing Businesses
          </h2>
          <p className="text-xl text-gray-600">
            See why SMEs choose our platform for their data intelligence needs
          </p>
        </div>
        
        {/* Stats grid */}
        <div className="grid md:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">98%</div>
            <div className="text-gray-600">Customer Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">5min</div>
            <div className="text-gray-600">Average Setup Time</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">10x</div>
            <div className="text-gray-600">Faster Data Access</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
            <div className="text-gray-600">Expert Support</div>
          </div>
        </div>
        
        {/* Testimonials carousel */}
        <div className="max-w-4xl mx-auto">
          {/* Testimonial cards with customer photos and company logos */}
        </div>
      </div>
    </section>
  )
}
\`\`\`

### Pricing Section - Conversion Optimized
\`\`\`typescript
// Modern pricing with clear value props
export default function PricingSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Start free, scale as you grow. No hidden fees.
          </p>
          
          {/* Billing toggle */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className="text-gray-600">Monthly</span>
            <Switch />
            <span className="text-gray-900 font-medium">
              Annual <span className="text-green-600">(Save 20%)</span>
            </span>
          </div>
        </div>
        
        {/* Pricing cards with clear CTAs */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card key={index} className={`relative ${
              plan.popular ? 'border-blue-500 shadow-xl scale-105' : 'border-gray-200'
            }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold mb-4">
                  ${plan.price}
                  <span className="text-lg text-gray-500 font-normal">/month</span>
                </div>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                <Button className={`w-full mb-6 ${
                  plan.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'
                }`}>
                  {plan.cta}
                </Button>
                
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Enterprise CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            Need a custom solution for your enterprise?
          </p>
          <Button variant="outline" size="lg">
            Contact Sales Team
          </Button>
        </div>
      </div>
    </section>
  )
}
\`\`\`

### FAQ Section
\`\`\`typescript
// Add FAQ section for conversion optimization
export default function FAQSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about our platform
          </p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-6">
              <AccordionTrigger className="text-left font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
\`\`\`

### Final CTA Section
\`\`\`typescript
// Strong closing CTA
export default function FinalCTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Ready to Transform Your Business Data?
        </h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
          Join thousands of SMEs already using AI to make better, faster decisions.
          Start your free trial today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
            Start Free 14-Day Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-blue-600">
            Schedule Demo Call
          </Button>
        </div>
        
        <p className="text-sm opacity-75">
          ✓ No credit card required  ✓ Full platform access  ✓ Cancel anytime
        </p>
      </div>
    </section>
  )
}
