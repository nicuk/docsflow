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
    downloadUrl: "https://docsflow.app/try",
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
        url: "https://docsflow.app/logo.png"
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
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "847",
      bestRating: "5",
      worstRating: "1"
    },
    review: [
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5"
        },
        author: {
          "@type": "Person",
          name: "Sarah Chen",
          jobTitle: "Operations Director"
        },
        reviewBody: "Saved 12 hours/week. Finally, our whole team can access company knowledge safely. ROI was immediate.",
        datePublished: "2024-07-15"
      },
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5"
        },
        author: {
          "@type": "Person",
          name: "Marcus Thompson",
          jobTitle: "Legal Counsel"
        },
        reviewBody: "Contract analysis that used to take hours now takes minutes. Game-changer for legal teams.",
        datePublished: "2024-07-20"
      }
    ],
    description: "DocsFlow is an AI-powered document intelligence platform that turns your files into instant answers — contracts, SOPs, policies, and more. Save 8+ hours/week per team member. No credit card required.",
    featureList: [
      "AI-powered document search across PDFs, Word, Excel, PowerPoint",
      "Custom AI training on your company terminology",
      "Enterprise-grade security and access controls",
      "Real-time collaboration and insights",
      "White-glove implementation and training",
      "ROI tracking and productivity analytics"
    ],
    screenshot: "https://docsflow.app/screenshot.png",
    video: {
      "@type": "VideoObject",
      name: "DocsFlow Demo - Turn Documents Into Instant Answers",
      description: "See how DocsFlow transforms document chaos into strategic business intelligence",
      thumbnailUrl: "https://docsflow.app/video-thumbnail.jpg",
      uploadDate: "2024-07-01",
      duration: "PT2M30S",
      embedUrl: "https://docsflow.app/demo-video"
    }
  }

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DocsFlow",
    alternateName: "DocsFlow Technologies",
    url: "https://docsflow.app",
    logo: {
      "@type": "ImageObject",
        url: "https://docsflow.app/logo.png",
      width: 300,
      height: 100
    },
    sameAs: [
      "https://twitter.com/docsflow",
      "https://linkedin.com/company/docsflow",
      "https://github.com/docsflow"
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+1-800-DOCSFLOW",
      contactType: "sales",
      availableLanguage: "English"
    },
    foundingDate: "2023",
    numberOfEmployees: "15-50",
    slogan: "Turn Documents Into Instant Answers"
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
    </>
  )
}
