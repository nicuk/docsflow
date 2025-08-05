import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "How does DocsFlow work with PDF contracts?",
    answer: "DocsFlow automatically extracts and indexes text from PDFs, including contracts, invoices, and reports. Our AI understands contract terms, dates, and key clauses, allowing you to ask questions like 'What's our cancellation policy?' and get exact answers with page references."
  },
  {
    question: "Is my business data secure with DocsFlow?",
    answer: "Yes, we use enterprise-grade security including AES-256 encryption, SOC 2 compliance, and GDPR compliance. Your documents are processed securely and never used to train public AI models. All data remains in your controlled environment."
  },
  {
    question: "How quickly can my team start using DocsFlow?",
    answer: "Most teams are productive within 30 minutes. Upload your documents, and our AI immediately starts understanding your content. No complex training or setup required - just drag, drop, and start asking questions."
  },
  {
    question: "What file types does DocsFlow support?",
    answer: "DocsFlow works with PDFs, Word documents, Excel spreadsheets, PowerPoint presentations, and text files. We automatically process and index all content, making everything searchable through natural language questions."
  },
  {
    question: "Can I control who sees which documents?",
    answer: "Absolutely. DocsFlow includes granular access controls. You can set permissions by department, role, or individual user. Sales sees customer data, Finance sees reports, HR sees policies - everyone gets exactly what they need, nothing more."
  },
  {
    question: "How much does DocsFlow cost?",
    answer: "DocsFlow starts at $99/month for up to 2 users and includes unlimited document uploads, AI search, and basic access controls. Enterprise plans with advanced features and more users are available. All plans include a 30-day money-back guarantee."
  }
]

function FAQSchema() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }

  return (
    <script 
      type="application/ld+json" 
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} 
    />
  )
}

export default function FAQSection() {
  return (
    <>
      <FAQSchema />
      <section className="py-20 bg-muted/30 dark:bg-muted/5 border-t border-b border-border/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground mb-2">
                Frequently Asked Questions
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                Everything You Need to Know
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Get answers to common questions about DocsFlow's AI document intelligence platform.
              </p>
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border rounded-lg px-6 bg-background/60 backdrop-blur-sm"
                >
                  <AccordionTrigger className="text-left hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </>
  )
}
