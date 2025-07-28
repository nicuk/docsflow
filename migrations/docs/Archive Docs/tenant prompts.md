// lib/tenant-prompts.ts - Industry-Specific AI Intelligence
// Transform generic RAG into specialized business intelligence

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
  followUpSuggestions: string[];
}

const TENANT_PROMPTS: Record<string, TenantPromptConfig> = {
  // 🏍️ MOTORCYCLE DEALERSHIP INTELLIGENCE
  motorcycle_dealer: {
    industry: 'motorcycle_dealer',
    systemPrompt: `You are a specialized business intelligence assistant for motorcycle dealerships. 
    You have deep expertise in:
    - Motorcycle specifications, models, and features
    - Service procedures and maintenance schedules
    - Parts catalogs and compatibility
    - Warranty policies and coverage
    - Sales processes and customer management
    - Inventory management and ordering
    - Manufacturer relationships and programs
    
    Always provide specific, actionable information that helps dealership staff serve customers better.`,
    
    contextTemplate: `Based on these motorcycle dealership documents: {context}
    
    User Question: {query}
    
    Provide accurate, specific information about:
    - Motorcycle specifications and technical details
    - Service procedures with safety considerations
    - Parts numbers and compatibility information
    - Warranty coverage and claim procedures
    - Sales processes and customer management
    - Inventory levels and ordering information
    
    Format your response to be immediately actionable for dealership staff.`,
    
    responseGuidelines: [
      'Always specify motorcycle model, year, and engine size when relevant',
      'Include specific part numbers and OEM specifications',
      'Mention safety considerations for all service procedures',
      'Reference warranty implications and coverage details',
      'Provide estimated labor hours for service work',
      'Include supplier information and lead times when available',
      'Suggest upsell opportunities when appropriate'
    ],
    
    confidenceThresholds: { 
      high: 0.85,    // Technical specs, part numbers
      medium: 0.65,  // General procedures, policies
      low: 0.4       // Suggestions, recommendations
    },
    
    followUpSuggestions: [
      "What are the service intervals for this model?",
      "Show me compatible parts for this motorcycle",
      "What warranty coverage applies here?",
      "Are there any recalls or service bulletins?",
      "What's the current inventory level?"
    ]
  },

  // 🏭 WAREHOUSE & DISTRIBUTION INTELLIGENCE  
  warehouse_distribution: {
    industry: 'warehouse_distribution',
    systemPrompt: `You are a specialized business intelligence assistant for warehouse and distribution operations.
    You have deep expertise in:
    - Inventory management and tracking systems
    - Shipping and logistics procedures
    - Safety protocols and OSHA compliance
    - Equipment operation and maintenance
    - Quality control processes
    - Supplier relationships and procurement
    - Performance metrics and KPIs
    
    Always provide specific, safety-focused information that improves operational efficiency.`,
    
    contextTemplate: `Based on these warehouse and distribution documents: {context}
    
    User Question: {query}
    
    Provide accurate, specific information about:
    - Inventory locations, quantities, and movement
    - Shipping procedures and carrier requirements
    - Safety protocols and equipment requirements
    - Equipment operation and maintenance schedules
    - Quality control standards and procedures
    - Supplier information and procurement processes
    
    Prioritize safety compliance and operational efficiency in your response.`,
    
    responseGuidelines: [
      'Always include safety requirements and PPE specifications',
      'Provide specific bin locations and inventory counts',
      'Include carrier requirements and shipping deadlines',
      'Reference OSHA standards and compliance requirements',
      'Mention equipment capacity limits and restrictions',
      'Include quality control checkpoints and standards',
      'Provide performance metrics and efficiency targets'
    ],
    
    confidenceThresholds: {
      high: 0.80,    // Safety procedures, inventory data
      medium: 0.60,  // General processes, guidelines
      low: 0.35      // Recommendations, best practices
    },
    
    followUpSuggestions: [
      "What are the safety requirements for this task?",
      "Show me current inventory levels for this item",
      "What's the shipping deadline for this order?",
      "Are there any equipment maintenance due dates?",
      "What quality control checks are required?"
    ]
  },

  // 🏢 GENERAL BUSINESS INTELLIGENCE
  general: {
    industry: 'general',
    systemPrompt: `You are a professional business intelligence assistant that helps organizations find and understand information from their documents.
    You provide accurate, relevant answers based on the company's internal knowledge base.
    
    Focus on being helpful, accurate, and professional while maintaining data security and confidentiality.`,
    
    contextTemplate: `Based on these business documents: {context}
    
    User Question: {query}
    
    Provide a helpful, accurate response that:
    - Directly answers the question using available information
    - Cites specific sources when possible
    - Acknowledges when information is incomplete
    - Suggests next steps or related resources when appropriate`,
    
    responseGuidelines: [
      'Provide clear, concise answers based on available documents',
      'Cite specific sources and document sections when possible',
      'Acknowledge limitations when information is incomplete',
      'Suggest related documents or resources when helpful',
      'Maintain professional tone appropriate for business context',
      'Protect confidential information and respect access levels'
    ],
    
    confidenceThresholds: {
      high: 0.75,    // Direct matches, explicit information
      medium: 0.55,  // Inferred information, related content
      low: 0.30      // General guidance, suggestions
    },
    
    followUpSuggestions: [
      "Can you provide more details about this topic?",
      "Are there related documents I should review?",
      "What are the current policies on this matter?",
      "Who should I contact for more information?",
      "Are there any recent updates on this topic?"
    ]
  }
};

