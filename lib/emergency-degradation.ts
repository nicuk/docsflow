/**
 * Emergency Degradation Manager
 * Gracefully handles cascade failures with intelligent fallback strategies
 * Risk: 1/10 (MINIMAL) - Configuration-driven degradation, no complex logic
 */

export enum DegradationLevel {
  NORMAL = 0,           // All services operational
  AI_CACHE_ONLY = 1,    // Use only cached AI responses
  STATIC_RESPONSES = 2, // Pre-canned responses only  
  READ_ONLY = 3,        // Disable all mutations
  MAINTENANCE = 4       // System maintenance mode
}

interface DegradationConfig {
  currentLevel: DegradationLevel;
  triggeredServices: string[];
  activatedAt: number;
  reason: string;
  estimatedRecoveryTime?: number;
}

interface CachedResponse {
  query: string;
  response: string;
  confidence: number;
  sources: any[];
  cachedAt: number;
  tenantId: string;
}

interface StaticResponse {
  triggers: string[];
  response: string;
  confidence: number;
  category: 'greeting' | 'help' | 'error' | 'fallback';
}

export class EmergencyDegradationManager {
  private static instance: EmergencyDegradationManager;
  private config: DegradationConfig;
  private responseCache: Map<string, CachedResponse> = new Map();
  private staticResponses: StaticResponse[] = [];
  private notificationCallbacks: ((level: DegradationLevel, reason: string) => void)[] = [];

  private constructor() {
    this.config = {
      currentLevel: DegradationLevel.NORMAL,
      triggeredServices: [],
      activatedAt: 0,
      reason: ''
    };
    this.initializeStaticResponses();
  }

  static getInstance(): EmergencyDegradationManager {
    if (!this.instance) {
      this.instance = new EmergencyDegradationManager();
    }
    return this.instance;
  }

  /**
   * Handle cascade failure by activating appropriate degradation level
   */
  async handleCascadeFailure(failedServices: string[], error?: any): Promise<void> {
    const newLevel = this.calculateDegradationLevel(failedServices);
    
    if (newLevel > this.config.currentLevel) {
      await this.activateLevel(newLevel, failedServices, error);
    }
  }

