export default function StructuredData() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DocsFlow",
    alternateName: "DocsFlow AI Document Intelligence",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Document Management",
    operatingSystem: "All",
    url: "https://docsflow.app",
    softwareVersion: "2.1",
    releaseNotes: "Enhanced AI accuracy and faster document processing",
    datePublished: "2024-01-15",
    dateModified: new Date().toISOString().split('T')[0],
    author: {
      "@type": "Organization",
      name: "DocsFlow Technologies",
      url: "https://docsflow.app"
    },
    publisher: {
      "@type": "Organization",
      name: "DocsFlow",
      logo: {
        "@type": "ImageObject",
        url: "https://docsflow.app/logo.svg"
      }
    },
    offers: {
      "@type": "Offer",
      price: "99.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
      description: "Professional plan starting at $99/month for 2 users",
      eligibleRegion: ["US", "CA", "GB", "AU", "EU"],
      category: "Business Software"
    },
    description: "DocsFlow is an AI-powered document intelligence platform that turns your files into instant answers — contracts, SOPs, policies, and more. Save 8+ hours/week per team member. No credit card required.",
    featureList: [
      "AI-powered document search across PDFs, Word, Excel, PowerPoint",
      "Custom AI training on your company terminology",
      "Enterprise-grade security and access controls",
      "Real-time collaboration and insights",
      "White-glove implementation and training",
      "ROI tracking and productivity analytics"
    ],
  }

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DocsFlow",
    alternateName: "DocsFlow Technologies",
    url: "https://docsflow.app",
    logo: {
      "@type": "ImageObject",
      url: "https://docsflow.app/logo.svg",
      width: 300,
      height: 100
    },
    foundingDate: "2023",
    slogan: "Turn Documents Into Instant Answers"
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DocsFlow",
    url: "https://docsflow.app",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://docsflow.app/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://docsflow.app"
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  )
}
