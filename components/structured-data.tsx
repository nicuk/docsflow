const SITE_URL = 'https://docsflow.app';

const organizationEntity = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "DocsFlow",
  alternateName: "DocsFlow Technologies",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/logo.svg`,
    width: 300,
    height: 100,
  },
  foundingDate: "2023",
  slogan: "Turn Documents Into Instant Answers",
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@docsflow.app",
    contactType: "customer support",
  },
  sameAs: [
    "https://github.com/nicuk/docsflow",
  ],
};

export default function StructuredData() {
  const graphData = {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity,
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "DocsFlow",
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: "DocsFlow",
        alternateName: "DocsFlow AI Document Intelligence",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Document Management",
        operatingSystem: "All",
        url: SITE_URL,
        softwareVersion: "2.1",
        datePublished: "2024-01-15",
        author: { "@id": `${SITE_URL}/#organization` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        offers: {
          "@type": "Offer",
          price: "99.00",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          description: "Professional plan starting at $99/month for 2 users",
          eligibleRegion: ["US", "CA", "GB", "AU", "EU"],
        },
        description:
          "DocsFlow is an AI-powered document intelligence platform that turns your files into instant answers — contracts, SOPs, policies, and more. Save 8+ hours/week per team member.",
        featureList: [
          "AI-powered document search across PDFs, Word, Excel, PowerPoint",
          "Source-attributed answers with page references",
          "Custom AI training on your company terminology",
          "Enterprise-grade security with workspace isolation",
          "Hybrid search combining semantic and keyword matching",
          "Multi-provider LLM failover for high availability",
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graphData) }}
    />
  );
}
