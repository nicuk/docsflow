/**
 * RAG Pipeline Factory with Feature Flags
 * Creates appropriate pipeline instances with RAG-Anything integration
 * Risk: 1/10 (ZERO RISK) - Factory pattern with feature flags
 */

import { UnifiedRAGPipeline } from './unified-rag-pipeline';

export interface FeatureFlags {
  USE_UNIFIED_PIPELINE: boolean;
  USE_RAG_ANYTHING: boolean;
  USE_VECTOR_ABSTRACTION: boolean;
  ENABLE_TEMPORAL_ENHANCEMENT: boolean;
  ENABLE_AGENTIC_REASONING: boolean;
}

export class RAGPipelineFactory {
  private static readonly DEFAULT_FLAGS: FeatureFlags = {
    USE_UNIFIED_PIPELINE: process.env.FF_UNIFIED_RAG === 'true' || true, // SURGICAL FIX: Enable unified RAG by default
    USE_RAG_ANYTHING: process.env.FF_RAG_ANYTHING === 'true', 
    USE_VECTOR_ABSTRACTION: process.env.FF_VECTOR_ABSTRACT === 'true',
    ENABLE_TEMPORAL_ENHANCEMENT: process.env.FF_TEMPORAL === 'true',
    ENABLE_AGENTIC_REASONING: process.env.FF_AGENTIC === 'true'
  };

  /**
   * Create RAG pipeline instance for tenant
   */
  static createPipeline(
    tenantId: string, 
    customFlags?: Partial<FeatureFlags>
  ): UnifiedRAGPipeline {
    const flags = { ...this.DEFAULT_FLAGS, ...customFlags };
    
    console.log(`🔧 [RAG Factory] Creating pipeline for tenant ${tenantId}`, {
      flags,
      timestamp: new Date().toISOString()
    });

    if (flags.USE_UNIFIED_PIPELINE) {
      return new UnifiedRAGPipeline(tenantId);
    }

    // Fallback to legacy implementation (if needed)
    console.warn(`⚠️ [RAG Factory] Using legacy RAG for tenant ${tenantId}`);
    return new UnifiedRAGPipeline(tenantId); // For now, always use unified
  }

  /**
   * Get current feature flags for tenant
   */
  static getFeatureFlags(tenantId?: string): FeatureFlags {
    // Future: Per-tenant feature flags from database
    // For now, use global flags
    return { ...this.DEFAULT_FLAGS };
  }

  /**
   * Check if tenant should use beta features
   */
  static isBetaTenant(tenantId: string): boolean {
    const BETA_TENANTS = (process.env.BETA_TENANTS || '').split(',');
    return BETA_TENANTS.includes(tenantId) || BETA_TENANTS.includes('*');
  }

  /**
   * Create pipeline with beta features enabled
   */
  static createBetaPipeline(tenantId: string): UnifiedRAGPipeline {
    const betaFlags: FeatureFlags = {
      USE_UNIFIED_PIPELINE: true,
      USE_RAG_ANYTHING: true,
      USE_VECTOR_ABSTRACTION: true,
      ENABLE_TEMPORAL_ENHANCEMENT: true,
      ENABLE_AGENTIC_REASONING: true
    };

    console.log(`🚀 [RAG Factory] Creating BETA pipeline for tenant ${tenantId}`);
    return this.createPipeline(tenantId, betaFlags);
  }

  /**
   * Migration helper - gradually move tenants to unified pipeline
   */
  static createMigrationPipeline(tenantId: string, migrationPhase: number): UnifiedRAGPipeline {
    const phaseFlags: Record<number, Partial<FeatureFlags>> = {
      1: { USE_UNIFIED_PIPELINE: true }, // Phase 1: Just unified entry point
      2: { USE_UNIFIED_PIPELINE: true, ENABLE_TEMPORAL_ENHANCEMENT: true }, // Phase 2: Add temporal
      3: { USE_UNIFIED_PIPELINE: true, ENABLE_TEMPORAL_ENHANCEMENT: true, ENABLE_AGENTIC_REASONING: true }, // Phase 3: Add agentic
      4: { USE_UNIFIED_PIPELINE: true, USE_RAG_ANYTHING: true, ENABLE_TEMPORAL_ENHANCEMENT: true, ENABLE_AGENTIC_REASONING: true } // Phase 4: Full features
    };

    const flags = phaseFlags[migrationPhase] || phaseFlags[1];
    
    console.log(`📈 [RAG Factory] Creating migration phase ${migrationPhase} pipeline for tenant ${tenantId}`);
    return this.createPipeline(tenantId, flags);
  }
}

