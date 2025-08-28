/**
 * Feature flags for RAG system enhancements
 * Allows gradual rollout and quick rollback of new features
 */

export interface FeatureConfig {
  enabled: boolean;
  tenants?: string[];
  percentage?: number;
  description: string;
}

export const RAG_FEATURES: Record<string, FeatureConfig> = {
  MULTIMODAL_PARSING: {
    enabled: process.env.FF_MULTIMODAL_PARSING === 'true',
    tenants: process.env.FF_MULTIMODAL_TENANTS?.split(',').map(t => t.trim()) || [],
    percentage: parseInt(process.env.FF_MULTIMODAL_PCT || '0'),
    description: 'Enable advanced multimodal document parsing with table and image extraction'
  },
  KNOWLEDGE_GRAPH: {
    enabled: process.env.FF_KG === 'true',
    tenants: process.env.FF_KG_TENANTS?.split(',').map(t => t.trim()) || [],
    percentage: parseInt(process.env.FF_KG_PCT || '0'),
    description: 'Enable knowledge graph construction and hybrid search'
  },
  VLM_QUERIES: {
    enabled: process.env.FF_VLM === 'true',
    tenants: process.env.FF_VLM_TENANTS?.split(',').map(t => t.trim()) || [],
    percentage: parseInt(process.env.FF_VLM_PCT || '0'),
    description: 'Enable vision-language model for multimodal queries'
  },
  BATCH_PROCESSING: {
    enabled: process.env.FF_BATCH === 'true',
    tenants: process.env.FF_BATCH_TENANTS?.split(',').map(t => t.trim()) || [],
    percentage: parseInt(process.env.FF_BATCH_PCT || '0'),
    description: 'Enable batch document processing for improved throughput'
  }
};

/**
 * Check if a feature is enabled for a specific tenant
 */
export function isFeatureEnabled(feature: keyof typeof RAG_FEATURES, tenantId: string): boolean {
  const config = RAG_FEATURES[feature];
  
  // Feature globally disabled
  if (!config?.enabled) {
    return false;
  }
  
  // Check if tenant is in whitelist
  if (config.tenants && config.tenants.length > 0) {
    return config.tenants.includes(tenantId);
  }
  
  // Check percentage rollout
  if (config.percentage && config.percentage > 0) {
    const hash = hashCode(tenantId);
    return (Math.abs(hash) % 100) < config.percentage;
  }
  
  // If enabled but no specific tenants or percentage, it's enabled for all
  return true;
}

/**
 * Simple hash function for consistent tenant bucketing
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Get all enabled features for a tenant
 */
export function getEnabledFeatures(tenantId: string): string[] {
  return Object.keys(RAG_FEATURES).filter(feature => 
    isFeatureEnabled(feature as keyof typeof RAG_FEATURES, tenantId)
  );
}

/**
 * Log feature flag status for debugging
 */
export function logFeatureStatus(tenantId: string): void {
  console.log(`Feature flags for tenant ${tenantId}:`);
  Object.entries(RAG_FEATURES).forEach(([feature, config]) => {
    const enabled = isFeatureEnabled(feature as keyof typeof RAG_FEATURES, tenantId);
    console.log(`  ${feature}: ${enabled ? '✅' : '❌'} - ${config.description}`);
  });
}
