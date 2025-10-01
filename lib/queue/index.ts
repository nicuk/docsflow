/**
 * Queue System - Public API
 * 
 * Central export point for the ingestion job queue system.
 * Use: import { JOB_STATUS, calculateNextRetry } from '@/lib/queue'
 */

// Types
export * from './types';

// Utilities
export * from './utils';

// Re-export commonly used items for convenience
export { JOB_STATUS, DEFAULT_WORKER_CONFIG, DEFAULT_UPLOAD_CONFIG } from './types';
export { 
  calculateNextRetry, 
  shouldRetry, 
  formatDuration,
  formatJobError,
  isTerminalStatus,
  formatFileSize
} from './utils';