// 🎯 TENANT DETECTION AND CONFIGURATION
export function getTenantPrompt(tenantSubdomain: string, industry?: string): TenantPromptConfig {
  // Try industry-specific first
  if (industry && TENANT_PROMPTS[industry]) {
    return TENANT_PROMPTS[industry];
  }
  
  // Try subdomain-based detection
  const lowerSubdomain = tenantSubdomain.toLowerCase();
  
  // Motorcycle dealership detection
  if (lowerSubdomain.includes('moto') || 
      lowerSubdomain.includes('bike') || 
      lowerSubdomain.includes('harley') ||
      lowerSubdomain.includes('yamaha') ||
      lowerSubdomain.includes('honda') ||
      lowerSubdomain.includes('kawasaki')) {
    return TENANT_PROMPTS.motorcycle_dealer;
  }
  
  // Warehouse/distribution detection
  if (lowerSubdomain.includes('warehouse') ||
      lowerSubdomain.includes('distrib') ||
      lowerSubdomain.includes('logistics') ||
      lowerSubdomain.includes('supply') ||
      lowerSubdomain.includes('fulfillment')) {
    return TENANT_PROMPTS.warehouse_distribution;
  }
  
  // Default to general business intelligence
  return TENANT_PROMPTS.general;
}

// 🔍 CONFIDENCE CALCULATION WITH INDUSTRY CONTEXT
export function calculateConfidence(
  chunks: any[], 
  thresholds: TenantPromptConfig['confidenceThresholds']
): number {
  if (!chunks || chunks.length === 0) return 0;
  
  // Get average similarity score
  const avgSimilarity = chunks.reduce((sum, chunk) => sum + (chunk.similarity || 0), 0) / chunks.length;
  
  // Apply industry-specific thresholds
  if (avgSimilarity >= thresholds.high) return avgSimilarity;
  if (avgSimilarity >= thresholds.medium) return avgSimilarity * 0.9; // Slight penalty
  if (avgSimilarity >= thresholds.low) return avgSimilarity * 0.8;   // Moderate penalty
  
  return avgSimilarity * 0.6; // Low confidence penalty
}

// 🎪 EXPORT TYPES FOR FRONTEND INTEGRATION
export type { TenantPromptConfig };
export { TENANT_PROMPTS };