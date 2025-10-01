/**
 * Queue System Types
 * 
 * Type definitions for the ingestion job queue system.
 * Provides type safety across API routes, worker, and client code.
 */

// =====================================================
// JOB STATUSES
// =====================================================

export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];

// =====================================================
// DATABASE SCHEMA TYPES
// =====================================================

export interface IngestionJob {
  id: string;
  tenant_id: string;
  document_id: string | null;
  
  // Job data
  filename: string;
  file_size: number | null;
  file_path: string;
  file_type: string | null;
  
  // Status
  status: JobStatus;
  
  // Retry logic
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  
  // Timing
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  
  // Error handling
  error_message: string | null;
  error_stack: string | null;
  
  // Metadata
  processing_metadata: Record<string, any>;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateJobRequest {
  filename: string;
  file_size: number;
  file_path: string;
  file_type: string;
}

export interface CreateJobResponse {
  job_id: string;
  status: JobStatus;
}

export interface PresignedUploadRequest {
  filename: string;
  file_type: string;
  file_size: number;
}

export interface PresignedUploadResponse {
  upload_url: string;
  file_path: string;
  token: string;
}

export interface WorkerProcessResult {
  processed: number;
  jobs: string[];
}

export interface RetryJobRequest {
  job_id: string;
}

// =====================================================
// JOB STATISTICS
// =====================================================

export interface JobStats {
  total_jobs: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

// =====================================================
// WORKER CONFIGURATION
// =====================================================

export interface WorkerConfig {
  global_max_concurrent: number;
  per_tenant_max_concurrent: number;
  stale_job_timeout_minutes: number;
  max_retry_attempts: number;
}

export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  global_max_concurrent: 10,
  per_tenant_max_concurrent: 2,
  stale_job_timeout_minutes: 5,
  max_retry_attempts: 3
};

// =====================================================
// CLIENT UPLOAD CONFIGURATION
// =====================================================

export interface UploadConfig {
  max_concurrent_uploads: number;
  max_file_size: number;
  allowed_file_types: string[];
}

export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  max_concurrent_uploads: 4,
  max_file_size: 50 * 1024 * 1024, // 50MB
  allowed_file_types: [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
};

// =====================================================
// UPLOAD PROGRESS TRACKING
// =====================================================

export interface UploadProgress {
  file_name: string;
  status: 'uploading' | 'queued' | 'error';
  progress: number; // 0-100
  error?: string;
  job_id?: string;
}

