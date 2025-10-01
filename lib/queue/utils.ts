/**
 * Queue System Utilities
 * 
 * Reusable utility functions for the ingestion job queue.
 * Handles retry logic, status transitions, and error formatting.
 */

import type { IngestionJob, JobStatus } from './types';

// =====================================================
// RETRY LOGIC
// =====================================================

/**
 * Calculate next retry time using exponential backoff
 * Formula: min(base * 2^attempt, max_delay)
 */
export function calculateNextRetry(
  attempts: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 60000
): Date {
  const delayMs = Math.min(
    baseDelayMs * Math.pow(2, attempts),
    maxDelayMs
  );
  return new Date(Date.now() + delayMs);
}

/**
 * Check if a job should be retried based on attempts
 */
export function shouldRetry(job: IngestionJob): boolean {
  return job.attempts < job.max_attempts;
}

/**
 * Get the next status for a failed job (retry or permanently failed)
 */
export function getNextStatusAfterFailure(job: IngestionJob): JobStatus {
  return shouldRetry(job) ? 'pending' : 'failed';
}

// =====================================================
// JOB DURATION CALCULATIONS
// =====================================================

/**
 * Calculate processing duration in milliseconds
 */
export function getProcessingDuration(job: IngestionJob): number | null {
  if (!job.started_at) return null;
  
  const endTime = job.completed_at 
    ? new Date(job.completed_at) 
    : new Date();
  
  const startTime = new Date(job.started_at);
  return endTime.getTime() - startTime.getTime();
}

/**
 * Format duration as human-readable string
 */
export function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return 'N/A';
  
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Calculate queue wait time (created to started)
 */
export function getQueueWaitTime(job: IngestionJob): number | null {
  if (!job.started_at) return null;
  
  const startTime = new Date(job.started_at);
  const createTime = new Date(job.created_at);
  return startTime.getTime() - createTime.getTime();
}

// =====================================================
// ERROR HANDLING
// =====================================================

/**
 * Format error for storage in database
 */
export function formatJobError(error: unknown): {
  message: string;
  stack: string | null;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack || null
    };
  }
  
  return {
    message: String(error),
    stack: null
  };
}

/**
 * Truncate error message to fit database limits
 */
export function truncateErrorMessage(
  message: string,
  maxLength: number = 1000
): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength - 3) + '...';
}

// =====================================================
// STATUS CHECKS
// =====================================================

/**
 * Check if a job is in a terminal state (won't change)
 */
export function isTerminalStatus(status: JobStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

/**
 * Check if a job is actively being processed
 */
export function isActiveJob(job: IngestionJob): boolean {
  return job.status === 'processing' || job.status === 'pending';
}

/**
 * Check if a job is stale (processing too long)
 */
export function isStaleJob(
  job: IngestionJob,
  timeoutMinutes: number = 5
): boolean {
  if (job.status !== 'processing' || !job.started_at) return false;
  
  const startTime = new Date(job.started_at);
  const now = new Date();
  const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
  
  return elapsedMinutes > timeoutMinutes;
}

// =====================================================
// JOB FILTERING
// =====================================================

/**
 * Filter jobs by status
 */
export function filterByStatus(
  jobs: IngestionJob[],
  status: JobStatus
): IngestionJob[] {
  return jobs.filter(job => job.status === status);
}

/**
 * Get jobs ready for retry
 */
export function getJobsReadyForRetry(jobs: IngestionJob[]): IngestionJob[] {
  const now = new Date();
  return jobs.filter(job => 
    job.status === 'pending' &&
    (!job.next_retry_at || new Date(job.next_retry_at) <= now)
  );
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate file type is allowed
 */
export function isAllowedFileType(
  fileType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(fileType);
}

/**
 * Validate file size is within limits
 */
export function isValidFileSize(
  fileSize: number,
  maxSize: number
): boolean {
  return fileSize > 0 && fileSize <= maxSize;
}

/**
 * Format file size as human-readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// =====================================================
// METADATA HELPERS
// =====================================================

/**
 * Safely get metadata value
 */
export function getMetadata<T = any>(
  job: IngestionJob,
  key: string,
  defaultValue?: T
): T | undefined {
  return job.processing_metadata?.[key] ?? defaultValue;
}

/**
 * Create metadata update
 */
export function createMetadataUpdate(
  existingMetadata: Record<string, any>,
  updates: Record<string, any>
): Record<string, any> {
  return {
    ...existingMetadata,
    ...updates,
    updated_at: new Date().toISOString()
  };
}

