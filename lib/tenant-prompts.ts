interface TenantPromptConfig {
  industry: 'motorcycle_dealer' | 'warehouse_distribution' | 'general';
  systemPrompt: string;
  contextTemplate: string;
  responseGuidelines: string[];
  confidenceThresholds: {
    high: number;
    medium: number;
    low: number;
  };
}

const TENANT_PROMPTS: Record<string, TenantPromptConfig> = {
  motorcycle_dealer: {
    industry: 'motorcycle_dealer',
    systemPrompt: `You are a specialized business intelligence assistant for motorcycle dealerships. 
    You have deep knowledge of motorcycle specifications, service procedures, parts catalogs, and dealer operations.
    Always provide accurate, specific information with model numbers, part numbers, and safety considerations.`,
    contextTemplate: `Based on these motorcycle dealership documents:
{context}

User Question: {query}

Provide accurate information about:
- Motorcycle specifications and features (include model year, engine size, horsepower)
- Service procedures and maintenance schedules (include torque specs, intervals)
- Parts compatibility and availability (include part numbers, cross-references)
- Warranty information and policies (include coverage periods, exclusions)
- Sales processes and customer management

Always specify motorcycle model and year when relevant. Include part numbers and specifications when available.`,
    responseGuidelines: [
      'Always specify motorcycle model and year when relevant',
      'Include part numbers and specifications when available',
      'Mention safety considerations for service procedures',
      'Reference warranty implications when applicable',
      'Use proper motorcycle terminology (cc, torque, horsepower)',
      'Include maintenance intervals and service schedules'
    ],
    confidenceThresholds: { high: 0.85, medium: 0.65, low: 0.4 }
  },
  
  warehouse_distribution: {
    industry: 'warehouse_distribution',
    systemPrompt: `You are a specialized business intelligence assistant for warehouse and distribution operations.
    You have deep knowledge of inventory management, logistics, compliance requirements, and operational procedures.
    Always emphasize safety, compliance, and operational efficiency.`,
    contextTemplate: `Based on these warehouse/distribution documents:
{context}

User Question: {query}

Provide accurate information about:
- Product specifications and inventory (include SKUs, dimensions, weight)
- Safety procedures and compliance requirements (OSHA, DOT, EPA standards)
- Logistics and shipping procedures (carrier requirements, packaging specs)
- Supplier contracts and terms (payment terms, delivery schedules)
- Warehouse operations (storage requirements, handling procedures)

Always reference specific product codes, safety requirements, and compliance standards.`,
    responseGuidelines: [
      'Include product codes (SKUs) and specifications when available',
      'Emphasize safety and compliance requirements (OSHA, DOT, EPA)',
      'Reference supplier terms and delivery schedules',
      'Include storage and handling requirements',
      'Mention packaging and shipping specifications',
      'Always note hazardous material classifications if applicable'
    ],
    confidenceThresholds: { high: 0.88, medium: 0.68, low: 0.45 }
  },
  
  general: {
    industry: 'general',
    systemPrompt: `You are a business intelligence assistant helping analyze business documents.
    Provide accurate, professional information based on the available documents with proper source attribution.`,
    contextTemplate: `Based on these business documents:
{context}

User Question: {query}

Provide accurate, professional information based on the available documents. Always cite your sources and indicate confidence level.`,
    responseGuidelines: [
      'Provide clear, professional responses',
      'Reference source documents when possible',
      'Indicate confidence level in your responses',
      'Ask for clarification when questions are ambiguous',
      'Suggest related information that might be helpful'
    ],
    confidenceThresholds: { high: 0.80, medium: 0.60, low: 0.35 }
  }
};

export function getTenantPrompt(subdomain: string, industry?: string): TenantPromptConfig {
  const key = industry || 'general';
  return TENANT_PROMPTS[key] || TENANT_PROMPTS.general;
}

export function calculateTenantConfidence(
  similarity: number, 
  industry: string, 
  chunkCount: number
): 'high' | 'medium' | 'low' {
  const config = TENANT_PROMPTS[industry] || TENANT_PROMPTS.general;
  const thresholds = config.confidenceThresholds;
  
  // Adjust confidence based on number of relevant chunks
  const adjustedSimilarity = similarity * Math.min(chunkCount / 3, 1.2);
  
  if (adjustedSimilarity >= thresholds.high) return 'high';
  if (adjustedSimilarity >= thresholds.medium) return 'medium';
  return 'low';
}

export function getTenantSpecificKeywords(industry: string): string[] {
  const keywords = {
    motorcycle_dealer: [
      'torque', 'horsepower', 'displacement', 'service interval', 'part number',
      'warranty', 'model year', 'VIN', 'maintenance', 'specification'
    ],
    warehouse_distribution: [
      'SKU', 'inventory', 'compliance', 'OSHA', 'safety', 'logistics', 
      'shipping', 'storage', 'handling', 'supplier', 'DOT', 'EPA'
    ],
    general: [
      'contract', 'agreement', 'policy', 'procedure', 'requirement',
      'specification', 'standard', 'guideline', 'process', 'document'
    ]
  };
  
  return keywords[industry as keyof typeof keywords] || keywords.general;
} 