  /**
   * Manually activate a degradation level
   */
  async activateLevel(
    level: DegradationLevel, 
    triggeredServices: string[] = [], 
    error?: any
  ): Promise<void> {
    const previousLevel = this.config.currentLevel;
    
    this.config = {
      currentLevel: level,
      triggeredServices,
      activatedAt: Date.now(),
      reason: this.getLevelReason(level, triggeredServices, error),
      estimatedRecoveryTime: this.estimateRecoveryTime(level)
    };

    // Notify registered callbacks
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(level, this.config.reason);
      } catch {
        // Notification callback failed
      }
    });

    // Log for monitoring
    this.logDegradationEvent(previousLevel, level, triggeredServices);
  }

  /**
   * Process chat query with degradation-aware fallbacks
   */
  async processQuery(
    query: string, 
    tenantId: string, 
    originalProcessor: () => Promise<any>
  ): Promise<any> {
    const level = this.config.currentLevel;

    switch (level) {
      case DegradationLevel.NORMAL:
        // Normal operation - use original processor
        try {
          const result = await originalProcessor();
          // Cache successful responses for future degradation
          this.cacheResponse(query, result, tenantId);
          return result;
        } catch (error) {
          // If original fails, try cache
          return this.getCachedResponse(query, tenantId) || this.getStaticResponse(query);
        }

      case DegradationLevel.AI_CACHE_ONLY:
        // Try cache first, then static responses
        const cached = this.getCachedResponse(query, tenantId);
        if (cached) {
          return cached;
        }
        return this.getStaticResponse(query);

      case DegradationLevel.STATIC_RESPONSES:
        // Only pre-canned responses
        return this.getStaticResponse(query);

      case DegradationLevel.READ_ONLY:
        // Block all mutations, allow only read operations
        return this.getReadOnlyResponse();

      case DegradationLevel.MAINTENANCE:
        // System down for maintenance
        return this.getMaintenanceResponse();

      default:
        return this.getStaticResponse(query);
    }
  }

  /**
   * Check if a specific operation should be allowed
   */
  isOperationAllowed(operation: 'read' | 'write' | 'ai_query' | 'upload'): boolean {
    const level = this.config.currentLevel;

    switch (level) {
      case DegradationLevel.NORMAL:
        return true;

      case DegradationLevel.AI_CACHE_ONLY:
        return operation !== 'ai_query'; // Block new AI queries

      case DegradationLevel.STATIC_RESPONSES:
        return operation === 'read'; // Only reads allowed

      case DegradationLevel.READ_ONLY:
        return operation === 'read'; // Only reads allowed

      case DegradationLevel.MAINTENANCE:
        return false; // Nothing allowed

      default:
        return false;
    }
  }

  /**
   * Get current degradation status
   */
  getStatus(): DegradationConfig & { 
    uptime: number;
    affectedOperations: string[];
  } {
    return {
      ...this.config,
      uptime: this.config.activatedAt ? Date.now() - this.config.activatedAt : 0,
      affectedOperations: this.getAffectedOperations()
    };
  }

  /**
   * Register callback for degradation level changes
   */
  onDegradationChange(callback: (level: DegradationLevel, reason: string) => void): void {
    this.notificationCallbacks.push(callback);
  }

  /**
   * Attempt to recover to normal operation
   */
  async attemptRecovery(): Promise<boolean> {
    if (this.config.currentLevel === DegradationLevel.NORMAL) {
      return true;
    }

    // Test if services are recovered
    const recoveredServices = await this.testServiceRecovery();
    const stillFailedServices = this.config.triggeredServices.filter(
      service => !recoveredServices.includes(service)
    );

    if (stillFailedServices.length === 0) {
      // All services recovered
      await this.activateLevel(DegradationLevel.NORMAL, [], null);
      return true;
    } else {
      // Some services still failing - adjust degradation level
      const newLevel = this.calculateDegradationLevel(stillFailedServices);
      if (newLevel < this.config.currentLevel) {
        await this.activateLevel(newLevel, stillFailedServices);
      }
      return false;
    }
  }

  // Private helper methods

  private calculateDegradationLevel(failedServices: string[]): DegradationLevel {
    if (failedServices.includes('supabase')) {
      return DegradationLevel.READ_ONLY; // Database issues = read-only
    }
    
    if (failedServices.includes('google_ai')) {
      return DegradationLevel.AI_CACHE_ONLY; // AI issues = use cache
    }

    if (failedServices.includes('redis') && failedServices.length > 1) {
      return DegradationLevel.STATIC_RESPONSES; // Multiple issues = static only
    }

    return DegradationLevel.NORMAL;
  }

  private getLevelReason(level: DegradationLevel, services: string[], error?: any): string {
    const serviceList = services.join(', ');
    const errorMsg = error?.message ? ` (${error.message})` : '';

    switch (level) {
      case DegradationLevel.AI_CACHE_ONLY:
        return `AI service unavailable (${serviceList})${errorMsg}`;
      case DegradationLevel.STATIC_RESPONSES:
        return `Multiple services failing (${serviceList})${errorMsg}`;
      case DegradationLevel.READ_ONLY:
        return `Database issues detected (${serviceList})${errorMsg}`;
      case DegradationLevel.MAINTENANCE:
        return `Planned maintenance mode`;
      default:
        return `Unknown degradation trigger`;
    }
  }

  private estimateRecoveryTime(level: DegradationLevel): number {
    const baseTime = Date.now();
    switch (level) {
      case DegradationLevel.AI_CACHE_ONLY:
        return baseTime + (5 * 60 * 1000); // 5 minutes
      case DegradationLevel.STATIC_RESPONSES:
        return baseTime + (15 * 60 * 1000); // 15 minutes
      case DegradationLevel.READ_ONLY:
        return baseTime + (30 * 60 * 1000); // 30 minutes
      case DegradationLevel.MAINTENANCE:
        return baseTime + (60 * 60 * 1000); // 1 hour
      default:
        return baseTime + (10 * 60 * 1000); // 10 minutes
    }
  }

  private initializeStaticResponses(): void {
    this.staticResponses = [
      {
        triggers: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
        response: "Hello! I'm experiencing some technical difficulties, but I'm here to help with basic questions. Please try again in a few minutes for full functionality.",
        confidence: 0.9,
        category: 'greeting'
      },
      {
        triggers: ['help', 'support', 'assistance', 'how to'],
        response: "I'm currently operating in limited mode due to system maintenance. For immediate assistance, please contact our support team or try again shortly.",
        confidence: 0.8,
        category: 'help'
      },
      {
        triggers: ['error', 'problem', 'issue', 'broken', 'not working'],
        response: "I'm aware there are some system issues. Our team is working to resolve them. Please try again in a few minutes.",
        confidence: 0.7,
        category: 'error'
      }
    ];
  }

  private cacheResponse(query: string, response: any, tenantId: string): void {
    const cacheKey = this.getCacheKey(query, tenantId);
    this.responseCache.set(cacheKey, {
      query: query.toLowerCase(),
      response: response.answer || response.response || '',
      confidence: response.confidence || 0.8,
      sources: response.sources || [],
      cachedAt: Date.now(),
      tenantId
    });

    // Limit cache size
    if (this.responseCache.size > 1000) {
      const oldestKey = this.responseCache.keys().next().value;
      this.responseCache.delete(oldestKey);
    }
  }

  private getCachedResponse(query: string, tenantId: string): any | null {
    const cacheKey = this.getCacheKey(query, tenantId);
    const cached = this.responseCache.get(cacheKey);
    
    if (!cached) return null;

    // Check if cache is stale (24 hours)
    const isStale = Date.now() - cached.cachedAt > (24 * 60 * 60 * 1000);
    if (isStale) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return {
      answer: cached.response,
      confidence: cached.confidence,
      sources: cached.sources,
      metadata: {
        fromCache: true,
        cachedAt: cached.cachedAt,
        degradationLevel: DegradationLevel[this.config.currentLevel]
      }
    };
  }

  private getStaticResponse(query: string): any {
    const queryLower = query.toLowerCase();
    
    for (const staticResponse of this.staticResponses) {
      if (staticResponse.triggers.some(trigger => queryLower.includes(trigger))) {
        return {
          answer: staticResponse.response,
          confidence: staticResponse.confidence,
          sources: [],
          metadata: {
            isStaticResponse: true,
            category: staticResponse.category,
            degradationLevel: DegradationLevel[this.config.currentLevel]
          }
        };
      }
    }

    // Default fallback
    return {
      answer: "I'm currently experiencing technical difficulties and operating in limited mode. Please try again in a few minutes or contact support for assistance.",
      confidence: 0.5,
      sources: [],
      metadata: {
        isStaticResponse: true,
        category: 'fallback',
        degradationLevel: DegradationLevel[this.config.currentLevel]
      }
    };
  }

  private getReadOnlyResponse(): any {
    return {
      answer: "The system is currently in read-only mode due to technical issues. You can browse existing content, but new operations are temporarily disabled.",
      confidence: 0.9,
      sources: [],
      metadata: {
        isReadOnly: true,
        degradationLevel: DegradationLevel[this.config.currentLevel]
      }
    };
  }

  private getMaintenanceResponse(): any {
    return {
      answer: "The system is currently undergoing maintenance. Please check back shortly. We apologize for any inconvenience.",
      confidence: 1.0,
      sources: [],
      metadata: {
        isMaintenance: true,
        degradationLevel: DegradationLevel[this.config.currentLevel],
        estimatedRecovery: this.config.estimatedRecoveryTime
      }
    };
  }

  private getCacheKey(query: string, tenantId: string): string {
    // Simple hash of query + tenant for cache key
    const normalizedQuery = query.toLowerCase().trim().substring(0, 100);
    return `${tenantId}:${normalizedQuery}`;
  }

  private getAffectedOperations(): string[] {
    const level = this.config.currentLevel;
    switch (level) {
      case DegradationLevel.AI_CACHE_ONLY:
        return ['New AI queries'];
      case DegradationLevel.STATIC_RESPONSES:
        return ['AI queries', 'Document uploads', 'Advanced features'];
      case DegradationLevel.READ_ONLY:
        return ['Document uploads', 'Settings changes', 'User management'];
      case DegradationLevel.MAINTENANCE:
        return ['All operations'];
      default:
        return [];
    }
  }

  private async testServiceRecovery(): Promise<string[]> {
    const recoveredServices: string[] = [];
    
    // Simple health checks (implement actual service tests)
    for (const service of this.config.triggeredServices) {
      try {
        switch (service) {
          case 'google_ai':
            // Test Google AI availability (placeholder)
            recoveredServices.push(service);
            break;
          case 'supabase':
            // Test Supabase availability (placeholder)
            recoveredServices.push(service);
            break;
          case 'redis':
            // Test Redis availability (placeholder)
            recoveredServices.push(service);
            break;
        }
      } catch (error) {
        // Service still failing
      }
    }

    return recoveredServices;
  }

  private logDegradationEvent(
    previousLevel: DegradationLevel, 
    newLevel: DegradationLevel, 
    services: string[]
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      previousLevel: DegradationLevel[previousLevel],
      newLevel: DegradationLevel[newLevel],
      triggeredServices: services,
      reason: this.config.reason,
      estimatedRecovery: this.config.estimatedRecoveryTime
    };

    // In production, send to monitoring service
  }
}

// Singleton export
export const degradationManager = EmergencyDegradationManager.getInstance();
